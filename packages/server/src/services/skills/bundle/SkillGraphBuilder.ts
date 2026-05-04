import { SkillBundle, SkillBundleEntry, SkillKind, ToolDependency } from '../entities'
import { BROKEN_REF_MARKER } from '../compiler/skillCompiler'

/**
 * Pure transformation of a compiled `SkillBundle` into a slim graph DTO for
 * the UI. No I/O, no caching — this is called from the service layer right
 * after a bundle is loaded.
 *
 * Node set:
 *   - one node per file-kind entry (skill/data/code/binary; folders are absent
 *     from `entries` to begin with)
 *   - one synthesized node per unique (type, provider, toolName) triple
 *     referenced anywhere in the bundle
 *
 * Edge set (directional: consumer → producer):
 *   - `file_direct`      — caller directly references target via `{{skill.<id>}}`
 *   - `file_transitive`  — caller inherits target through another skill
 *   - `tool_direct`      — caller directly references tool via `{{tool.…}}`
 *   - `tool_transitive`  — caller inherits tool through another skill
 */

export type SkillGraphNodeKind = SkillKind | 'tool'

export type SkillGraphEdgeRelation = 'file_direct' | 'file_transitive' | 'tool_direct' | 'tool_transitive'

export interface SkillGraphNodeDTO {
    id: string
    kind: SkillGraphNodeKind
    label: string
    path?: string
    toolCount?: number
    fileCount?: number
    brokenRefs?: number
}

export interface SkillGraphEdgeDTO {
    id: string
    source: string
    target: string
    relation: SkillGraphEdgeRelation
}

export interface SkillGraphDTO {
    bundleId: string
    nodes: SkillGraphNodeDTO[]
    edges: SkillGraphEdgeDTO[]
}

const toolKey = (d: Pick<ToolDependency, 'type' | 'provider' | 'toolName'>): string => `tool::${d.provider}.${d.toolName}`

const countBrokenRefs = (entry: SkillBundleEntry): number => {
    if (entry.kind !== 'skill' || !entry.content) return 0
    const matches = entry.content.match(new RegExp(escapeRegExp(BROKEN_REF_MARKER), 'g'))
    return matches ? matches.length : 0
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const buildSkillGraph = (bundle: SkillBundle): SkillGraphDTO => {
    const nodes: SkillGraphNodeDTO[] = []
    const edges: SkillGraphEdgeDTO[] = []

    // --- File nodes (one per entry) --------------------------------------
    for (const entry of Object.values(bundle.entries)) {
        const brokenRefs = countBrokenRefs(entry)
        nodes.push({
            id: entry.nodeId,
            kind: entry.kind,
            label: entry.name,
            path: entry.path,
            toolCount: entry.kind === 'skill' ? entry.tools.dependencies.length : undefined,
            fileCount: entry.kind === 'skill' ? entry.files.references.length : undefined,
            brokenRefs: brokenRefs || undefined
        })
    }

    // --- Synthesized tool nodes (dedup by provider+toolName) -------------
    const toolNodeIds = new Set<string>()
    for (const entry of Object.values(bundle.entries)) {
        for (const dep of entry.tools.dependencies) {
            const id = toolKey(dep)
            if (toolNodeIds.has(id)) continue
            toolNodeIds.add(id)
            nodes.push({
                id,
                kind: 'tool',
                label: `${dep.provider}.${dep.toolName}`
            })
        }
    }

    // --- Edges -----------------------------------------------------------
    for (const entry of Object.values(bundle.entries)) {
        if (entry.kind !== 'skill') continue

        const directFileIds = new Set((entry.directFiles || []).map((f) => f.nodeId))
        const directToolKeys = new Set((entry.directTools || []).map(toolKey))

        // File edges: skill → referenced file (any kind).
        for (const ref of entry.files.references) {
            if (!bundle.entries[ref.nodeId]) continue // target missing (shouldn't happen)
            const relation: SkillGraphEdgeRelation = directFileIds.has(ref.nodeId) ? 'file_direct' : 'file_transitive'
            edges.push({
                id: `${entry.nodeId}->${ref.nodeId}:${relation}`,
                source: entry.nodeId,
                target: ref.nodeId,
                relation
            })
        }

        // Tool edges: skill → tool.
        for (const dep of entry.tools.dependencies) {
            const targetId = toolKey(dep)
            if (!toolNodeIds.has(targetId)) continue
            const relation: SkillGraphEdgeRelation = directToolKeys.has(targetId) ? 'tool_direct' : 'tool_transitive'
            edges.push({
                id: `${entry.nodeId}->${targetId}:${relation}`,
                source: entry.nodeId,
                target: targetId,
                relation
            })
        }
    }

    return { bundleId: bundle.bundleId, nodes, edges }
}
