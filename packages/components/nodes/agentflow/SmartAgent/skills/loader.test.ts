import { discoverSkills } from './loader'
import { StateBackend } from '../sandbox/backends/StateBackend'

const SKILL_A = `---\nname: web-research\ndescription: Research workflow\n---\n# body`

describe('discoverSkills — single source', () => {
    it('discovers one skill under a single source', async () => {
        const backend = new StateBackend()
        await backend.write('/skills/builtin/web-research/SKILL.md', SKILL_A)

        const { skills, warnings } = await discoverSkills(backend, [{ path: '/skills/builtin/', label: 'builtin' }])

        expect(warnings).toEqual([])
        expect(skills).toHaveLength(1)
        expect(skills[0].name).toBe('web-research')
        expect(skills[0].description).toBe('Research workflow')
        expect(skills[0].sourcePath).toBe('/skills/builtin/')
        expect(skills[0].skillPath).toBe('/skills/builtin/web-research/SKILL.md')
    })

    it('returns empty list for an empty source', async () => {
        const backend = new StateBackend()
        const { skills, warnings } = await discoverSkills(backend, [{ path: '/skills/builtin/', label: 'builtin' }])
        expect(skills).toEqual([])
        expect(warnings).toEqual([])
    })
})

describe('discoverSkills — multi-source dedup', () => {
    it('later source wins on name collision', async () => {
        const backend = new StateBackend()
        await backend.write(
            '/skills/builtin/code-review/SKILL.md',
            `---\nname: code-review\ndescription: builtin version\n---\nbuiltin body`
        )
        await backend.write('/skills/user/code-review/SKILL.md', `---\nname: code-review\ndescription: user override\n---\nuser body`)

        const { skills } = await discoverSkills(backend, [
            { path: '/skills/builtin/', label: 'builtin' },
            { path: '/skills/user/', label: 'user' }
        ])

        expect(skills).toHaveLength(1)
        expect(skills[0].description).toBe('user override')
        expect(skills[0].sourcePath).toBe('/skills/user/')
    })

    it('aggregates non-conflicting skills across sources', async () => {
        const backend = new StateBackend()
        await backend.write('/skills/builtin/a/SKILL.md', `---\nname: a\ndescription: x\n---\n`)
        await backend.write('/skills/user/b/SKILL.md', `---\nname: b\ndescription: y\n---\n`)

        const { skills } = await discoverSkills(backend, [
            { path: '/skills/builtin/', label: 'builtin' },
            { path: '/skills/user/', label: 'user' }
        ])

        expect(skills.map((s) => s.name).sort()).toEqual(['a', 'b'])
    })
})
