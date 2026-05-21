import { SKILL_ROOT_ID } from '../constants'

// All helpers operate on the wire shape produced by GET /skills/:id — a flat
// array of SkillTreeNode objects stored under `tree.nodes`:
//   Node = { id, node_type: 'folder'|'file', name, parent_id, order, extension, size }
// Parent/child relations are derived from `parent_id`; there is no materialized
// `children` array on the server side.

export const indexNodes = (nodes = []) => {
    const map = new Map()
    for (const n of nodes) map.set(n.id, n)
    return map
}

export const childrenOf = (nodes, parentId) => {
    const pid = parentId === SKILL_ROOT_ID ? null : parentId
    return nodes
        .filter((n) => (n.parent_id || null) === pid)
        .slice()
        .sort((a, b) => {
            // VS Code-style: folders first, then siblings by name
            // (case-insensitive, numeric-aware so foo2 < foo10).
            if (a.node_type !== b.node_type) return a.node_type === 'folder' ? -1 : 1
            return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
        })
}

export const pathFor = (nodes, nodeId) => {
    if (!nodeId || nodeId === SKILL_ROOT_ID) return '/'
    const map = indexNodes(nodes)
    const parts = []
    let cur = map.get(nodeId)
    let guard = 0
    while (cur && guard < 64) {
        parts.unshift(cur.name || '')
        cur = cur.parent_id ? map.get(cur.parent_id) : null
        guard += 1
    }
    return '/' + parts.join('/')
}

// Returns [ancestorIds] from root → node (excluding the node itself).
export const ancestorsOf = (nodes, nodeId) => {
    const map = indexNodes(nodes)
    const out = []
    let cur = map.get(nodeId)
    let guard = 0
    while (cur && cur.parent_id && guard < 64) {
        out.unshift(cur.parent_id)
        cur = map.get(cur.parent_id)
        guard += 1
    }
    return out
}

// Walks descendants depth-first; used for bulk delete confirmation copy.
export const descendantIds = (nodes, rootId) => {
    const out = []
    const stack = [rootId]
    while (stack.length) {
        const id = stack.pop()
        for (const n of nodes) {
            if (n.parent_id === id) {
                out.push(n.id)
                if (n.node_type === 'folder') stack.push(n.id)
            }
        }
    }
    return out
}

export const hasDescendants = (nodes, id) => nodes.some((n) => n.parent_id === id)

// Validation: forbid name collisions inside the same parent (case-insensitive).
export const isNameTaken = (nodes, parentId, name, ignoreId) => {
    const pid = parentId === SKILL_ROOT_ID ? null : parentId
    const lname = (name || '').toLowerCase()
    return nodes.some((n) => n.id !== ignoreId && (n.parent_id || null) === pid && (n.name || '').toLowerCase() === lname)
}
