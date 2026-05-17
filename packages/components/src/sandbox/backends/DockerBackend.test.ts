/**
 * DockerBackend — unit tests against an in-memory fake `DockerLike` so
 * we exercise the state machine, output mapping, timers, and mutex
 * without booting a real container.
 */

import { DockerBackend } from './DockerBackend'
import { isSandboxBackend } from '../isSandboxBackend'
import { ContainerLike, DockerLike, ExecResult } from '../docker/DockerClient'
import { FileDownloadResponse, FileUploadResponse } from '../types'

// ---------------------------------------------------------------------------
// Fake DockerLike — minimal in-memory implementation
// ---------------------------------------------------------------------------

interface FakeContainerOptions {
    execHandler?: (cmd: string[]) => Promise<ExecResult> | ExecResult
    putHandler?: (files: Array<[string, Uint8Array]>) => Promise<FileUploadResponse[]> | FileUploadResponse[]
    getHandler?: (paths: string[]) => Promise<FileDownloadResponse[]> | FileDownloadResponse[]
    startThrows?: unknown
}

const okExec = (stdout = 'ok', stderr = '', exitCode: number | null = 0, timedOut = false): ExecResult => ({
    stdout: Buffer.from(stdout, 'utf8'),
    stderr: Buffer.from(stderr, 'utf8'),
    exitCode,
    timedOut
})

class FakeContainer implements ContainerLike {
    public readonly id: string = 'fakecontainer123abc456'
    public started = false
    public removed = false
    public killed = false
    public execCalls: string[][] = []
    public execCallOpts: Array<{ timeoutMs: number; user?: string; workingDir?: string }> = []

    constructor(private readonly opts: FakeContainerOptions = {}) {}

    async start(): Promise<void> {
        if (this.opts.startThrows) throw this.opts.startThrows
        this.started = true
    }
    async remove(_opts: { force: boolean; v: boolean }): Promise<void> {
        this.removed = true
    }
    async kill(): Promise<void> {
        this.killed = true
    }
    async exec(cmd: string[], opts: { timeoutMs: number; user?: string; workingDir?: string }): Promise<ExecResult> {
        this.execCalls.push(cmd)
        this.execCallOpts.push(opts)
        if (this.opts.execHandler) return Promise.resolve(this.opts.execHandler(cmd))
        return okExec()
    }
    async putFiles(files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]> {
        if (this.opts.putHandler) return Promise.resolve(this.opts.putHandler(files))
        return files.map(([p]) => ({ path: p, error: null }))
    }
    async getFiles(paths: string[]): Promise<FileDownloadResponse[]> {
        if (this.opts.getHandler) return Promise.resolve(this.opts.getHandler(paths))
        return paths.map((p) => ({ path: p, content: new Uint8Array(Buffer.from(`bytes:${p}`)), error: null }))
    }
}

interface FakeClientOptions extends FakeContainerOptions {
    imagePresent?: boolean
}

class FakeClient implements DockerLike {
    public ensureImageCalls = 0
    public createCalls = 0
    public lastContainer: FakeContainer | null = null

    constructor(private readonly opts: FakeClientOptions = {}) {}

    async isImagePresent(): Promise<boolean> {
        return this.opts.imagePresent !== false
    }
    async ensureImage(): Promise<void> {
        this.ensureImageCalls += 1
        if (this.opts.imagePresent === false) {
            const e = new Error('image missing')
            ;(e as { code?: string }).code = 'NOT_INITIALIZED'
            throw e
        }
    }
    async createContainer(): Promise<ContainerLike> {
        this.createCalls += 1
        this.lastContainer = new FakeContainer(this.opts)
        return this.lastContainer
    }
    async listSkillContainers(): Promise<Array<{ id: string; remove: () => Promise<void> }>> {
        return []
    }
}

