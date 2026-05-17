// =============================================================================
// SandboxSession now consumes a SandboxBackendProtocol — no SDK to mock.
// fetchNodeBytes is still stubbed so we never touch storage.
// =============================================================================

const mockFetchNodeBytes = jest.fn()
jest.mock('./fetchNodeBytes', () => ({
    __esModule: true,
    fetchNodeBytes: (...args: unknown[]) => mockFetchNodeBytes(...args),
    clearNodeBytesCache: () => undefined
}))

import type {
    ExecuteResponse,
    FileDownloadResponse,
    FileUploadResponse,
    LsResult,
    ReadResult,
    SandboxBackendProtocol,
    SandboxFileTransfer,
    SandboxRuntime
} from '../../../../src/sandbox'
import type { SkillBundle } from '../utils'
import type { BuiltinHelper } from './builtinHelpers'
import type { SandboxCapability } from './capability'
import { buildManifest, SandboxManifest } from './SandboxManifest'
import { SandboxSession } from './SandboxSession'

// Local helper-registry stub.
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
// Fake backend — implements SandboxBackendProtocol with introspectable spies.
// =============================================================================

interface FakeRunResult {
    output?: string
    exitCode?: number | null
    truncated?: boolean
}

const makeFakeBackend = (overrides?: {
    execute?: (cmd: string) => Promise<FakeRunResult | ExecuteResponse> | FakeRunResult | ExecuteResponse
    executeThrows?: unknown
    uploadFiles?: (files: Array<[string, Uint8Array]>) => FileUploadResponse[]
    downloadFiles?: (paths: string[]) => FileDownloadResponse[]
    list?: LsResult
}): SandboxBackendProtocol & SandboxFileTransfer & SandboxRuntime & { _spies: any } => {
    const executeSpy = jest.fn(async (cmd: string): Promise<ExecuteResponse> => {
        if (overrides?.executeThrows !== undefined) throw overrides.executeThrows
        const r = overrides?.execute ? await overrides.execute(cmd) : { output: 'ok', exitCode: 0, truncated: false }
        // Preserve `null` exit codes verbatim so we can exercise the
        // architecture's killed-without-status path.
        return {
            output: r.output ?? '',
            exitCode: 'exitCode' in r ? (r.exitCode as number | null) : 0,
            truncated: r.truncated ?? false
        }
    })
    const uploadSpy = jest.fn(async (files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]> => {
        return overrides?.uploadFiles ? overrides.uploadFiles(files) : files.map(([p]) => ({ path: p, error: null }))
    })
    const downloadSpy = jest.fn(async (paths: string[]): Promise<FileDownloadResponse[]> => {
        if (overrides?.downloadFiles) return overrides.downloadFiles(paths)
        return paths.map((p) => ({ path: p, content: new Uint8Array(Buffer.from(`bytes-of:${p}`, 'utf8')), error: null }))
    })
    const lsSpy = jest.fn(async (path: string): Promise<LsResult> => overrides?.list ?? { path, entries: [] })
    const readSpy = jest.fn(async (path: string): Promise<ReadResult> => ({ path, content: '' }))
    const initialize = jest.fn(async () => undefined)
    const close = jest.fn(async () => undefined)
    let running = false
    return {
        id: 'fake-backend',
        execute: executeSpy as any,
        uploadFiles: uploadSpy as any,
        downloadFiles: downloadSpy as any,
        ls: lsSpy as any,
        read: readSpy as any,
        readRaw: jest.fn(async (p: string) => ({ path: p, content: null })) as any,
        write: jest.fn(async (p: string) => ({ path: p })) as any,
        edit: jest.fn(async (p: string) => ({ path: p, replacements: 0 })) as any,
        glob: jest.fn(async (pat: string, p?: string) => ({ pattern: pat, path: p ?? '.', matches: [] })) as any,
        grep: jest.fn(async (pat: string, p?: string) => ({ pattern: pat, path: p ?? '.', hits: [] })) as any,
        get isRunning() {
            return running
        },
        async initialize() {
            running = true
            await initialize()
        },
        async close() {
            running = false
            await close()
        },
        _spies: { execute: executeSpy, uploadFiles: uploadSpy, downloadFiles: downloadSpy, ls: lsSpy, initialize, close }
    }
}

