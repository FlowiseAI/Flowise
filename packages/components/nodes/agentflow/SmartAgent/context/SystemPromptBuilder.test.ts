import { buildSystemPrompt } from './SystemPromptBuilder'
import { SkillMetadata } from '../skills'

const sk: SkillMetadata = {
    name: 'web-research',
    description: 'Research workflow',
    sourcePath: '/skills/builtin/',
    skillPath: '/skills/builtin/web-research/SKILL.md'
}

describe('buildSystemPrompt — skills wiring', () => {
    it('places the skills catalogue between the todo and filesystem sections', () => {
        const out = buildSystemPrompt({
            todoListPrompt: 'TODO_PLAN',
            skills: [sk],
            filesystemEnabled: true
        })
        const todoIdx = out.indexOf('TODO_PLAN')
        const skillsIdx = out.indexOf('## Skills')
        const fsIdx = out.indexOf('## Filesystem Tools')
        expect(todoIdx).toBeGreaterThan(-1)
        expect(skillsIdx).toBeGreaterThan(todoIdx)
        expect(fsIdx).toBeGreaterThan(skillsIdx)
        expect(out).toContain('**web-research**: Research workflow')
        expect(out).toContain("Read '/skills/builtin/web-research/SKILL.md'")
    })

    it('omits the skills section when no skills supplied', () => {
        const out = buildSystemPrompt({
            todoListPrompt: 'TODO_PLAN',
            skills: undefined,
            filesystemEnabled: true
        })
        expect(out).not.toContain('## Skills')
    })

    it('omits the skills section when an empty skills array is supplied', () => {
        const out = buildSystemPrompt({
            todoListPrompt: 'x',
            skills: [],
            filesystemEnabled: true
        })
        expect(out).not.toContain('## Skills')
    })

    it('mentions the read-only skill mounts in the filesystem prompt', () => {
        const out = buildSystemPrompt({
            todoListPrompt: 'x',
            skills: [sk],
            filesystemEnabled: true
        })
        expect(out).toMatch(/\/skills\/builtin\//)
    })

    it('renders all three built-in skills in catalogue order', () => {
        const skills: SkillMetadata[] = [
            { ...sk, name: 'web-research', description: 'Research workflow', skillPath: '/skills/builtin/web-research/SKILL.md' },
            { ...sk, name: 'code-review', description: 'Checklist code review', skillPath: '/skills/builtin/code-review/SKILL.md' },
            { ...sk, name: 'todo-extract', description: 'Scan for TODO markers', skillPath: '/skills/builtin/todo-extract/SKILL.md' }
        ]
        const out = buildSystemPrompt({ todoListPrompt: 'x', skills, filesystemEnabled: true })
        expect(out.indexOf('**web-research**')).toBeLessThan(out.indexOf('**code-review**'))
        expect(out.indexOf('**code-review**')).toBeLessThan(out.indexOf('**todo-extract**'))
        for (const s of skills) {
            expect(out).toContain(`**${s.name}**: ${s.description}`)
            expect(out).toContain(`Read '${s.skillPath}'`)
        }
    })
})
