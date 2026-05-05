import { discoverSkills } from './loader'
import { StateBackend } from '../sandbox/backends/StateBackend'
import { BackendProtocol, LsResult } from '../sandbox/BackendProtocol'

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

describe('discoverSkills — disabled built-ins', () => {
    it('filters out disabled built-in skill names', async () => {
        const backend = new StateBackend()
        await backend.write('/skills/builtin/a/SKILL.md', `---\nname: a\ndescription: x\n---\n`)
        await backend.write('/skills/builtin/b/SKILL.md', `---\nname: b\ndescription: y\n---\n`)

        const { skills } = await discoverSkills(backend, [{ path: '/skills/builtin/', label: 'builtin' }], new Set(['a']))

        expect(skills.map((s) => s.name)).toEqual(['b'])
    })

    it('does not filter user skills sharing names with disabled built-ins', async () => {
        const backend = new StateBackend()
        await backend.write('/skills/builtin/a/SKILL.md', `---\nname: a\ndescription: builtin\n---\n`)
        await backend.write('/skills/user/a/SKILL.md', `---\nname: a\ndescription: user\n---\n`)

        const { skills } = await discoverSkills(
            backend,
            [
                { path: '/skills/builtin/', label: 'builtin' },
                { path: '/skills/user/', label: 'user' }
            ],
            new Set(['a'])
        )

        expect(skills).toHaveLength(1)
        expect(skills[0].description).toBe('user')
    })
})

describe('discoverSkills — error handling', () => {
    it('skips malformed SKILL.md and emits a warning', async () => {
        const backend = new StateBackend()
        await backend.write('/skills/builtin/good/SKILL.md', `---\nname: good\ndescription: ok\n---\n`)
        await backend.write('/skills/builtin/bad/SKILL.md', `not even close to a SKILL file`)

        const { skills, warnings } = await discoverSkills(backend, [{ path: '/skills/builtin/', label: 'builtin' }])

        expect(skills.map((s) => s.name)).toEqual(['good'])
        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toMatch(/skills\/builtin\/bad\/SKILL\.md/)
    })

    it('emits a warning when ls returns an error', async () => {
        // StateBackend returns {files: []} for unknown paths rather than an error,
        // so we use a stub backend to exercise the ls-error branch.
        const stub: Pick<BackendProtocol, 'ls'> = {
            async ls(): Promise<LsResult> {
                return { error: 'ENOENT: no such directory' }
            }
        }
        const { skills, warnings } = await discoverSkills(stub as BackendProtocol, [{ path: '/no/such/path/', label: 'missing' }])
        expect(skills).toEqual([])
        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toMatch(/missing/)
        expect(warnings[0]).toMatch(/ENOENT/)
    })

    it('skips subdirectories without a SKILL.md', async () => {
        const backend = new StateBackend()
        await backend.write('/skills/builtin/with-skill/SKILL.md', `---\nname: x\ndescription: y\n---\n`)
        await backend.write('/skills/builtin/no-skill/README.md', `# nothing here`)

        const { skills, warnings } = await discoverSkills(backend, [{ path: '/skills/builtin/', label: 'builtin' }])
        expect(skills.map((s) => s.name)).toEqual(['x'])
        expect(warnings.some((w) => w.includes('no-skill'))).toBe(true)
    })
})
