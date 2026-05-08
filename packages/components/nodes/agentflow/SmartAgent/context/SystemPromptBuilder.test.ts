import { buildSystemPrompt } from './SystemPromptBuilder'

describe('buildSystemPrompt — executeEnabled gate', () => {
    const baseOpts = {
        todoListPrompt: '## TODOS_PLACEHOLDER',
        filesystemEnabled: true
    }

    it('omits the Execute Tool block when executeEnabled is false', () => {
        const prompt = buildSystemPrompt({ ...baseOpts, executeEnabled: false })
        expect(prompt).not.toContain('## Execute Tool')
    })

    it('omits the Execute Tool block when executeEnabled is undefined', () => {
        const prompt = buildSystemPrompt({ ...baseOpts })
        expect(prompt).not.toContain('## Execute Tool')
    })

    it('includes the Execute Tool block when executeEnabled is true', () => {
        const prompt = buildSystemPrompt({ ...baseOpts, executeEnabled: true })
        expect(prompt).toContain('## Execute Tool')
    })

    it('orders Filesystem Tools before Execute Tool when both are enabled', () => {
        const prompt = buildSystemPrompt({ ...baseOpts, executeEnabled: true })
        const fsIdx = prompt.indexOf('## Filesystem Tools')
        const execIdx = prompt.indexOf('## Execute Tool')
        expect(fsIdx).toBeGreaterThan(-1)
        expect(execIdx).toBeGreaterThan(-1)
        expect(fsIdx).toBeLessThan(execIdx)
    })
})
