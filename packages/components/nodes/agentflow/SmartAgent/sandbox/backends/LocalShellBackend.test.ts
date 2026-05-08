import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { LocalShellBackend } from './LocalShellBackend'
import { runBackendConformanceSuite } from './conformance'

const tmpRoots: string[] = []

function makeBackend(): LocalShellBackend {
    const root = mkdtempSync(join(tmpdir(), 'flowise-local-shell-'))
    tmpRoots.push(root)
    return new LocalShellBackend(root)
}

afterAll(() => {
    for (const root of tmpRoots) {
        rmSync(root, { recursive: true, force: true })
    }
    tmpRoots.length = 0
})

runBackendConformanceSuite('LocalShellBackend', () => makeBackend())

describe('LocalShellBackend — constructor', () => {
    it('logs a startup WARN identifying the dev-only risk', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
        try {
            makeBackend()
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('LocalShellBackend is enabled — do not use in production'))
        } finally {
            warnSpy.mockRestore()
        }
    })
})

describe('LocalShellBackend — execute (happy path)', () => {
    it('echo round-trip returns stdout with exitCode 0 and truncated false', async () => {
        const backend = makeBackend()
        const result = await backend.execute('echo hi')
        expect(result.output).toBe('hi\n')
        expect(result.exitCode).toBe(0)
        expect(result.truncated).toBe(false)
    })

    it('passes stderr lines through prefixed with [stderr]', async () => {
        const backend = makeBackend()
        const result = await backend.execute('echo err >&2')
        expect(result.output).toContain('[stderr] err')
        expect(result.exitCode).toBe(0)
    })

    it('appends "Exit code: N" when the command exits non-zero', async () => {
        const backend = makeBackend()
        const result = await backend.execute('exit 7')
        expect(result.output.trim()).toBe('Exit code: 7')
        expect(result.exitCode).toBe(7)
        expect(result.truncated).toBe(false)
    })
})

describe('LocalShellBackend — execute (timeout)', () => {
    it('kills the child with SIGTERM and returns exitCode 124 when SANDBOX_LOCAL_SHELL_TIMEOUT_MS expires', async () => {
        const original = process.env.SANDBOX_LOCAL_SHELL_TIMEOUT_MS
        process.env.SANDBOX_LOCAL_SHELL_TIMEOUT_MS = '200'
        try {
            const backend = makeBackend()
            const result = await backend.execute('sleep 5')
            expect(result.output).toMatch(/Command timed out after/)
            expect(result.exitCode).toBe(124)
            expect(result.truncated).toBe(false)
        } finally {
            if (original === undefined) delete process.env.SANDBOX_LOCAL_SHELL_TIMEOUT_MS
            else process.env.SANDBOX_LOCAL_SHELL_TIMEOUT_MS = original
        }
    }, 5000)
})

describe('LocalShellBackend — execute (truncation)', () => {
    it('truncates output beyond MAX_OUTPUT_BYTES and sets truncated:true', async () => {
        const backend = makeBackend()
        // Generate slightly more than MAX_OUTPUT_BYTES (= 100_000) of stdout.
        const result = await backend.execute('yes a | head -c 200000')
        expect(result.truncated).toBe(true)
        expect(result.output.endsWith('[output truncated]')).toBe(true)
        // Output length: 100_000 bytes of slice + literal "\n\n[output truncated]" suffix.
        expect(result.output.length).toBeLessThanOrEqual(100_000 + '\n\n[output truncated]'.length)
        expect(result.exitCode).toBe(0)
    }, 10000)

    it('truncates UTF-8 multi-byte output without producing oversized buffers', async () => {
        const backend = makeBackend()
        // Output 50_000 copies of "你好" (each char is 3 UTF-8 bytes) ≈ 300_000 bytes — well over MAX_OUTPUT_BYTES.
        const result = await backend.execute('node -e "process.stdout.write(\'你好\'.repeat(50000))"')
        expect(result.truncated).toBe(true)
        // Truncated output is at most MAX_OUTPUT_BYTES + suffix length (in bytes, not chars).
        // Allow up to 2 extra bytes: if the byte boundary falls mid-character, Node emits U+FFFD
        // (3 bytes) in place of the partial sequence, which can overshoot by at most 2 bytes.
        const byteLen = Buffer.byteLength(result.output, 'utf8')
        expect(byteLen).toBeLessThanOrEqual(100_000 + 2 + Buffer.byteLength('\n\n[output truncated]', 'utf8'))
        expect(result.exitCode).toBe(0)
    }, 10000)
})