// =============================================================================
// Fixtures
// =============================================================================

const recruitingBundle = (): SkillBundle => ({
    schemaVersion: 1,
    bundleId: 'b-recruit',
    workspaceId: 'ws-1',
    skillId: 'skill-1',
    builtAt: new Date().toISOString(),
    dependencyGraph: { resume: ['jd', 'score'], jd: [], score: [] },
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

const capability: SandboxCapability = { label: 'Fake', maxTimeoutMs: 5000, maxOutputBytes: 1024 }

const makeSession = (overrides?: {
    backend?: ReturnType<typeof makeFakeBackend>
    bundle?: SkillBundle
    manifest?: SandboxManifest
    cap?: SandboxCapability
}) => {
    const bundle = overrides?.bundle ?? recruitingBundle()
    const manifest = overrides?.manifest ?? buildManifest(bundle, ['resume'], { includeHelpers: false })
    const backend = overrides?.backend ?? makeFakeBackend()
    const session = new SandboxSession({
        workspaceId: 'ws-1',
        skillId: 'skill-1',
        bundle,
        manifest,
        capability: overrides?.cap ?? capability,
        backend,
        runtime: backend
    })
    return { session, backend, manifest }
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
    mockFetchNodeBytes.mockReset()
})

afterEach(async () => {
    jest.useRealTimers()
})

describe('SandboxSession — construction & ensureStarted', () => {
    it('rejects backends that do not satisfy SandboxBackendProtocol', () => {
        expect(
            () =>
                new SandboxSession({
                    workspaceId: 'ws-1',
                    skillId: 'skill-1',
                    bundle: recruitingBundle(),
                    manifest: buildManifest(recruitingBundle(), ['resume'], { includeHelpers: false }),
                    capability,
                    backend: { execute: () => ({ output: '', exitCode: 0, truncated: false }) } as any
                })
        ).toThrow(/SandboxBackendProtocol/)
    })

    it('starts in idle state and never touches the backend before ensureStarted', async () => {
        const { session, backend } = makeSession()
        expect(session.isClosed).toBe(false)
        expect(backend._spies.execute).not.toHaveBeenCalled()
        expect(backend._spies.uploadFiles).not.toHaveBeenCalled()
    })

    it("lazily boots, calls runtime.initialize(), mkdir -p's the layout, and uploads entries", async () => {
        mockFetchNodeBytes.mockImplementation(async ({ nodeId }) => Buffer.from(`bytes-${nodeId}`, 'utf8'))
        const { session, backend, manifest } = makeSession()
        await session.ensureStarted()
        expect(backend._spies.initialize).toHaveBeenCalledTimes(1)
        // mkdir -p invocation includes both dirs.
        const mkdirCalls = backend._spies.execute.mock.calls.map((c: any[]) => c[0] as string)
        expect(mkdirCalls.some((c: string) => c.startsWith('mkdir -p') && c.includes(manifest.skillsDir))).toBe(true)
        // One bulk uploadFiles call for the entries.
        expect(backend._spies.uploadFiles).toHaveBeenCalledTimes(1)
        const uploaded = backend._spies.uploadFiles.mock.calls[0][0] as Array<[string, Uint8Array]>
        const paths = uploaded.map(([p]) => p).sort()
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

    it('skips manifest entries that resolve to null bytes (no crash, no upload entry)', async () => {
        mockFetchNodeBytes.mockImplementation(async ({ nodeId }) => (nodeId === 'score' ? null : Buffer.from('ok', 'utf8')))
        const { session, backend } = makeSession()
        await session.ensureStarted()
        const uploaded = (backend._spies.uploadFiles.mock.calls[0]?.[0] ?? []) as Array<[string, Uint8Array]>
        const paths = uploaded.map(([p]) => p)
        expect(paths).toEqual(expect.not.arrayContaining(['/home/user/skills/scoring_algorithm.js']))
    })

    it('shares one in-flight boot promise across concurrent ensureStarted callers', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend()
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest: buildManifest(recruitingBundle(), ['resume']),
            capability,
            backend,
            runtime: backend
        })
        await Promise.all([session.ensureStarted(), session.ensureStarted(), session.ensureStarted()])
        expect(backend._spies.initialize).toHaveBeenCalledTimes(1)
    })

    it('rolls state back to idle when boot fails so a retry can proceed', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        let attempt = 0
        const backend = makeFakeBackend({
            execute: async (cmd: string) => {
                if (cmd.startsWith('mkdir -p') && attempt === 0) {
                    attempt += 1
                    throw new Error('network blip')
                }
                return { output: '', exitCode: 0, truncated: false }
            }
        })
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest: buildManifest(recruitingBundle(), ['resume']),
            capability,
            backend,
            runtime: backend
        })
        await expect(session.ensureStarted()).rejects.toThrow('network blip')
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

describe('SandboxSession.exec — guest-side outcomes', () => {
    it('returns ok=true for a clean exit', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend({
            execute: async (cmd: string) => {
                if (cmd.startsWith('mkdir -p')) return { output: '', exitCode: 0, truncated: false }
                return { output: 'hello', exitCode: 0, truncated: false }
            }
        })
        const { session } = makeSession({ backend })
        const r = await session.exec('echo hello')
        expect(r.ok).toBe(true)
        expect(r.stdout).toBe('hello')
        expect(r.exitCode).toBe(0)
        expect(r.error).toBeUndefined()
        expect(typeof r.durationMs).toBe('number')
        await session.close()
    })

    it('reports ok=false for non-zero exit', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend({
            execute: async (cmd: string) => {
                if (cmd.startsWith('mkdir -p')) return { output: '', exitCode: 0, truncated: false }
                return { output: 'no such file', exitCode: 1, truncated: false }
            }
        })
        const { session } = makeSession({ backend })
        const r = await session.exec('cat /nope')
        expect(r.ok).toBe(false)
        expect(r.exitCode).toBe(1)
        expect(r.stdout).toBe('no such file')
        expect(r.error).toBeUndefined()
        await session.close()
    })

    it('surfaces truncation through the legacy stderr slot', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend({
            execute: async (cmd: string) => {
                if (cmd.startsWith('mkdir -p')) return { output: '', exitCode: 0, truncated: false }
                return { output: 'A'.repeat(100), exitCode: 0, truncated: true }
            }
        })
        const { session } = makeSession({ backend })
        const r = await session.exec('long')
        expect(r.stderr).toBe('[Output was truncated due to size limits]')
        await session.close()
    })

    it('maps exitCode=null to a timeout-flavored envelope', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend({
            execute: async (cmd: string) => {
                if (cmd.startsWith('mkdir -p')) return { output: '', exitCode: 0, truncated: false }
                return { output: '', exitCode: null, truncated: false }
            }
        })
        const { session } = makeSession({ backend })
        const r = await session.exec('sleep 100')
        expect(r.ok).toBe(false)
        expect(r.exitCode).toBe(1)
        expect(r.error?.kind).toBe('timeout')
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
        const backend = makeFakeBackend()
        backend._spies.initialize.mockImplementationOnce(async () => {
            throw new Error('connection timed out')
        })
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest: buildManifest(recruitingBundle(), ['resume']),
            capability,
            backend,
            runtime: backend
        })
        const r = await session.exec('echo')
        expect(r.ok).toBe(false)
        expect(r.error?.kind).toBe('timeout')
        expect(r.error?.message).toBe('connection timed out')
        await session.close()
        errorSpy.mockRestore()
    })
})

