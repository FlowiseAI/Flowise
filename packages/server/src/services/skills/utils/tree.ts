import { SkillFileTree, SkillKind, SkillTreeNode } from '../entities'

/**
 * Pure in-memory helpers for `SkillFileTree`. No I/O, no DB — just data.
 */

/** Map extension → kind. */
export const classifyKind = (extension: string): SkillKind => {
    const ext = extension.trim().toLowerCase()
    if (ext === 'md' || ext === 'markdown') return 'skill'
    if (['py', 'js', 'ts', 'tsx', 'jsx', 'mjs', 'sh', 'bash', 'rb', 'go', 'java', 'kt', 'rs', 'cpp', 'c', 'h', 'hpp'].includes(ext))
        return 'code'
    if (['txt', 'json', 'csv', 'tsv', 'yaml', 'yml', 'xml', 'html', 'log'].includes(ext)) return 'data'
    if (ext === '') return 'data'
    return 'binary'
}

/** Guess a text mime type for a `data`/`code` file for storage metadata. */
export const guessMime = (extension: string): string => {
    const ext = extension.trim().toLowerCase()
    if (ext === 'md' || ext === 'markdown') return 'text/markdown'
    if (ext === 'json') return 'application/json'
    if (ext === 'csv') return 'text/csv'
    if (ext === 'yaml' || ext === 'yml') return 'application/yaml'
    if (ext === 'html' || ext === 'htm') return 'text/html'
    if (['js', 'ts', 'tsx', 'jsx', 'mjs'].includes(ext)) return 'application/javascript'
    if (ext === 'py') return 'text/x-python'
    if (ext === 'kt') return 'text/x-kotlin'
    if (ext === 'sh' || ext === 'bash') return 'application/x-sh'
    if (ext === 'h' || ext === 'hpp' || ext === 'cpp' || ext === 'c') return 'text/x-csrc'
    if (ext === 'txt' || ext === 'log' || ext === '') return 'text/plain'
    if (ext === 'pdf') return 'application/pdf'
    if (ext === 'png') return 'image/png'
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
    if (ext === 'gif') return 'image/gif'
    if (ext === 'webp') return 'image/webp'
    return 'application/octet-stream'
}

/** Build a lookup table for O(1) id → node access. */
export const buildIndex = (tree: SkillFileTree): Map<string, SkillTreeNode> => {
    const map = new Map<string, SkillTreeNode>()
    for (const n of tree.nodes) map.set(n.id, n)
    return map
}

/** Compute the absolute path (no leading slash) for a node from its parent chain. */
export const computePath = (nodeId: string, index: Map<string, SkillTreeNode>): string => {
    const segments: string[] = []
    let current: SkillTreeNode | undefined = index.get(nodeId)
    const visited = new Set<string>()
    while (current) {
        if (visited.has(current.id)) throw new Error(`Cycle detected at node ${current.id}`)
        visited.add(current.id)
        segments.unshift(current.name)
        if (current.parent_id === null) break
        current = index.get(current.parent_id)
    }
    return segments.join('/')
}

/** Relative path from `fromNodeId` to `toNodeId`. */
export const computeRelativePath = (fromNodeId: string, toNodeId: string, index: Map<string, SkillTreeNode>): string => {
    const from = index.get(fromNodeId)
    const to = index.get(toNodeId)
    if (!from || !to) throw new Error(`Node not found: ${!from ? fromNodeId : toNodeId}`)

    const fromDirChain = ancestorChain(from.parent_id, index)
    const toChain = ancestorChain(to.id, index)

    let i = 0
    while (i < fromDirChain.length && i < toChain.length - 1 && fromDirChain[i] === toChain[i]) {
        i++
    }

    const up = fromDirChain.length - i
    const down = toChain.slice(i).map((id) => index.get(id)!.name)
    const parts: string[] = []
    for (let k = 0; k < up; k++) parts.push('..')
    parts.push(...down)
    const joined = parts.join('/')
    // Conventional leading `./` for same-folder siblings
    if (up === 0 && down.length === 1) return `./${down[0]}`
    return joined || './'
}

/** Ancestor chain from root → node (inclusive), by node id. */
const ancestorChain = (nodeId: string | null, index: Map<string, SkillTreeNode>): string[] => {
    const chain: string[] = []
    let cur = nodeId
    const seen = new Set<string>()
    while (cur) {
        if (seen.has(cur)) throw new Error(`Cycle detected in ancestor chain at ${cur}`)
        seen.add(cur)
        chain.unshift(cur)
        const node = index.get(cur)
        if (!node) break
        cur = node.parent_id
    }
    return chain
}

/** Detect whether adding/updating a parent link would introduce a cycle. */
export const wouldCreateCycle = (nodeId: string, newParentId: string | null, index: Map<string, SkillTreeNode>): boolean => {
    if (newParentId === null) return false
    if (newParentId === nodeId) return true
    let cur: string | null = newParentId
    const seen = new Set<string>()
    while (cur) {
        if (cur === nodeId) return true
        if (seen.has(cur)) return true
        seen.add(cur)
        cur = index.get(cur)?.parent_id ?? null
    }
    return false
}

/** Return every descendant id of `nodeId` (not including itself). */
export const descendantsOf = (nodeId: string, tree: SkillFileTree): string[] => {
    const out: string[] = []
    const stack = [nodeId]
    while (stack.length) {
        const cur = stack.pop()!
        for (const n of tree.nodes) {
            if (n.parent_id === cur) {
                out.push(n.id)
                stack.push(n.id)
            }
        }
    }
    return out
}

/** Runtime invariant check for the whole tree. Throws on first violation. */
export const assertValidTree = (tree: SkillFileTree): void => {
    const index = buildIndex(tree)
    for (const node of tree.nodes) {
        if (!node.id) throw new Error(`Tree node missing id`)
        if (node.node_type !== 'file' && node.node_type !== 'folder') {
            throw new Error(`Tree node ${node.id} has invalid node_type: ${node.node_type}`)
        }
        if (node.parent_id !== null) {
            const parent = index.get(node.parent_id)
            if (!parent) throw new Error(`Tree node ${node.id} references missing parent ${node.parent_id}`)
            if (parent.node_type !== 'folder') {
                throw new Error(`Tree node ${node.id} parent ${parent.id} is not a folder`)
            }
        }
    }
    for (const node of tree.nodes) {
        // Triggers a cycle check via ancestorChain.
        ancestorChain(node.id, index)
    }
}

/** Parse fileTree JSON from a persisted column (defaults to empty). */
export const parseFileTree = (json: string | null | undefined): SkillFileTree => {
    if (!json) return { nodes: [] }
    try {
        const parsed = JSON.parse(json)
        if (!parsed || !Array.isArray(parsed.nodes)) return { nodes: [] }
        return parsed as SkillFileTree
    } catch {
        return { nodes: [] }
    }
}

/** Serialize fileTree for persistence — keys canonicalized for stable hashing. */
export const serializeFileTree = (tree: SkillFileTree): string => {
    const sorted = tree.nodes
        .slice()
        .sort((a, b) => (a.parent_id ?? '').localeCompare(b.parent_id ?? '') || a.order - b.order || a.name.localeCompare(b.name))
    return JSON.stringify({ nodes: sorted })
}
