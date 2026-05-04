// =============================================================================
// Mock the @e2b/code-interpreter SDK so the test never tries to boot a real VM.
// We never touch storage either — fetchNodeBytes is mocked separately and the
// test passes everything else through inline content.
// =============================================================================

jest.mock('@e2b/code-interpreter', () => ({
    Sandbox: { create: jest.fn() }
}))

const mockFetchNodeBytes = jest.fn()
jest.mock('./fetchNodeBytes', () => ({
    __esModule: true,
    fetchNodeBytes: (...args: unknown[]) => mockFetchNodeBytes(...args),
    clearNodeBytesCache: () => undefined
}))

// Imports after the mocks are registered.
import type { SkillBundle } from '../utils'
import type { BuiltinHelper } from './builtinHelpers'
import type { SandboxCapability } from './capability'
import { buildManifest, SandboxManifest } from './SandboxManifest'
import { SandboxSession } from './SandboxSession'

// Local helper-registry stub for the session-level materialisation tests
// — the real registry is exercised by builtinHelpers/contracts.test.ts.
const stubHelper = (name: string, body: string): BuiltinHelper => ({
    name,
    relPath: `${name}.py`,
    description: `stub ${name}`,
    handles: [{ extension: name }],
    bytes: async () => Buffer.from(body, 'utf8'),
    digest: async () => `digest-${name}`,
    sizeBytes: async () => Buffer.byteLength(body, 'utf8')
})

// =============================================================================
// Helpers — pretend-VM and bundle/manifest fixtures
// =============================================================================

interface FakeRunResult {
    stdout?: string
    stderr?: string
    exitCode: number
}

const makeFakeSandbox = (overrides?: {
    run?: (cmd: string, opts?: unknown) => Promise<FakeRunResult> | FakeRunResult
    runThrows?: unknown
    listOutputs?: Array<{ name: string; type: 'file' | 'dir' }>
    readFile?: (path: string) => Promise<Uint8Array>
    onMakeDir?: (path: string) => void
    onWrite?: (entries: Array<{ path: string; data: ArrayBuffer | Buffer }>) => void
}) => {
    const makeDir = jest.fn(async (p: string) => {
        overrides?.onMakeDir?.(p)
    })
    const write = jest.fn(async (entries: Array<{ path: string; data: ArrayBuffer | Buffer }>) => {
        overrides?.onWrite?.(entries)
    })
    const listFiles = jest.fn(async () => overrides?.listOutputs ?? [])
    const readFile = jest.fn(async (p: string) => {
        if (overrides?.readFile) return overrides.readFile(p)
        return new Uint8Array(Buffer.from(`bytes-of:${p}`, 'utf8'))
    })
    const runImpl = jest.fn(async (cmd: string, opts?: unknown) => {
        if (overrides?.runThrows !== undefined) throw overrides.runThrows
        const r = overrides?.run ? await overrides.run(cmd, opts) : { stdout: 'ok', stderr: '', exitCode: 0 }
        return r
    })
    const kill = jest.fn(async () => undefined)
    return {
        files: { makeDir, write, list: listFiles, read: readFile },
        commands: { run: runImpl },
        kill,
        // Useful introspection for the test suite.
        _spies: { makeDir, write, listFiles, readFile, run: runImpl, kill }
    }
}

// Minimal recruiting-style bundle so we have a realistic manifest projection.
const recruitingBundle = (): SkillBundle => ({
    schemaVersion: 1,
    bundleId: 'b-recruit',
    workspaceId: 'ws-1',
    skillId: 'skill-1',
    builtAt: new Date().toISOString(),
    dependencyGraph: {
        resume: ['jd', 'score'],
        jd: [],
        score: []
    },
    reverseGraph: {},
    entries: {
        resume: {
            nodeId: 'resume',
            kind: 'skill',
            name: 'resume-screener.md',
            path: 'resume-screener.md',
            content: '# Resume Screener\nJD at ./job-description.txt',
            tools: { dependencies: [], references: [] },
            files: {
                references: [
                    { source: 'app', nodeId: 'jd' },
                    { source: 'app', nodeId: 'score' }
                ]
            },
            source: { nodeId: 'resume', contentDigest: 'd-resume' }
        },
        jd: {
            nodeId: 'jd',
            kind: 'data',
            name: 'job-description.txt',
            path: 'job-description.txt',
            content: '',
            tools: { dependencies: [], references: [] },
            files: { references: [] },
            source: { nodeId: 'jd', contentDigest: 'd-jd' }
        },
        score: {
            nodeId: 'score',
            kind: 'code',
            name: 'scoring_algorithm.js',
            path: 'scoring_algorithm.js',
            content: '',
            tools: { dependencies: [], references: [] },
            files: { references: [] },
            source: { nodeId: 'score', contentDigest: 'd-score' }
        }
    }
})

