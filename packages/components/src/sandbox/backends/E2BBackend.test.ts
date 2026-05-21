/**
 * E2BBackend — unit tests that mock @e2b/code-interpreter so we can
 * exercise the SDK mapping without booting a real VM.
 */

jest.mock('@e2b/code-interpreter', () => ({
    Sandbox: { create: jest.fn() }
}))

import { E2BBackend } from './E2BBackend'
import { isSandboxBackend } from '../isSandboxBackend'

const makeFakeSandbox = (overrides?: {
    run?: (
        cmd: string,
        opts?: unknown
    ) => Promise<{ stdout?: string; stderr?: string; exitCode?: number }> | { stdout?: string; stderr?: string; exitCode?: number }
    runThrows?: unknown
    write?: jest.Mock
    read?: jest.Mock
}) => {
    const write = overrides?.write ?? jest.fn(async () => undefined)
    const read = overrides?.read ?? jest.fn(async (p: string) => new Uint8Array(Buffer.from(`bytes:${p}`, 'utf8')))
    const run = jest.fn(async (cmd: string, opts?: unknown) => {
        if (overrides?.runThrows !== undefined) throw overrides.runThrows
        const r = overrides?.run ? await overrides.run(cmd, opts) : { stdout: 'ok', stderr: '', exitCode: 0 }
        return r
    })
    const kill = jest.fn(async () => undefined)
    return {
        files: { write, read },
        commands: { run },
        kill,
        _spies: { write, read, run, kill }
    }
}

describe('E2BBackend — protocol contract', () => {
    it('satisfies isSandboxBackend before initialize() is called', () => {
        const backend = new E2BBackend({ apiKey: 'k', createSandbox: async () => ({} as any) })
        expect(isSandboxBackend(backend)).toBe(true)
        expect(backend.id).toMatch(/^e2b-/)
    })

    it('lazily boots through createSandbox and adopts the sandbox id', async () => {
        const sbx = Object.assign(makeFakeSandbox(), { sandboxID: 'sbx-abc' })
        const createSandbox = jest.fn(async () => sbx as any)
        const backend = new E2BBackend({ apiKey: 'k', createSandbox })
        await backend.initialize()
        expect(createSandbox).toHaveBeenCalledTimes(1)
        expect(backend.id).toBe('e2b-sbx-abc')
    })

    it('shares one initialize() promise across concurrent callers', async () => {
        const sbx = makeFakeSandbox()
        const createSandbox = jest.fn(async () => sbx as any)
        const backend = new E2BBackend({ apiKey: 'k', createSandbox })
        await Promise.all([backend.initialize(), backend.initialize(), backend.initialize()])
        expect(createSandbox).toHaveBeenCalledTimes(1)
    })

    it('execute maps a clean CommandResult to ExecuteResponse', async () => {
        const sbx = makeFakeSandbox({ run: async () => ({ stdout: 'hello', stderr: '', exitCode: 0 }) })
        const backend = new E2BBackend({ apiKey: 'k', createSandbox: async () => sbx as any })
        const r = await backend.execute('echo hello')
        expect(r.output).toBe('hello')
        expect(r.exitCode).toBe(0)
        expect(r.truncated).toBe(false)
    })

    it('execute treats a CommandExitError-shaped throw as a guest exit', async () => {
        const sbx = makeFakeSandbox({ runThrows: { stdout: 'partial', stderr: 'oops', exitCode: 2 } })
        const backend = new E2BBackend({ apiKey: 'k', createSandbox: async () => sbx as any })
        const r = await backend.execute('foo')
        expect(r.exitCode).toBe(2)
        expect(r.output).toContain('partial')
        expect(r.output).toContain('oops')
    })

    it('execute maps a host-side throw to exitCode=null', async () => {
        const sbx = makeFakeSandbox({ runThrows: new Error('request timed out') })
        const backend = new E2BBackend({ apiKey: 'k', createSandbox: async () => sbx as any })
        const r = await backend.execute('foo')
        expect(r.exitCode).toBeNull()
        expect(r.output).toContain('request timed out')
    })

    it('execute combines stdout+stderr into a single output stream', async () => {
        const sbx = makeFakeSandbox({ run: async () => ({ stdout: 'OUT', stderr: 'ERR', exitCode: 1 }) })
        const backend = new E2BBackend({ apiKey: 'k', createSandbox: async () => sbx as any })
        const r = await backend.execute('foo')
        expect(r.output).toBe('OUT\nERR')
        expect(r.exitCode).toBe(1)
    })

    it('execute clamps oversized output and sets truncated=true', async () => {
        const sbx = makeFakeSandbox({ run: async () => ({ stdout: 'A'.repeat(5000), stderr: '', exitCode: 0 }) })
        const backend = new E2BBackend({ apiKey: 'k', maxOutputBytes: 100, createSandbox: async () => sbx as any })
        const r = await backend.execute('foo')
        expect(r.output.length).toBe(100)
        expect(r.truncated).toBe(true)
    })

    it('uploadFiles pre-creates parent dirs and proxies the bulk write', async () => {
        const sbx = makeFakeSandbox()
        const backend = new E2BBackend({ apiKey: 'k', createSandbox: async () => sbx as any })
        const r = await backend.uploadFiles([
            ['/home/user/a.txt', new Uint8Array(Buffer.from('hello'))],
            ['/home/user/sub/b.txt', new Uint8Array(Buffer.from('world'))]
        ])
        expect(r.every((x) => x.error === null)).toBe(true)
        // First call is the mkdir -p; second is the bulk write.
        const cmds = sbx._spies.run.mock.calls.map((c) => c[0] as string)
        expect(cmds.some((c) => c.startsWith('mkdir -p'))).toBe(true)
        expect(sbx._spies.write).toHaveBeenCalledTimes(1)
    })

    it('downloadFiles preserves partial-success outcomes', async () => {
        const read = jest.fn(async (p: string) => {
            if (p === '/missing') throw new Error('No such file')
            return new Uint8Array(Buffer.from(`bytes:${p}`, 'utf8'))
        })
        const sbx = makeFakeSandbox({ read })
        const backend = new E2BBackend({ apiKey: 'k', createSandbox: async () => sbx as any })
        const r = await backend.downloadFiles(['/ok', '/missing'])
        expect(r).toHaveLength(2)
        expect(r[0].error).toBeNull()
        expect(r[1].error).toBe('file_not_found')
        expect(r[1].content).toBeNull()
    })

    it('close kills the underlying sandbox and prevents subsequent execute calls', async () => {
        const sbx = makeFakeSandbox()
        const backend = new E2BBackend({ apiKey: 'k', createSandbox: async () => sbx as any })
        await backend.initialize()
        await backend.close()
        expect(sbx._spies.kill).toHaveBeenCalledTimes(1)
        await expect(backend.execute('echo')).rejects.toThrow(/closed/)
    })
})