describe('SandboxSession.harvestOutputs', () => {
    it('returns [] before the session is started', async () => {
        const { session } = makeSession()
        expect(await session.harvestOutputs()).toEqual([])
    })

    it('returns [] after close()', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const { session } = makeSession()
        await session.ensureStarted()
        await session.close()
        expect(await session.harvestOutputs()).toEqual([])
    })

    it('reads every file listed under outputDir, skipping directories', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend({
            list: {
                path: '/home/user/output',
                entries: [
                    { name: 'report.md', path: '/home/user/output/report.md', type: 'file' },
                    { name: 'subdir', path: '/home/user/output/subdir', type: 'dir' },
                    { name: 'data.json', path: '/home/user/output/data.json', type: 'file' }
                ]
            },
            downloadFiles: (paths: string[]) =>
                paths.map((p) => ({ path: p, content: new Uint8Array(Buffer.from('REPORT', 'utf8')), error: null }))
        })
        const { session } = makeSession({ backend })
        await session.ensureStarted()
        const out = await session.harvestOutputs()
        // Two files reported (the dir is filtered out).
        expect(out.map((o) => o.path).sort()).toEqual(['/home/user/output/data.json', '/home/user/output/report.md'])
        expect(out[0].bytes.toString('utf8')).toBe('REPORT')
        await session.close()
    })

    it('honours the limit argument', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend({
            list: {
                path: '/home/user/output',
                entries: [
                    { name: 'a', path: '/home/user/output/a', type: 'file' },
                    { name: 'b', path: '/home/user/output/b', type: 'file' },
                    { name: 'c', path: '/home/user/output/c', type: 'file' }
                ]
            }
        })
        const { session } = makeSession({ backend })
        await session.ensureStarted()
        const out = await session.harvestOutputs(2)
        expect(out).toHaveLength(2)
        await session.close()
    })
})

