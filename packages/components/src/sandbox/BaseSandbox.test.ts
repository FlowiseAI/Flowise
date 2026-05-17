/**
 * BaseSandbox tests — exercise the protocol's default implementations
 * against a deterministic fake backend that captures every `execute`
 * call so we can assert on the exact POSIX commands produced.
 */

import { BaseSandbox, quote } from './BaseSandbox'
import { ExecuteResponse, FileDownloadResponse, FileUploadResponse } from './types'

// ---------------------------------------------------------------------------
// Fake concrete subclass
// ---------------------------------------------------------------------------

class FakeSandbox extends BaseSandbox {
    readonly id = 'fake-sandbox-1'
    executeResults: Array<{ output: string; exitCode?: number | null; truncated?: boolean } | Error> = []
    executeCalls: string[] = []
    uploads: Array<[string, Uint8Array]> = []
    downloadsByPath: Map<string, FileDownloadResponse> = new Map()

    async execute(command: string): Promise<ExecuteResponse> {
        this.executeCalls.push(command)
        const next = this.executeResults.shift()
        if (!next) return { output: '', exitCode: 0, truncated: false }
        if (next instanceof Error) throw next
        return { output: next.output, exitCode: next.exitCode ?? 0, truncated: next.truncated ?? false }
    }

    async uploadFiles(files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]> {
        this.uploads.push(...files)
        return files.map(([p]) => ({ path: p, error: null }))
    }

    async downloadFiles(paths: string[]): Promise<FileDownloadResponse[]> {
        return paths.map((p) => this.downloadsByPath.get(p) ?? { path: p, content: null, error: 'file_not_found' })
    }
}

// ---------------------------------------------------------------------------
// quote()
// ---------------------------------------------------------------------------

describe('quote — POSIX single-quote escaping', () => {
    it('wraps simple strings in single quotes', () => {
        expect(quote('foo')).toBe("'foo'")
    })

    it('escapes embedded single quotes via the POSIX dance', () => {
        expect(quote("don't")).toBe(`'don'\\''t'`)
    })

    it('preserves spaces and special chars inside the quoted block', () => {
        expect(quote('a b $c & d')).toBe("'a b $c & d'")
    })
})

// ---------------------------------------------------------------------------
// ls — host probe + parser
// ---------------------------------------------------------------------------

describe('BaseSandbox.ls', () => {
    it('emits a single execute call that probes for GNU/busybox/BSD stat', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({ output: '__NOT_FOUND__\n__SANDBOX_PROBE_OK__\n' })
        await sbx.ls('/no/where')
        expect(sbx.executeCalls).toHaveLength(1)
        const cmd = sbx.executeCalls[0]
        expect(cmd).toContain('find . -maxdepth 0 -printf')
        expect(cmd).toContain('stat -c "%s"')
        expect(cmd).toContain('stat -f "%z"')
    })

    it('parses GNU-style printf output into LsEntry objects', async () => {
        const sbx = new FakeSandbox()
        const FS = '\u0001'
        sbx.executeResults.push({
            output: `f${FS}1234${FS}1700000000${FS}README.md\n` + `d${FS}0${FS}1700000001${FS}subdir\n` + `__SANDBOX_PROBE_OK__\n`
        })
        const r = await sbx.ls('/home/user/skills')
        expect(r.error).toBeUndefined()
        expect(r.entries).toEqual([
            { name: 'README.md', path: '/home/user/skills/README.md', type: 'file', size: 1234, mtime: 1700000000 },
            { name: 'subdir', path: '/home/user/skills/subdir', type: 'dir', size: 0, mtime: 1700000001 }
        ])
    })

    it('returns file_not_found when the path is missing', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({ output: '__NOT_FOUND__\n__SANDBOX_PROBE_OK__' })
        const r = await sbx.ls('/no/where')
        expect(r.entries).toEqual([])
        expect(r.error).toBe('file_not_found')
    })

    it('returns is_not_a_directory when the path is a file', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({ output: '__NOT_DIR__\n__SANDBOX_PROBE_OK__' })
        const r = await sbx.ls('/home/user/skills/foo.txt')
        expect(r.error).toBe('is_not_a_directory')
    })
})

// ---------------------------------------------------------------------------
// read — slicing via awk
// ---------------------------------------------------------------------------

describe('BaseSandbox.read', () => {
    it('slices large files at the source using awk NR>=s && NR<=e', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({ output: 'line5\nline6\n__SANDBOX_PROBE_OK__\n42' })
        const r = await sbx.read('/home/user/skills/big.txt', 5, 2)
        expect(sbx.executeCalls[0]).toContain('awk -v s=5 -v e=6 ')
        expect(r.content).toBe('line5\nline6')
        expect(r.offset).toBe(5)
        expect(r.limit).toBe(2)
        expect(r.totalLines).toBe(42)
    })

    it('reads the whole file via cat when no offset/limit are passed', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({ output: 'hello\n__SANDBOX_PROBE_OK__\n1' })
        const r = await sbx.read('/p')
        expect(sbx.executeCalls[0]).toContain('cat ')
        expect(r.content).toBe('hello')
        expect(r.totalLines).toBe(1)
    })

    it('classifies the missing-file probe', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({ output: '__NOT_FOUND__\n__SANDBOX_PROBE_OK__' })
        const r = await sbx.read('/x')
        expect(r.error).toBe('file_not_found')
    })

    it('classifies the is-a-directory probe', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({ output: '__IS_DIR__\n__SANDBOX_PROBE_OK__' })
        const r = await sbx.read('/x')
        expect(r.error).toBe('is_directory')
    })
})

