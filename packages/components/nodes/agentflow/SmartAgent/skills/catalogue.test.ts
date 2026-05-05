import { formatSkillsCatalogue } from './catalogue'
import { SkillMetadata } from './types'

const sk = (over: Partial<SkillMetadata>): SkillMetadata => ({
    name: 'x',
    description: 'd',
    sourcePath: '/skills/builtin/',
    skillPath: '/skills/builtin/x/SKILL.md',
    ...over
})

describe('formatSkillsCatalogue', () => {
    it('returns empty string when no skills', () => {
        expect(formatSkillsCatalogue([])).toBe('')
    })

    it('formats a single skill with name, description, and read path', () => {
        const out = formatSkillsCatalogue([sk({ name: 'web-research', description: 'Research workflow' })])
        expect(out).toContain('## Skills')
        expect(out).toContain('**web-research**: Research workflow')
        expect(out).toContain("→ Read '/skills/builtin/x/SKILL.md' for full instructions")
    })

    it('renders allowed-tools line when present', () => {
        const out = formatSkillsCatalogue([sk({ allowedTools: ['search_web', 'fetch_url'] })])
        expect(out).toContain('Allowed tools: search_web, fetch_url')
    })

    it('renders multiple skills as a bulleted list', () => {
        const out = formatSkillsCatalogue([sk({ name: 'a', description: 'one' }), sk({ name: 'b', description: 'two' })])
        expect(out).toMatch(/\*\*a\*\*: one[\s\S]*\*\*b\*\*: two/)
    })
})