describe('SandboxSession — helper materialisation', () => {
    const buildHelperManifest = (): SandboxManifest =>
        buildManifest(recruitingBundle(), ['resume'], {
            includeHelpers: true,
            helperRegistry: [stubHelper('pdf_extract', '#!/usr/bin/env python3\nprint("hi")')]
        })

    it('mkdirs the helpers dir and uploads helper bytes alongside entries', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend()
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest: buildHelperManifest(),
            capability,
            backend,
            runtime: backend,
            helperRegistry: [stubHelper('pdf_extract', '#!/usr/bin/env python3\nprint("hi")')]
        })
        await session.ensureStarted()
        const mkdirCalls = backend._spies.execute.mock.calls.map((c: any[]) => c[0] as string)
        const mkdirLine = mkdirCalls.find((c: string) => c.startsWith('mkdir -p'))
        expect(mkdirLine).toContain('/home/user/skills')
        expect(mkdirLine).toContain('/home/user/output')
        expect(mkdirLine).toContain('/home/user/helpers')
        // Two bulk uploads: one for entries, one for helpers.
        expect(backend._spies.uploadFiles).toHaveBeenCalledTimes(2)
        const helperUpload = backend._spies.uploadFiles.mock.calls[1][0] as Array<[string, Uint8Array]>
        expect(helperUpload).toHaveLength(1)
        expect(helperUpload[0][0]).toBe('/home/user/helpers/pdf_extract.py')
        expect(Buffer.from(helperUpload[0][1]).toString('utf8')).toContain('print("hi")')
        await session.close()
    })

    it('enriches manifest.helpers in place with the resolved digest and sizeBytes', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend()
        const helperBody = '#!/usr/bin/env python3\nprint("hi")'
        const reg = [stubHelper('pdf_extract', helperBody)]
        const manifest = buildManifest(recruitingBundle(), ['resume'], { includeHelpers: true, helperRegistry: reg })
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest,
            capability,
            backend,
            runtime: backend,
            helperRegistry: reg
        })
        expect(manifest.helpers[0].digest).toBe('')
        expect(manifest.helpers[0].sizeBytes).toBe(0)
        await session.ensureStarted()
        expect(manifest.helpers[0].digest).toBe('digest-pdf_extract')
        expect(manifest.helpers[0].sizeBytes).toBe(Buffer.byteLength(helperBody, 'utf8'))
        await session.close()
    })

    it('skips helper materialisation entirely when manifest.helpers is empty', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend()
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest: buildManifest(recruitingBundle(), ['resume'], { includeHelpers: false }),
            capability,
            backend,
            runtime: backend
        })
        await session.ensureStarted()
        const mkdirLine = backend._spies.execute.mock.calls.map((c: any[]) => c[0] as string).find((c: string) => c.startsWith('mkdir -p'))
        expect(mkdirLine).not.toContain('/home/user/helpers')
        expect(backend._spies.uploadFiles).toHaveBeenCalledTimes(1)
        await session.close()
    })

    it('emits exactly one telemetry log line (Materialized N helpers …)', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
        try {
            mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
            const backend = makeFakeBackend()
            const reg = [stubHelper('pdf_extract', 'body-a'), stubHelper('docx_extract', 'body-bb')]
            const manifest = buildManifest(recruitingBundle(), ['resume'], { includeHelpers: true, helperRegistry: reg })
            const session = new SandboxSession({
                workspaceId: 'ws-1',
                skillId: 'skill-1',
                bundle: recruitingBundle(),
                manifest,
                capability,
                backend,
                runtime: backend,
                helperRegistry: reg
            })
            await session.ensureStarted()
            const lines = logSpy.mock.calls.map((c) => c[0] as string).filter((l) => l.includes('Materialized'))
            expect(lines).toHaveLength(1)
            expect(lines[0]).toMatch(/Materialized 2 helpers \(13 bytes\) for skill skill-1/)
            await session.close()
        } finally {
            logSpy.mockRestore()
        }
    })

    it('uploads helpers even when they exceed the per-file budget (helpers are trusted)', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend()
        const big = 'A'.repeat(50_000)
        const reg = [stubHelper('big_helper', big)]
        const manifest = buildManifest(recruitingBundle(), ['resume'], { includeHelpers: true, helperRegistry: reg })
        const session = new SandboxSession({
            workspaceId: 'ws-1',
            skillId: 'skill-1',
            bundle: recruitingBundle(),
            manifest,
            capability,
            backend,
            runtime: backend,
            helperRegistry: reg
        })
        await expect(session.ensureStarted()).resolves.toBeUndefined()
        const helperUpload = backend._spies.uploadFiles.mock.calls[1][0] as Array<[string, Uint8Array]>
        expect(helperUpload[0][1].length).toBe(big.length)
        await session.close()
    })

    it('warns and skips when the manifest references a helper not present in the registry', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        try {
            mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
            const backend = makeFakeBackend()
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
                backend,
                runtime: backend,
                helperRegistry: []
            })
            await session.ensureStarted()
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ghost_helper'))
            expect(backend._spies.uploadFiles).toHaveBeenCalledTimes(1) // entries only
            await session.close()
        } finally {
            warnSpy.mockRestore()
        }
    })
})

