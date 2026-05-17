/**
 * ExecuteTool — Layer 4 contract tests.
 *
 * These cover the exact text envelope the architecture mandates in
 * §6.1, plus the back-compat env switches for the legacy JSON envelope
 * and tool-name. The session is mocked so no backend is required.
 */

import { CommandRunResult, SandboxSession } from './SandboxSession'
import { ExecuteTool, formatExecuteResponse } from './ExecuteTool'

const makeRun = (overrides: Partial<CommandRunResult>): CommandRunResult => ({
    ok: true,
    stdout: '',
    stderr: '',
    exitCode: 0,
    durationMs: 5,
    ...overrides
})

const makeSession = (run: CommandRunResult): SandboxSession => {
    const fake = {
        exec: jest.fn(async () => run),
        backendId: 'fake'
    }
    return fake as unknown as SandboxSession
}

describe('formatExecuteResponse — architecture §6.1 contract', () => {
    it('renders a clean success envelope', () => {
        const out = formatExecuteResponse('hello world', 0, false)
        expect(out).toBe('hello world\n\n[Command succeeded with exit code 0]')
    })

    it('renders a non-zero exit envelope', () => {
        const out = formatExecuteResponse('boom', 2, false)
        expect(out).toContain('[Command failed with exit code 2]')
        expect(out.startsWith('boom')).toBe(true)
    })

    it('appends a truncation marker when truncated=true', () => {
        const out = formatExecuteResponse('A'.repeat(100), 0, true)
        expect(out).toMatch(/\[Command succeeded with exit code 0\]\n\[Output was truncated due to size limits\]$/)
    })

    it('renders a killed envelope when exitCode=null', () => {
        const out = formatExecuteResponse('partial output', null, false)
        expect(out).toContain('[Command killed before reporting an exit code]')
    })

    it('NEVER emits JSON in the new envelope', () => {
        const out = formatExecuteResponse('hello', 0, false)
        expect(() => JSON.parse(out)).toThrow()
    })
})

describe('ExecuteTool._call — text envelope', () => {
    afterEach(() => {
        delete process.env.SKILL_LEGACY_BASH_ENVELOPE
    })

    it('returns the architecture envelope by default', async () => {
        const tool = new ExecuteTool({
            name: 'bash_test',
            description: '',
            session: makeSession(makeRun({ stdout: 'hello', exitCode: 0 }))
        })
        const out = await tool.invoke({ command: 'echo hello' })
        expect(out).toBe('hello\n\n[Command succeeded with exit code 0]')
    })

    it('reports failure with the failed marker', async () => {
        const tool = new ExecuteTool({
            name: 'bash_test',
            description: '',
            session: makeSession(makeRun({ ok: false, stdout: 'boom', exitCode: 1 }))
        })
        const out = await tool.invoke({ command: 'false' })
        expect(out).toContain('[Command failed with exit code 1]')
    })

    it('reports a missing-command path without throwing', async () => {
        const tool = new ExecuteTool({
            name: 'bash_test',
            description: '',
            session: makeSession(makeRun({}))
        })
        const out = await tool.invoke({ command: '   ' })
        expect(out).toContain('[Command failed with exit code 1 — missing "command" argument]')
    })

    it('surfaces truncation through the marker line', async () => {
        const tool = new ExecuteTool({
            name: 'bash_test',
            description: '',
            session: makeSession(makeRun({ stdout: 'A'.repeat(50), stderr: '[Output was truncated due to size limits]', exitCode: 0 }))
        })
        const out = await tool.invoke({ command: 'foo' })
        expect(out).toContain('[Output was truncated due to size limits]')
    })

    it('emits the legacy JSON envelope when SKILL_LEGACY_BASH_ENVELOPE=true', async () => {
        process.env.SKILL_LEGACY_BASH_ENVELOPE = 'true'
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        try {
            const tool = new ExecuteTool({
                name: 'bash_test',
                description: '',
                session: makeSession(makeRun({ stdout: 'hi', exitCode: 0 })),
                engineLabel: 'e2b-bash'
            })
            const out = await tool.invoke({ command: 'echo hi' })
            const parsed = JSON.parse(out)
            expect(parsed.status).toBe('ok')
            expect(parsed.stdout).toBe('hi')
            expect(parsed.exitCode).toBe(0)
            expect(parsed.engine).toBe('e2b-bash')
            expect(parsed.durationMs).toBeGreaterThanOrEqual(0)
        } finally {
            warn.mockRestore()
        }
    })

    it('legacy envelope surfaces error.kind for guest non-zero exits', async () => {
        process.env.SKILL_LEGACY_BASH_ENVELOPE = 'true'
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        try {
            const tool = new ExecuteTool({
                name: 'bash_test',
                description: '',
                session: makeSession(makeRun({ ok: false, stdout: 'boom', exitCode: 1 }))
            })
            const out = await tool.invoke({ command: 'false' })
            const parsed = JSON.parse(out)
            expect(parsed.status).toBe('error')
            expect(parsed.error.kind).toBe('runtime')
        } finally {
            warn.mockRestore()
        }
    })
})