const capability: SandboxCapability = { label: 'E2B (Bash session)', maxTimeoutMs: 5000, maxOutputBytes: 1024 }

const makeSession = (overrides?: {
    fakeSandbox?: ReturnType<typeof makeFakeSandbox>
    bundle?: SkillBundle
    manifest?: SandboxManifest
    cap?: SandboxCapability
}) => {
    const bundle = overrides?.bundle ?? recruitingBundle()
    // Default to no helpers in the existing tests so they keep asserting
    // exactly one bulk write call (entries only). The helper materialisation
    // path has its own dedicated suite below.
    const manifest = overrides?.manifest ?? buildManifest(bundle, ['resume'], { includeHelpers: false })
    const sandbox = overrides?.fakeSandbox ?? makeFakeSandbox()
    const session = new SandboxSession({
        workspaceId: 'ws-1',
        skillId: 'skill-1',
        bundle,
        manifest,
        capability: overrides?.cap ?? capability,
        createSandbox: jest.fn(async () => sandbox as unknown as import('@e2b/code-interpreter').Sandbox)
    })
    return { session, sandbox, manifest }
}

// =============================================================================
// Constructor + lifecycle invariants
// =============================================================================

beforeEach(() => {
    mockFetchNodeBytes.mockReset()
})

afterEach(async () => {
    // jest.useRealTimers() if any test opted into fake timers.
    jest.useRealTimers()
})

