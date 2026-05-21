import { SkillBundle, ToolDependency, ToolReference } from '../entities'

/**
 * Derive the flat tool-access policy from one or more entries of a SkillBundle.
 *
 * Used by `SkillTool` to:
 *   - advertise the allowed tool list inside the resolved prompt ("You may also use: …"),
 *   - (optionally) filter the chatflow's tool array down to just the allowed tools.
 *
 * Pure function, no I/O.
 */

export interface ToolAccessPolicy {
    dependencies: ToolDependency[]
    references: ToolReference[]
    allowedKeys: Set<string>
}

const depKey = (d: ToolDependency): string => `${d.type}::${d.provider}::${d.toolName}`
const refKey = (r: ToolReference): string => `${r.type}::${r.provider}::${r.toolName}::${r.uuid}`

export const derivePolicy = (bundle: SkillBundle, nodeIds?: string[]): ToolAccessPolicy => {
    const ids = nodeIds && nodeIds.length ? nodeIds : Object.keys(bundle.entries)

    const depMap = new Map<string, ToolDependency>()
    const refMap = new Map<string, ToolReference>()

    for (const id of ids) {
        const entry = bundle.entries[id]
        if (!entry) continue
        for (const d of entry.tools.dependencies) depMap.set(depKey(d), d)
        for (const r of entry.tools.references) refMap.set(refKey(r), r)
    }

    return {
        dependencies: Array.from(depMap.values()),
        references: Array.from(refMap.values()),
        allowedKeys: new Set(depMap.keys())
    }
}

/** Match an unknown tool against the policy's canonical (type, provider, toolName) set. */
export const isAllowed = (policy: ToolAccessPolicy, tool: ToolDependency): boolean => policy.allowedKeys.has(depKey(tool))
