import { AssetReferences, FileReference, SkillBundleEntry, ToolDependencies, ToolDependency, ToolReference } from '../entities'

/**
 * Monotonic fixed-point propagation of tool + file dependencies along skill→skill
 * edges. Non-skill nodes contribute their own `FileReference` but never tool deps.
 */
export const propagate = (entries: Record<string, SkillBundleEntry>, dependencyGraph: Record<string, string[]>): void => {
    let changed = true
    let guard = 0
    while (changed) {
        if (++guard > 10_000) break // belt-and-braces: tree size ≪ 10k in practice
        changed = false
        for (const [nodeId, deps] of Object.entries(dependencyGraph)) {
            const entry = entries[nodeId]
            if (!entry) continue
            for (const depId of deps) {
                const dep = entries[depId]
                if (!dep) continue
                if (mergeTools(entry.tools, dep.tools)) changed = true
                if (mergeFiles(entry.files, dep.files)) changed = true
            }
        }
    }
}

const toolDepKey = (d: ToolDependency): string => `${d.type}::${d.provider}::${d.toolName}`
const toolRefKey = (r: ToolReference): string => `${r.type}::${r.provider}::${r.toolName}::${r.uuid}`
const fileRefKey = (f: FileReference): string => `${f.source}::${f.nodeId}`

const mergeTools = (into: ToolDependencies, from: ToolDependencies): boolean => {
    let changed = false
    const depSet = new Set(into.dependencies.map(toolDepKey))
    for (const dep of from.dependencies) {
        if (!depSet.has(toolDepKey(dep))) {
            into.dependencies.push(dep)
            depSet.add(toolDepKey(dep))
            changed = true
        }
    }
    const refSet = new Set(into.references.map(toolRefKey))
    for (const ref of from.references) {
        if (!refSet.has(toolRefKey(ref))) {
            into.references.push(ref)
            refSet.add(toolRefKey(ref))
            changed = true
        }
    }
    return changed
}

const mergeFiles = (into: AssetReferences, from: AssetReferences): boolean => {
    let changed = false
    const set = new Set(into.references.map(fileRefKey))
    for (const ref of from.references) {
        if (!set.has(fileRefKey(ref))) {
            into.references.push(ref)
            set.add(fileRefKey(ref))
            changed = true
        }
    }
    return changed
}