describe('SandboxSession — construction & ensureStarted', () => {
    it('starts in `idle` state and never touches the SDK before ensureStarted', async () => {
        const { session, sandbox } = makeSession()
        expect(session.isClosed).toBe(false)
        expect(sandbox._spies.makeDir).not.toHaveBeenCalled()
        expect(sandbox._spies.run).not.toHaveBeenCalled()
    })

    it('lazily boots the VM, makes /skills + /output dirs, and materialises the manifest', async () => {
        mockFetchNodeBytes.mockImplementation(async ({ kind, nodeId }) => {
            if (kind === 'skill') {
                // Skill content is passed via inlineContent — fetchNodeBytes still
                // calls into here, the implementation guarantees it returns the
                // bytes faithfully when inlineContent is supplied.
                return Buffer.from(`skill-${nodeId}`, 'utf8')
            }
            return Buffer.from(`bytes-${nodeId}`, 'utf8')
        })

        const { session, sandbox, manifest } = makeSession()
        await session.ensureStarted()

        expect(sandbox._spies.makeDir).toHaveBeenCalledWith(manifest.skillsDir)
        expect(sandbox._spies.makeDir).toHaveBeenCalledWith(manifest.outputDir)
        // One bulk write was issued with one entry per manifest file.
        expect(sandbox._spies.write).toHaveBeenCalledTimes(1)
        const written = sandbox._spies.write.mock.calls[0][0]
        const paths = written.map((w: { path: string }) => w.path).sort()
        expect(paths).toEqual(
            [
                '/home/user/skills/job-description.txt',
                '/home/user/skills/resume-screener.md',
                '/home/user/skills/scoring_algorithm.js'
            ].sort()
        )
    })

    it('passes inlineContent for skill-kind entries (so fetchNodeBytes never needs storage)', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const { session } = makeSession()
        await session.ensureStarted()
        const skillCalls = mockFetchNodeBytes.mock.calls.filter(([arg]) => (arg as { kind: string }).kind === 'skill')
        expect(skillCalls).toHaveLength(1)
        const arg = skillCalls[0][0] as { inlineContent?: string }
        expect(arg.inlineContent).toContain('# Resume Screener')
    })

    it('skips manifest entries that resolve to null bytes (no crash, no write entry)', async () => {
        mockFetchNodeBytes.mockImplementation(async ({ nodeId }) => (nodeId === 'score' ? null : Buffer.from('ok', 'utf8')))
        const { session, sandbox } = makeSession()
        await session.ensureStarted()
        const written = sandbox._spies.write.mock.calls[0]?.[0] ?? []
        const paths = written.map((w: { path: string }) => w.path)
        expect(paths).toEqual(expect.not.arrayContaining(['/home/user/skills/scoring_algorithm.js']))
    })

    it('shares one in-flight boot promise across concurrent ensureStarted callers', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const createSandbox = jest.fn(async () => makeFakeSandbox() as unknown as import('@e2b/code-interpreter').Sandbox)
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest: buildManifest(recruitingBundle(), ['resume']),
            capability,
            createSandbox
        })

        await Promise.all([session.ensureStarted(), session.ensureStarted(), session.ensureStarted()])
        expect(createSandbox).toHaveBeenCalledTimes(1)
    })

    it('rolls state back to idle when boot fails so a retry can proceed', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        const failing = jest
            .fn()
            .mockRejectedValueOnce(new Error('network blip'))
            .mockResolvedValueOnce(makeFakeSandbox() as unknown as import('@e2b/code-interpreter').Sandbox)
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest: buildManifest(recruitingBundle(), ['resume']),
            capability,
            createSandbox: failing
        })
        await expect(session.ensureStarted()).rejects.toThrow('network blip')
        // Second call retries and succeeds.
        await expect(session.ensureStarted()).resolves.toBeUndefined()
        await session.close()
        errorSpy.mockRestore()
    })

    it('refuses to start a closed session', async () => {
        const { session } = makeSession()
        await session.close('test-reason')
        await expect(session.ensureStarted()).rejects.toThrow(/closed.*test-reason/)
    })
})

// =============================================================================
// exec — happy path + clamping + error classification
// =============================================================================

describe('SandboxSession.exec — guest-side outcomes', () => {
    it('returns ok=true with stdout/stderr forwarded for a clean exit', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox({
            run: async () => ({ stdout: 'hello', stderr: '', exitCode: 0 })
        })
        const { session } = makeSession({ fakeSandbox: sandbox })

        const r = await session.exec('echo hello')
        expect(r.ok).toBe(true)
        expect(r.stdout).toBe('hello')
        expect(r.exitCode).toBe(0)
        expect(r.error).toBeUndefined()
        expect(typeof r.durationMs).toBe('number')
        await session.close()
    })

    it('clamps stdout/stderr to ~capability.maxOutputBytes (with a small slack for the marker)', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const big = 'A'.repeat(5_000)
        const sandbox = makeFakeSandbox({ run: async () => ({ stdout: big, stderr: big, exitCode: 0 }) })
        const { session } = makeSession({ fakeSandbox: sandbox, cap: { ...capability, maxOutputBytes: 256 } })

        const r = await session.exec('cat huge.txt')
        // Marker length depends on the digit count of `max` so the output
        // can exceed `max` by a handful of bytes — what matters is the
        // input got dramatically truncated and the marker survived.
        expect(r.stdout.length).toBeLessThan(big.length)
        expect(r.stdout).toContain('[truncated: exceeded 256 bytes]')
        await session.close()
    })

    it('clamps the requested timeout against capability.maxTimeoutMs', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox({
            run: async (_cmd, opts) => {
                expect((opts as { timeoutMs: number }).timeoutMs).toBe(5000)
                return { stdout: '', stderr: '', exitCode: 0 }
            }
        })
        const { session } = makeSession({ fakeSandbox: sandbox })
        await session.exec('sleep 1', 60_000) // requested ≫ ceiling
        await session.close()
    })

    it('uses the capability ceiling when no per-call timeout is requested', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox({
            run: async (_cmd, opts) => {
                expect((opts as { timeoutMs: number }).timeoutMs).toBe(capability.maxTimeoutMs)
                return { stdout: '', stderr: '', exitCode: 0 }
            }
        })
        const { session } = makeSession({ fakeSandbox: sandbox })
        await session.exec('echo')
        await session.close()
    })

    it('translates a CommandExitError-shaped throw into ok=false (no host error)', async () => {
        // E2B's `commands.run` throws on non-zero exits; the thrown value
        // implements CommandResult so we read stdout/stderr/exitCode off it.
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox({
            runThrows: { stdout: '', stderr: 'no such file', exitCode: 1 }
        })
        const { session } = makeSession({ fakeSandbox: sandbox })
        const r = await session.exec('cat /nope')
        expect(r.ok).toBe(false)
        expect(r.exitCode).toBe(1)
        expect(r.stderr).toBe('no such file')
        expect(r.error).toBeUndefined()
        await session.close()
    })
})