const makeBackend = (
    clientOpts: FakeClientOptions = {},
    overrides: { commandTimeoutMs?: number; maxOutputBytes?: number; idleMs?: number; lifetimeMs?: number } = {}
) => {
    const client = new FakeClient(clientOpts)
    const backend = new DockerBackend({
        client,
        image: 'test:latest',
        commandTimeoutMs: overrides.commandTimeoutMs ?? 5_000,
        maxOutputBytes: overrides.maxOutputBytes ?? 64 * 1024,
        idleMs: overrides.idleMs ?? 60_000,
        lifetimeMs: overrides.lifetimeMs ?? 600_000
    })
    return { backend, client }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DockerBackend — protocol contract', () => {
    it('satisfies isSandboxBackend before initialize() is called', () => {
        const { backend } = makeBackend()
        expect(isSandboxBackend(backend)).toBe(true)
        expect(backend.id).toMatch(/^docker-/)
    })

    it('lazily boots through ensureImage + createContainer + start', async () => {
        const { backend, client } = makeBackend()
        await backend.initialize()
        expect(client.ensureImageCalls).toBe(1)
        expect(client.createCalls).toBe(1)
        expect(client.lastContainer?.started).toBe(true)
        expect(backend.id).toMatch(/^docker-fakecontaine/)
    })

    it('shares one initialize() promise across concurrent callers', async () => {
        const { backend, client } = makeBackend()
        await Promise.all([backend.initialize(), backend.initialize(), backend.initialize()])
        expect(client.createCalls).toBe(1)
    })

    it('throws SandboxError when the image is missing', async () => {
        const { backend } = makeBackend({ imagePresent: false })
        await expect(backend.initialize()).rejects.toThrow(/image missing|DockerBackend\.initialize failed/)
    })
})

describe('DockerBackend.execute', () => {
    it('maps a clean exec result to ExecuteResponse with combined output', async () => {
        const { backend } = makeBackend({
            execHandler: async () => okExec('OUT', 'ERR', 0)
        })
        const r = await backend.execute('echo hi')
        expect(r.exitCode).toBe(0)
        expect(r.output).toBe('OUT\nERR')
        expect(r.truncated).toBe(false)
    })

    it('reports the guest exit code on non-zero exits', async () => {
        const { backend } = makeBackend({
            execHandler: async () => okExec('partial', 'oops', 7)
        })
        const r = await backend.execute('exit 7')
        expect(r.exitCode).toBe(7)
        expect(r.output).toContain('partial')
        expect(r.output).toContain('oops')
    })

    it('on hard timeout (host safety net fired): marks the backend closed and surfaces exitCode=null', async () => {
        const { backend } = makeBackend({
            // result.timedOut === true means runExec's host-side safety
            // net fired before the in-container `timeout(1)` could
            // terminate the command. Container was hard-killed.
            execHandler: async () => okExec('', '', null, true)
        })
        const r = await backend.execute('sleep 999')
        expect(r.exitCode).toBeNull()
        expect(r.output).toMatch(/did not terminate within|sandbox closed/i)
        // Subsequent calls return the closed envelope, never re-boot.
        const r2 = await backend.execute('echo hi')
        expect(r2.exitCode).toBeNull()
        expect(r2.output).toMatch(/closed.*command_hard_timeout/)
    })

    it('on soft timeout (in-container `timeout(1)` exited with 124): keeps sandbox alive with friendly trailer', async () => {
        let n = 0
        const { backend } = makeBackend({
            // First call: simulate the in-container `timeout` killing the
            // command with exit 124. Second call: a normal echo, to prove
            // the container is still serving.
            execHandler: async () => {
                n += 1
                return n === 1 ? okExec('some progress\n', '', 124, false) : okExec('hi\n', '', 0, false)
            }
        })
        const r = await backend.execute('sleep 999')
        expect(r.exitCode).toBe(124)
        expect(r.output).toContain('some progress')
        expect(r.output).toMatch(/exceeded the .* sandbox timeout/i)
        expect(r.output).toMatch(/still alive/i)
        expect(r.output).toMatch(/SIGTERM after budget/)

        const r2 = await backend.execute('echo hi')
        expect(r2.exitCode).toBe(0)
        expect(r2.output).toContain('hi')
        expect(r2.output).not.toMatch(/closed/)
    })

    it('on soft timeout escalated to SIGKILL (exit 137): same friendly path, different reason', async () => {
        const { backend } = makeBackend({
            execHandler: async () => okExec('', 'stuck-in-tight-loop', 137, false)
        })
        const r = await backend.execute('python3 -c "while True: pass"')
        expect(r.exitCode).toBe(137)
        expect(r.output).toMatch(/SIGKILL after grace window/)
        expect(r.output).toContain('stuck-in-tight-loop')
    })

    it('maps host-side throws (daemon errors) to exitCode=null', async () => {
        const { backend } = makeBackend({
            execHandler: async () => {
                throw new Error('docker daemon hung up')
            }
        })
        const r = await backend.execute('echo hi')
        expect(r.exitCode).toBeNull()
        expect(r.output).toContain('docker daemon hung up')
    })

    it('clamps oversized output and sets truncated=true', async () => {
        const { backend } = makeBackend({ execHandler: async () => okExec('A'.repeat(5000), '', 0) }, { maxOutputBytes: 100 })
        const r = await backend.execute('foo')
        expect(r.output.length).toBe(100)
        expect(r.truncated).toBe(true)
    })

    it('wraps the user command in /usr/bin/timeout and bash -lc, with uid 1000 and workdir /home/user', async () => {
        const { backend, client } = makeBackend({}, { commandTimeoutMs: 30_000 })
        await backend.execute('printf hi')
        const call = client.lastContainer?.execCalls[0]
        // [ '/usr/bin/timeout', '--foreground', '-s', 'TERM', '-k', '2',
        //   '30', 'bash', '-lc', 'printf hi' ]
        expect(call?.[0]).toBe('/usr/bin/timeout')
        expect(call?.[1]).toBe('--foreground')
        expect(call).toEqual(expect.arrayContaining(['-s', 'TERM', '-k', '2']))
        // Seconds == ceil(commandTimeoutMs / 1000).
        expect(call?.[6]).toBe('30')
        expect(call?.[7]).toBe('bash')
        expect(call?.[8]).toBe('-lc')
        expect(call?.[9]).toBe('printf hi')
    })

    it('passes a longer host-side timeout to runExec than the in-container budget (safety margin)', async () => {
        const { backend, client } = makeBackend({ execHandler: async () => okExec('ok', '', 0) }, { commandTimeoutMs: 7_500 })
        await backend.execute('echo hi')
        const opts = client.lastContainer?.execCallOpts[0]
        // 7500 ms command budget + 5000 ms HOST_SAFETY_MARGIN_MS.
        expect(opts?.timeoutMs).toBe(12_500)
    })
})