// ---------------------------------------------------------------------------
// readRaw / write / edit — file-transfer round trip
// ---------------------------------------------------------------------------

describe('BaseSandbox.readRaw + write + edit', () => {
    it('readRaw goes through downloadFiles', async () => {
        const sbx = new FakeSandbox()
        sbx.downloadsByPath.set('/x', { path: '/x', content: new Uint8Array(Buffer.from('binary')), error: null })
        const r = await sbx.readRaw('/x')
        expect(r.content && Buffer.from(r.content).toString('utf8')).toBe('binary')
    })

    it('write uploads bytes and reports overwrote=false for new files', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({ output: 'N' }) // existence probe
        const r = await sbx.write('/p', 'hello')
        expect(r.overwrote).toBe(false)
        expect(r.bytesWritten).toBe(5)
        expect(sbx.uploads).toHaveLength(1)
        expect(Buffer.from(sbx.uploads[0][1]).toString('utf8')).toBe('hello')
    })

    it('edit replaces a unique substring exactly once by default', async () => {
        const sbx = new FakeSandbox()
        sbx.downloadsByPath.set('/p', { path: '/p', content: new Uint8Array(Buffer.from('alpha beta gamma')), error: null })
        const r = await sbx.edit('/p', 'beta', 'BETA')
        expect(r.replacements).toBe(1)
        expect(Buffer.from(sbx.uploads[0][1]).toString('utf8')).toBe('alpha BETA gamma')
    })

    it('edit with replaceAll=true counts every occurrence', async () => {
        const sbx = new FakeSandbox()
        sbx.downloadsByPath.set('/p', { path: '/p', content: new Uint8Array(Buffer.from('a a a')), error: null })
        const r = await sbx.edit('/p', 'a', 'b', true)
        expect(r.replacements).toBe(3)
        expect(Buffer.from(sbx.uploads[0][1]).toString('utf8')).toBe('b b b')
    })

    it('edit returns old_string_not_found when the needle is missing', async () => {
        const sbx = new FakeSandbox()
        sbx.downloadsByPath.set('/p', { path: '/p', content: new Uint8Array(Buffer.from('hello')), error: null })
        const r = await sbx.edit('/p', 'world', 'WORLD')
        expect(r.replacements).toBe(0)
        expect(r.error).toBe('old_string_not_found')
    })
})

// ---------------------------------------------------------------------------
// glob — find + in-process glob match
// ---------------------------------------------------------------------------

describe('BaseSandbox.glob', () => {
    it('matches against full path or basename via the in-process regex', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({
            output: ['/r/a.json', '/r/sub/b.json', '/r/sub/c.yaml', '__SANDBOX_PROBE_OK__'].join('\n')
        })
        const r = await sbx.glob('*.json', '/r')
        expect(r.matches.sort()).toEqual(['/r/a.json', '/r/sub/b.json'])
    })

    it('returns is_not_a_directory when root is missing', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({ output: '__NOT_DIR__\n__SANDBOX_PROBE_OK__' })
        const r = await sbx.glob('*', '/missing')
        expect(r.error).toBe('is_not_a_directory')
    })

    it('** matches across path segments', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({
            output: ['/r/a.json', '/r/sub/b.json', '/r/deep/very/c.json', '__SANDBOX_PROBE_OK__'].join('\n')
        })
        const r = await sbx.glob('**/*.json', '/r')
        expect(r.matches).toEqual(['/r/a.json', '/r/sub/b.json', '/r/deep/very/c.json'])
    })
})

// ---------------------------------------------------------------------------
// grep
// ---------------------------------------------------------------------------

describe('BaseSandbox.grep', () => {
    it('parses path:line:text hits', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({
            output: ['/r/a.py:12: import os', '/r/a.py:42: print("hi")', '__SANDBOX_PROBE_OK__'].join('\n')
        })
        const r = await sbx.grep('^import', '/r')
        expect(r.hits).toEqual([
            { path: '/r/a.py', line: 12, text: ' import os' },
            { path: '/r/a.py', line: 42, text: ' print("hi")' }
        ])
    })

    it('returns file_not_found when the path is missing', async () => {
        const sbx = new FakeSandbox()
        sbx.executeResults.push({ output: '__NOT_FOUND__\n__SANDBOX_PROBE_OK__' })
        const r = await sbx.grep('x', '/missing')
        expect(r.error).toBe('file_not_found')
    })
})
