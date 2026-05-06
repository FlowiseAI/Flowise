import { setupSkills } from './setup'
import { StateBackend } from '../sandbox/backends/StateBackend'

const SKILL_BUILTIN = `---\nname: web-research\ndescription: builtin\n---\nbody`

const makeBuiltin = async () => {
    const b = new StateBackend()
    await b.write('/web-research/SKILL.md', SKILL_BUILTIN)
    return b
}

describe('setupSkills', () => {
    it('discovers built-in skills through the composite mount', async () => {
        const builtin = await makeBuiltin()
        const result = await setupSkills({
            stateBackend: new StateBackend(),
            builtin,
            disabled: new Set()
        })
        expect(result.cacheHit).toBe(false)
        expect(result.skills.map((s) => s.name)).toEqual(['web-research'])
        expect(result.skills[0].skillPath).toBe('/skills/builtin/web-research/SKILL.md')
    })

    it('filters disabled built-ins', async () => {
        const builtin = await makeBuiltin()
        const result = await setupSkills({
            stateBackend: new StateBackend(),
            builtin,
            disabled: new Set(['web-research'])
        })
        expect(result.skills).toEqual([])
    })

    it('reuses cached metadata on hash match', async () => {
        const builtin = await makeBuiltin()
        const runtimeState: any = {}

        const first = await setupSkills({
            stateBackend: new StateBackend(),
            builtin,
            disabled: new Set(),
            runtimeState
        })
        expect(first.cacheHit).toBe(false)
        expect(runtimeState.skills?.metadata).toEqual(first.skills)

        // Second call with same args: should be a hit and skip discovery.
        const lsSpy = jest.spyOn(builtin, 'ls')
        const second = await setupSkills({
            stateBackend: new StateBackend(),
            builtin,
            disabled: new Set(),
            runtimeState
        })
        expect(second.cacheHit).toBe(true)
        expect(second.skills).toEqual(first.skills)
        expect(lsSpy).not.toHaveBeenCalled()
    })

    it('invalidates cache when disabled set changes', async () => {
        const builtin = await makeBuiltin()
        const runtimeState: any = {}

        await setupSkills({ stateBackend: new StateBackend(), builtin, disabled: new Set(), runtimeState })
        const second = await setupSkills({
            stateBackend: new StateBackend(),
            builtin,
            disabled: new Set(['web-research']),
            runtimeState
        })
        expect(second.cacheHit).toBe(false)
        expect(second.skills).toEqual([])
    })

    it('routes /skills/builtin/* writes to the built-in backend', async () => {
        const builtin = await makeBuiltin()
        const writeSpy = jest.spyOn(builtin, 'write')
        const result = await setupSkills({
            stateBackend: new StateBackend(),
            builtin,
            disabled: new Set()
        })
        await result.composite.write('/skills/builtin/new.md', 'x')
        expect(writeSpy).toHaveBeenCalled()
    })
})
