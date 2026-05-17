/**
 * Phase K — back-compat env switches.
 *
 * Locks the bridge wires that let existing chatflows survive the
 * rename / envelope change. If any of these break, the deployment guide
 * for the next release needs to be updated *before* the change ships.
 */

import { SandboxBashTool, buildBashToolDescription } from './SandboxBashTool'
import { ExecuteTool } from './ExecuteTool'

describe('SandboxBashTool re-export', () => {
    it('is the same class as ExecuteTool (single source of truth)', () => {
        expect(SandboxBashTool).toBe(ExecuteTool)
    })

    it('buildBashToolDescription is the new buildExecuteToolDescription under the hood', () => {
        const manifest: any = {
            entries: [],
            helpers: [],
            skillsDir: '/home/user/skills',
            outputDir: '/home/user/output',
            helpersDir: '/home/user/helpers'
        }
        const description = buildBashToolDescription(manifest, 'E2B (Bash session)')
        expect(description).toContain('Run a shell command inside the skill sandbox VM (engine: E2B (Bash session))')
        expect(description).toContain('No skill files were reachable')
    })
})

describe('SKILL_LEGACY_BASH_ENVELOPE — one-shot deprecation log', () => {
    afterEach(() => {
        delete process.env.SKILL_LEGACY_BASH_ENVELOPE
        jest.resetModules()
    })

    it('emits the deprecation warning exactly once per process', async () => {
        process.env.SKILL_LEGACY_BASH_ENVELOPE = 'true'
        // Import a fresh module instance so the once-per-process flag is reset.
        jest.resetModules()
        const { ExecuteTool: FreshExecuteTool } = await import('./ExecuteTool')

        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        try {
            const makeSession = () =>
                ({
                    exec: jest.fn(async () => ({ ok: true, stdout: 'hi', stderr: '', exitCode: 0, durationMs: 1 }))
                } as any)
            const tool = new FreshExecuteTool({ name: 'bash_x', description: '', session: makeSession() })
            await tool.invoke({ command: 'echo' })
            await tool.invoke({ command: 'echo' })
            await tool.invoke({ command: 'echo' })
            const lines = warn.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('SKILL_LEGACY_BASH_ENVELOPE'))
            expect(lines).toHaveLength(1)
        } finally {
            warn.mockRestore()
        }
    })
})