describe('DockerBackend file transfer', () => {
    it('uploadFiles proxies to container.putFiles', async () => {
        const { backend } = makeBackend()
        const r = await backend.uploadFiles([
            ['/home/user/a.txt', new Uint8Array(Buffer.from('hello'))],
            ['/home/user/sub/b.txt', new Uint8Array(Buffer.from('world'))]
        ])
        expect(r).toHaveLength(2)
        expect(r.every((x) => x.error === null)).toBe(true)
    })

    it('downloadFiles preserves partial-success outcomes', async () => {
        const { backend } = makeBackend({
            getHandler: async (paths) =>
                paths.map((p) =>
                    p === '/missing'
                        ? { path: p, content: null, error: 'file_not_found' as const }
                        : { path: p, content: new Uint8Array(Buffer.from(`bytes:${p}`)), error: null }
                )
        })
        const r = await backend.downloadFiles(['/ok', '/missing'])
        expect(r).toHaveLength(2)
        expect(r[0].error).toBeNull()
        expect(r[1].error).toBe('file_not_found')
        expect(r[1].content).toBeNull()
    })

    it('uploadFiles after close surfaces io_error envelopes', async () => {
        const { backend } = makeBackend()
        await backend.initialize()
        await backend.close()
        const r = await backend.uploadFiles([['/home/user/foo', new Uint8Array(Buffer.from('x'))]])
        expect(r[0].error).toBe('io_error')
    })
})

describe('DockerBackend lifecycle', () => {
    it('close removes the underlying container and rejects subsequent calls', async () => {
        const { backend, client } = makeBackend()
        await backend.initialize()
        await backend.close()
        expect(client.lastContainer?.removed).toBe(true)
        const r = await backend.execute('echo hi')
        expect(r.exitCode).toBeNull()
        expect(r.output).toMatch(/closed/)
    })

    it('idle timer closes the backend after the configured window', async () => {
        jest.useFakeTimers()
        try {
            const { backend, client } = makeBackend({}, { idleMs: 50 })
            await backend.initialize()
            jest.advanceTimersByTime(75)
            // Flush microtasks so the timer's `.close()` resolves.
            await Promise.resolve()
            await Promise.resolve()
            expect(client.lastContainer?.removed).toBe(true)
            expect(backend.isRunning).toBe(false)
        } finally {
            jest.useRealTimers()
        }
    })

    it('mutex serializes concurrent execute() calls', async () => {
        let inFlight = 0
        let maxConcurrent = 0
        const { backend } = makeBackend({
            execHandler: async () => {
                inFlight += 1
                maxConcurrent = Math.max(maxConcurrent, inFlight)
                await new Promise((r) => setTimeout(r, 10))
                inFlight -= 1
                return okExec()
            }
        })
        await Promise.all([backend.execute('a'), backend.execute('b'), backend.execute('c')])
        expect(maxConcurrent).toBe(1)
    })
})