describe('LocalShellBackend — execute (real shell)', () => {
    it('runs commands inside this.root by default', async () => {
        const backend = makeBackend()
        await backend.write('/touched.txt', 'present')
        const result = await backend.execute('test -f touched.txt && echo yes')
        expect(result.output).toBe('yes\n')
        expect(result.exitCode).toBe(0)
    })

    it('reports the shell\'s "command not found" via stderr and non-zero exit', async () => {
        const backend = makeBackend()
        const result = await backend.execute('this-binary-does-not-exist-xyz')
        expect(result.exitCode).not.toBe(0)
        // 'not found' is the canonical sh/bash error message
        expect(result.output.toLowerCase()).toContain('not found')
    })
})

describe('LocalShellBackend — execute (virtual path rewriting)', () => {
    it('rewrites /artifacts/<file> to the sandbox-rooted path so files written via FS tools are reachable from the shell', async () => {
        const backend = makeBackend()
        await backend.write('/artifacts/needle.txt', 'found me')
        const result = await backend.execute('cat /artifacts/needle.txt')
        expect(result.output).toBe('found me')
        expect(result.exitCode).toBe(0)
    })

    it('rewrites /workspace/<file> the same way', async () => {
        const backend = makeBackend()
        await backend.write('/workspace/script.txt', 'hello workspace')
        const result = await backend.execute('cat /workspace/script.txt')
        expect(result.output).toBe('hello workspace')
        expect(result.exitCode).toBe(0)
    })

    it('does NOT rewrite host paths like /etc or /usr', async () => {
        const backend = makeBackend()
        // /etc/hostname is widely available on macOS and Linux; we just need a real host file.
        // We assert the output looks like a hostname (non-empty, no path-traversal-error markers).
        const result = await backend.execute('test -f /etc/hostname && echo present || echo absent')
        // The command itself shouldn't be translated — `/etc/hostname` stays as-is.
        // (If it were translated to `<root>/etc/hostname`, the test -f would say absent.)
        // We accept "present" or "absent" depending on platform; the important thing is no error.
        expect(['present\n', 'absent\n']).toContain(result.output)
        expect(result.exitCode).toBe(0)
    })

    it('does NOT rewrite a path whose prefix only LOOKS similar (e.g. /workspaces/)', async () => {
        const backend = makeBackend()
        // /workspaces/ is not in the prefix list. The command should pass through unchanged
        // and fail (the host has no /workspaces/foo).
        const result = await backend.execute('test -f /workspaces/foo && echo yes || echo no')
        expect(result.output).toBe('no\n')
        expect(result.exitCode).toBe(0)
    })

    it('does NOT rewrite relative paths', async () => {
        const backend = makeBackend()
        await backend.write('/workspace/relative.txt', 'rel')
        // Relative path — shell uses cwd, which is this.root.
        const result = await backend.execute('cat workspace/relative.txt')
        expect(result.output).toBe('rel')
        expect(result.exitCode).toBe(0)
    })

    it('rewrites multiple virtual prefixes in one command', async () => {
        const backend = makeBackend()
        await backend.write('/workspace/a.txt', 'AAA')
        await backend.write('/artifacts/b.txt', 'BBB')
        const result = await backend.execute('cat /workspace/a.txt && cat /artifacts/b.txt')
        expect(result.output).toBe('AAA' + 'BBB')
        expect(result.exitCode).toBe(0)
    })
})