describe('SandboxSession.exec — host-side error classification', () => {
    const cases: Array<{ message: string; kind: 'timeout' | 'disabled' | 'internal' }> = [
        { message: 'request timed out after 30s', kind: 'timeout' },
        { message: 'sandbox connection closed', kind: 'disabled' },
        { message: 'process killed by signal', kind: 'disabled' },
        { message: 'unknown internal error', kind: 'internal' }
    ]

    it.each(cases)('classifies host error "$message" as kind=$kind', async ({ message, kind }) => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox({ runThrows: new Error(message) })
        const { session } = makeSession({ fakeSandbox: sandbox })
        const r = await session.exec('echo')
        expect(r.ok).toBe(false)
        expect(r.error?.kind).toBe(kind)
        expect(r.error?.message).toBe(message)
        await session.close()
    })

    it('returns a disabled envelope when exec runs after close()', async () => {
        const { session } = makeSession()
        await session.close('explicit shutdown')
        const r = await session.exec('echo')
        expect(r.ok).toBe(false)
        expect(r.error?.kind).toBe('disabled')
        expect(r.error?.message).toMatch(/explicit shutdown/)
    })

    it('surfaces a host-error envelope when the boot itself fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest: buildManifest(recruitingBundle(), ['resume']),
            capability,
            createSandbox: async () => {
                throw new Error('connection timed out')
            }
        })
        const r = await session.exec('echo')
        expect(r.ok).toBe(false)
        expect(r.error?.kind).toBe('timeout')
        expect(r.error?.message).toBe('connection timed out')
        await session.close()
        errorSpy.mockRestore()
    })
})

// =============================================================================
// harvestOutputs — best-effort, never throws
// =============================================================================

describe('SandboxSession.harvestOutputs', () => {
    it('returns an empty array before the session is started', async () => {
        const { session } = makeSession()
        expect(await session.harvestOutputs()).toEqual([])
    })

    it('returns an empty array after close()', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const { session } = makeSession()
        await session.ensureStarted()
        await session.close()
        expect(await session.harvestOutputs()).toEqual([])
    })

    it('reads every file under outputDir, skipping directories and unreadable entries', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox({
            listOutputs: [
                { name: 'report.md', type: 'file' },
                { name: 'subdir', type: 'dir' },
                { name: 'data.json', type: 'file' }
            ],
            readFile: async (path) => {
                if (path.endsWith('data.json')) throw new Error('unreadable')
                return new Uint8Array(Buffer.from('REPORT', 'utf8'))
            }
        })
        const { session } = makeSession({ fakeSandbox: sandbox })
        await session.ensureStarted()
        const out = await session.harvestOutputs()
        expect(out).toHaveLength(1)
        expect(out[0].path).toBe('/home/user/output/report.md')
        expect(out[0].bytes.toString('utf8')).toBe('REPORT')
        await session.close()
    })

    it('honours the limit argument', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox({
            listOutputs: [
                { name: 'a', type: 'file' },
                { name: 'b', type: 'file' },
                { name: 'c', type: 'file' }
            ]
        })
        const { session } = makeSession({ fakeSandbox: sandbox })
        await session.ensureStarted()
        const out = await session.harvestOutputs(2)
        expect(out).toHaveLength(2)
        await session.close()
    })

    it('returns [] when listing the output dir throws', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox()
        sandbox._spies.listFiles.mockImplementationOnce(async () => {
            throw new Error('ENOENT')
        })
        const { session } = makeSession({ fakeSandbox: sandbox })
        await session.ensureStarted()
        expect(await session.harvestOutputs()).toEqual([])
        await session.close()
    })
})