describe('SandboxSession.getBackend — materializing proxy', () => {
    it('returns a stable, cached proxy across calls', () => {
        const { session } = makeSession()
        const a = session.getBackend()
        const b = session.getBackend()
        expect(a).toBe(b)
    })

    it('does NOT return the raw backend reference (proxy != inner)', () => {
        const { session, backend } = makeSession()
        expect(session.getBackend()).not.toBe(backend)
    })

    it('proxy.ls() boots the sandbox and uploads the manifest on first use', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('resume bytes', 'utf8'))
        const { session, backend } = makeSession()
        // No exec() ever called — only a structured FS call.
        const r = await session.getBackend().ls('/home/user/skills')
        expect(r.error).toBeUndefined()
        // initialize() + the mkdir -p execute() + at least one uploadFiles
        // bulk all happened before the inner.ls() ran.
        expect(backend._spies.initialize).toHaveBeenCalledTimes(1)
        expect(backend._spies.uploadFiles).toHaveBeenCalled()
        expect(backend._spies.ls).toHaveBeenCalledWith('/home/user/skills')
        await session.close()
    })

    it('proxy.read() also triggers materialisation (no exec() required)', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('bytes', 'utf8'))
        const { session, backend } = makeSession()
        await session.getBackend().read('/home/user/skills/resume-screener.md')
        // Materialisation happened: initialize + bulk upload of entries.
        expect(backend._spies.initialize).toHaveBeenCalledTimes(1)
        expect(backend._spies.uploadFiles).toHaveBeenCalledTimes(1)
        await session.close()
    })

    it('boots only once across many structured-tool calls', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('bytes', 'utf8'))
        const { session, backend } = makeSession()
        const proxy = session.getBackend()
        await Promise.all([
            proxy.ls('/home/user/skills'),
            proxy.read('/home/user/skills/resume-screener.md'),
            proxy.glob('*', '/home/user/skills'),
            proxy.grep('hello', '/home/user/skills')
        ])
        expect(backend._spies.initialize).toHaveBeenCalledTimes(1)
        expect(backend._spies.uploadFiles).toHaveBeenCalledTimes(1)
        await session.close()
    })

    it('boots first on proxy.ls() then a follow-up exec() does NOT re-boot', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('bytes', 'utf8'))
        const { session, backend } = makeSession()
        await session.getBackend().ls('/home/user/skills')
        await session.exec('echo hi')
        expect(backend._spies.initialize).toHaveBeenCalledTimes(1)
        expect(backend._spies.uploadFiles).toHaveBeenCalledTimes(1)
        await session.close()
    })

    it('returns a tagged-union error (NOT a throw) when boot fails', async () => {
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        try {
            const backend = makeFakeBackend()
            backend._spies.initialize.mockImplementationOnce(async () => {
                throw new Error('VM unreachable')
            })
            const session = new SandboxSession({
                workspaceId: 'ws-1',
                skillId: 'skill-1',
                bundle: recruitingBundle(),
                manifest: buildManifest(recruitingBundle(), ['resume']),
                capability,
                backend,
                runtime: backend
            })
            const r = await session.getBackend().ls('/home/user/skills')
            expect(r.entries).toEqual([])
            expect(r.error).toContain('sandbox not ready')
            expect(r.error).toContain('VM unreachable')
            // The inner ls was never reached.
            expect(backend._spies.ls).not.toHaveBeenCalled()
            await session.close()
        } finally {
            errSpy.mockRestore()
        }
    })

    it('returns a tagged-union error on a closed session', async () => {
        const { session } = makeSession()
        await session.close('explicit shutdown')
        const r = await session.getBackend().ls('/home/user/skills')
        expect(r.error).toMatch(/sandbox is closed.*explicit shutdown/)
    })

    it('propagates errors uniformly across every protocol method', async () => {
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        try {
            const backend = makeFakeBackend()
            backend._spies.initialize.mockImplementation(async () => {
                throw new Error('boot fail')
            })
            const session = new SandboxSession({
                workspaceId: 'ws-1',
                skillId: 'skill-1',
                bundle: recruitingBundle(),
                manifest: buildManifest(recruitingBundle(), ['resume']),
                capability,
                backend,
                runtime: backend
            })
            const proxy = session.getBackend()
            expect((await proxy.ls('/p')).error).toMatch(/sandbox not ready/)
            expect((await proxy.read('/p')).error).toMatch(/sandbox not ready/)
            expect((await proxy.readRaw('/p')).error).toMatch(/sandbox not ready/)
            expect((await proxy.write('/p', 'x')).error).toMatch(/sandbox not ready/)
            expect((await proxy.edit('/p', 'a', 'b')).error).toMatch(/sandbox not ready/)
            expect((await proxy.glob('*', '/p')).error).toMatch(/sandbox not ready/)
            expect((await proxy.grep('x', '/p')).error).toMatch(/sandbox not ready/)
            const ups = await proxy.uploadFiles([['/p', new Uint8Array([1])]])
            expect(ups[0].error).toBe('io_error')
            expect(ups[0].message).toMatch(/sandbox not ready/)
            const downs = await proxy.downloadFiles(['/p'])
            expect(downs[0].error).toBe('io_error')
            expect(downs[0].message).toMatch(/sandbox not ready/)
            await session.close()
        } finally {
            errSpy.mockRestore()
        }
    })
})

describe('SandboxSession.close', () => {
    it('is idempotent', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const { session, backend } = makeSession()
        await session.ensureStarted()
        await session.close('first')
        await session.close('second')
        expect(session.isClosed).toBe(true)
        expect(backend._spies.close).toHaveBeenCalledTimes(1)
    })

    it('swallows errors from runtime.close()', async () => {
        mockFetchNodeBytes.mockResolvedValue(Buffer.from('x', 'utf8'))
        const backend = makeFakeBackend()
        backend._spies.close.mockImplementationOnce(async () => {
            throw new Error('network blip')
        })
        const { session } = makeSession({ backend })
        await session.ensureStarted()
        await expect(session.close()).resolves.toBeUndefined()
    })
})
