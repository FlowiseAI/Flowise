import { ICommonObject } from '../../../../src/Interface'
import { BackendProtocol } from '../sandbox/BackendProtocol'
import { CompositeBackend } from '../sandbox/backends/CompositeBackend'
import { discoverSkills } from './loader'
import { SkillMetadata, SkillSource } from './types'

export interface SetupSkillsArgs {
    stateBackend: BackendProtocol
    builtin: BackendProtocol
    userMounts?: Record<string, BackendProtocol>
    userSources?: SkillSource[]
    disabled: Set<string>
    runtimeState?: ICommonObject
}

export interface SetupSkillsResult {
    composite: BackendProtocol
    skills: SkillMetadata[]
    warnings: string[]
    cacheHit: boolean
}

interface CachedSkills {
    hash: string
    metadata: SkillMetadata[]
}

const BUILTIN_MOUNT = '/skills/builtin/'

export async function setupSkills(args: SetupSkillsArgs): Promise<SetupSkillsResult> {
    const userMounts = args.userMounts ?? {}
    const userSources = args.userSources ?? []

    const composite = new CompositeBackend(args.stateBackend, {
        [BUILTIN_MOUNT]: args.builtin,
        ...userMounts
    })

    const sources: SkillSource[] = [{ path: BUILTIN_MOUNT, label: 'builtin' }, ...userSources]

    const configHash = JSON.stringify({
        disabled: [...args.disabled].sort(),
        sources: sources.map((s) => s.path).sort()
    })

    const cached = args.runtimeState?.skills as CachedSkills | undefined
    if (cached?.hash === configHash) {
        return { composite, skills: cached.metadata, warnings: [], cacheHit: true }
    }

    const result = await discoverSkills(composite, sources, args.disabled)
    if (args.runtimeState) {
        args.runtimeState.skills = { hash: configHash, metadata: result.skills }
    }
    return { composite, skills: result.skills, warnings: result.warnings, cacheHit: false }
}