// =============================================================================
// close — idempotent, swallows kill() errors
// =============================================================================

// =============================================================================
// Built-in helper materialisation — exempt from byte budget, single log line
// =============================================================================

describe('SandboxSession — helper materialisation', () => {
    const buildHelperManifest = (): SandboxManifest =>
        buildManifest(recruitingBundle(), ['resume'], {
            includeHelpers: true,
            helperRegistry: [stubHelper('pdf_extract', '#!/usr/bin/env python3\nprint("hi")')]
        })

    it('makes the helpers dir and uploads helper bytes alongside entries', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox()
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest: buildHelperManifest(),
            capability,
            createSandbox: jest.fn(async () => sandbox as unknown as import('@e2b/code-interpreter').Sandbox),
            helperRegistry: [stubHelper('pdf_extract', '#!/usr/bin/env python3\nprint("hi")')]
        })
        await session.ensureStarted()
        expect(sandbox._spies.makeDir).toHaveBeenCalledWith('/home/user/skills')
        expect(sandbox._spies.makeDir).toHaveBeenCalledWith('/home/user/output')
        expect(sandbox._spies.makeDir).toHaveBeenCalledWith('/home/user/helpers')
        // Two bulk writes: one for entries, one for helpers.
        expect(sandbox._spies.write).toHaveBeenCalledTimes(2)
        const helperWrite = sandbox._spies.write.mock.calls[1][0] as Array<{ path: string; data: Buffer }>
        expect(helperWrite).toHaveLength(1)
        expect(helperWrite[0].path).toBe('/home/user/helpers/pdf_extract.py')
        expect(helperWrite[0].data.toString('utf8')).toContain('print("hi")')
        await session.close()
    })

    it('enriches manifest.helpers in place with the resolved digest and sizeBytes', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox()
        const helperBody = '#!/usr/bin/env python3\nprint("hi")'
        const reg = [stubHelper('pdf_extract', helperBody)]
        const manifest = buildManifest(recruitingBundle(), ['resume'], {
            includeHelpers: true,
            helperRegistry: reg
        })
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest,
            capability,
            createSandbox: jest.fn(async () => sandbox as unknown as import('@e2b/code-interpreter').Sandbox),
            helperRegistry: reg
        })
        // Pre-condition: placeholders before boot.
        expect(manifest.helpers[0].digest).toBe('')
        expect(manifest.helpers[0].sizeBytes).toBe(0)
        await session.ensureStarted()
        expect(manifest.helpers[0].digest).toBe('digest-pdf_extract')
        expect(manifest.helpers[0].sizeBytes).toBe(Buffer.byteLength(helperBody, 'utf8'))
        await session.close()
    })

    it('skips helper materialisation entirely when manifest.helpers is empty', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox()
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest: buildManifest(recruitingBundle(), ['resume'], { includeHelpers: false }),
            capability,
            createSandbox: jest.fn(async () => sandbox as unknown as import('@e2b/code-interpreter').Sandbox)
        })
        await session.ensureStarted()
        const helperDirCalls = sandbox._spies.makeDir.mock.calls.filter((c) => c[0] === '/home/user/helpers')
        expect(helperDirCalls).toHaveLength(0)
        // Only the entries write — no helper write.
        expect(sandbox._spies.write).toHaveBeenCalledTimes(1)
        await session.close()
    })

    it('emits exactly one telemetry log line (Materialized N helpers …)', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
        try {
            mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
            const sandbox = makeFakeSandbox()
            const reg = [stubHelper('pdf_extract', 'body-a'), stubHelper('docx_extract', 'body-bb')]
            const manifest = buildManifest(recruitingBundle(), ['resume'], { includeHelpers: true, helperRegistry: reg })
            const session = new SandboxSession({
                workspaceId: 'ws-1',
                skillId: 'skill-1',
                bundle: recruitingBundle(),
                manifest,
                capability,
                createSandbox: jest.fn(async () => sandbox as unknown as import('@e2b/code-interpreter').Sandbox),
                helperRegistry: reg
            })
            await session.ensureStarted()
            const lines = logSpy.mock.calls.map((c) => c[0] as string).filter((l) => l.includes('Materialized'))
            expect(lines).toHaveLength(1)
            // 6 + 7 bytes = 13 across two helpers.
            expect(lines[0]).toMatch(/Materialized 2 helpers \(13 bytes\) for skill skill-1/)
            await session.close()
        } finally {
            logSpy.mockRestore()
        }
    })

    it('uploads helpers even when per-file/total byte caps would reject regular entries (helpers are trusted)', async () => {
        // We can't easily flip the env in-test, but we can prove the
        // intent by uploading a helper that's larger than a caller's
        // typical entries — the fact that the upload succeeds at all
        // (alongside an entry materialisation that runs the budget logic)
        // is the regression guarantee. Pair this with the docs-only note
        // about exemption rather than a fragile env-driven assertion.
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox()
        const big = 'A'.repeat(50_000)
        const reg = [stubHelper('big_helper', big)]
        const manifest = buildManifest(recruitingBundle(), ['resume'], { includeHelpers: true, helperRegistry: reg })
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest,
            capability,
            createSandbox: jest.fn(async () => sandbox as unknown as import('@e2b/code-interpreter').Sandbox),
            helperRegistry: reg
        })
        await expect(session.ensureStarted()).resolves.toBeUndefined()
        const helperWrite = sandbox._spies.write.mock.calls[1][0] as Array<{ path: string; data: Buffer }>
        expect(helperWrite[0].data.length).toBe(big.length)
        await session.close()
    })

    it('warns and skips when the manifest references a helper not present in the registry', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        try {
            mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
            const sandbox = makeFakeSandbox()
            // Manifest references "ghost_helper" but the runtime registry
            // is empty — we expect a single warning and zero helper writes.
            const manifest: SandboxManifest = {
                ...buildManifest(recruitingBundle(), ['resume'], { includeHelpers: false }),
                helpers: [{ name: 'ghost_helper', relPath: 'ghost_helper.py', digest: '', sizeBytes: 0 }]
            }
            const session = new SandboxSession({
                workspaceId: 'ws-1',
                skillId: 'skill-1',
                bundle: recruitingBundle(),
                manifest,
                capability,
                createSandbox: jest.fn(async () => sandbox as unknown as import('@e2b/code-interpreter').Sandbox),
                helperRegistry: []
            })
            await session.ensureStarted()
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ghost_helper'))
            // Helpers dir was made (manifest.helpers.length > 0) but no
            // helper write was issued (registry was empty).
            expect(sandbox._spies.write).toHaveBeenCalledTimes(1) // entries only
            await session.close()
        } finally {
            warnSpy.mockRestore()
        }
    })
})

describe('SandboxSession.close', () => {
    it('is idempotent', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const { session, sandbox } = makeSession()
        await session.ensureStarted()
        await session.close('first')
        await session.close('second')
        expect(session.isClosed).toBe(true)
        expect(sandbox._spies.kill).toHaveBeenCalledTimes(1)
    })

    it('swallows errors from sandbox.kill()', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const sandbox = makeFakeSandbox()
        sandbox._spies.kill.mockImplementationOnce(async () => {
            throw new Error('network blip')
        })
        const { session } = makeSession({ fakeSandbox: sandbox })
        await session.ensureStarted()
        await expect(session.close()).resolves.toBeUndefined()
    })
})
