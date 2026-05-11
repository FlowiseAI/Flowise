import { useMemo } from 'react'

import type { ExecutionState, ExecutionTreeNode, NodeExecutionData } from '@/core/types'

const FLOWISE_CREDENTIAL_ID = 'FLOWISE_CREDENTIAL_ID'

/** Recursively delete `FLOWISE_CREDENTIAL_ID` keys from `data` (mutates in place). */
function scrubCredentialIds(data: unknown): void {
    if (!data || typeof data !== 'object') return
    const obj = data as Record<string, unknown>
    for (const key of Object.keys(obj)) {
        if (key === FLOWISE_CREDENTIAL_ID) {
            delete obj[key]
            continue
        }
        const value = obj[key]
        if (value && typeof value === 'object') scrubCredentialIds(value)
    }
}

/** Legacy ExecutionDetails.jsx:438-446 rollup: ERROR > INPROGRESS > all-FINISHED > UNKNOWN. */
function rollupIterationStatus(childStatuses: ExecutionState[]): ExecutionState | 'UNKNOWN' {
    if (childStatuses.some((s) => s === 'ERROR')) return 'ERROR'
    if (childStatuses.some((s) => s === 'INPROGRESS')) return 'INPROGRESS'
    if (childStatuses.length > 0 && childStatuses.every((s) => s === 'FINISHED')) return 'FINISHED'
    return 'UNKNOWN'
}

/**
 * Builds a hierarchical `ExecutionTreeNode[]` from the flat `NodeExecutionData[]`
 * stored in `execution.executionData` (JSON string). Two parenting mechanisms,
 * mirroring the legacy `ExecutionDetails.jsx` `buildTreeData`:
 *
 * 1. **`previousNodeIds` parent→child** — each non-iteration node attaches to
 *    the most recent prior instance of any node listed in its `previousNodeIds`.
 *    A node with empty `previousNodeIds` becomes a root.
 * 2. **Iteration grouping** — children with `parentNodeId` + `iterationIndex`
 *    are grouped into virtual `Iteration #N` container nodes under the iteration
 *    agent's most recent instance, then linked to one another inside the
 *    iteration via the same `previousNodeIds` rule.
 *
 * Tree node ids are `${nodeId}_${index}` (array position) so the same `nodeId`
 * appearing multiple times (e.g. inside a loop) keeps each instance addressable.
 */
export function useExecutionTree(executionDataJson: string | null): ExecutionTreeNode[] {
    return useMemo(() => {
        if (!executionDataJson) return []

        let nodes: NodeExecutionData[]
        try {
            nodes = JSON.parse(executionDataJson) as NodeExecutionData[]
        } catch {
            console.error('[Observe] Failed to parse executionData JSON')
            return []
        }

        if (!Array.isArray(nodes) || nodes.length === 0) return []

        // PARITY: legacy buildTreeData (ExecutionDetails.jsx:371-383) recursively
        // strips `FLOWISE_CREDENTIAL_ID` keys from each node's `data`. The list
        // and detail server endpoints don't redact (only the public endpoint
        // does), so we scrub here before exposing `raw` on tree nodes.
        nodes.forEach((n) => scrubCredentialIds(n.data))

        const treeNodes = new Map<string, ExecutionTreeNode>()
        // Track each node's original array index — used by the final sibling
        // sort to preserve original execution order between non-iteration
        // siblings. Virtual iteration nodes use -1 so they sort first.
        const executionIndexById = new Map<string, number>()

        const uniqueId = (nodeId: string, index: number) => `${nodeId}_${index}`
        const isIterationChild = (n: NodeExecutionData) => Boolean(n.data.parentNodeId) && n.data.iterationIndex !== undefined

        // `nodeId` → ascending array indices. Read in reverse to find the most-recent occurrence < currentIndex.
        const indicesByNodeId = new Map<string, number[]>()

        nodes.forEach((n, index) => {
            // The runtime emits the type identifier on `data.name`; `n.name` is
            // a tolerated fallback for non-runtime producers (tests, wrappers).
            const dataName = n.data.name
            const resolvedName = n.name ?? (typeof dataName === 'string' ? dataName : undefined) ?? n.nodeId.split('_')[0]
            const id = uniqueId(n.nodeId, index)
            treeNodes.set(id, {
                id,
                nodeId: n.nodeId,
                nodeLabel: n.nodeLabel,
                status: n.status,
                name: resolvedName,
                iterationIndex: n.data.iterationIndex,
                children: [],
                raw: n
            })
            executionIndexById.set(id, index)
            if (!indicesByNodeId.has(n.nodeId)) indicesByNodeId.set(n.nodeId, [])
            indicesByNodeId.get(n.nodeId)!.push(index)
        })

        const iterationGroups = new Map<string, Map<number, number[]>>() // parentNodeId -> iterIdx -> [array index, ...]
        nodes.forEach((n, index) => {
            const { parentNodeId, iterationIndex: iterIdx } = n.data
            if (!parentNodeId || iterIdx === undefined) return
            if (!iterationGroups.has(parentNodeId)) iterationGroups.set(parentNodeId, new Map())
            const byIdx = iterationGroups.get(parentNodeId)!
            if (!byIdx.has(iterIdx)) byIdx.set(iterIdx, [])
            byIdx.get(iterIdx)!.push(index)
        })

        const virtualNodes = new Map<string, ExecutionTreeNode>() // virtualId -> ExecutionTreeNode
        const childToVirtualParent = new Map<string, string>() // child uniqueId -> virtualId
        iterationGroups.forEach((byIdx, parentNodeId) => {
            byIdx.forEach((indices, iterIdx) => {
                const virtualId = `${parentNodeId}-iteration-${iterIdx}`
                const childStatuses = indices.map((i) => nodes[i].status)
                virtualNodes.set(virtualId, {
                    id: virtualId,
                    nodeId: virtualId,
                    // PARITY: legacy ExecutionDetails.jsx:436 uses the raw 0-based iterationIndex.
                    nodeLabel: `Iteration #${iterIdx}`,
                    status: rollupIterationStatus(childStatuses),
                    // PARITY: drive the iteration container icon via AGENTFLOW_ICONS lookup, matching the legacy `iterationAgentflow` node-type signal.
                    name: 'iterationAgentflow',
                    isVirtualNode: true,
                    iterationIndex: iterIdx,
                    children: []
                })
                executionIndexById.set(virtualId, -1)
                indices.forEach((i) => childToVirtualParent.set(uniqueId(nodes[i].nodeId, i), virtualId))
            })
        })

        // Most recent ancestor index whose nodeId is in `previousNodeIds`.
        // With sameIterationOnly, restrict to nodes in the same iteration.
        const findAncestor = (
            n: NodeExecutionData,
            currentIndex: number,
            sameIterationOnly = false
        ): { index: number; nodeId: string } | null => {
            if (!n.previousNodeIds || n.previousNodeIds.length === 0) return null
            let bestIndex = -1
            let bestNodeId: string | null = null
            for (const prevId of n.previousNodeIds) {
                const indices = indicesByNodeId.get(prevId)
                if (!indices) continue
                for (let j = indices.length - 1; j >= 0; j--) {
                    const i = indices[j]
                    if (i >= currentIndex) continue
                    if (sameIterationOnly) {
                        const candidate = nodes[i]
                        if (candidate.data.parentNodeId !== n.data.parentNodeId) continue
                        if (candidate.data.iterationIndex !== n.data.iterationIndex) continue
                    }
                    if (i > bestIndex) {
                        bestIndex = i
                        bestNodeId = prevId
                    }
                    break
                }
            }
            return bestIndex >= 0 && bestNodeId ? { index: bestIndex, nodeId: bestNodeId } : null
        }

        const rootNodes: ExecutionTreeNode[] = []

        // First pass: link non-iteration nodes via previousNodeIds.
        nodes.forEach((n, index) => {
            if (isIterationChild(n)) return
            const self = treeNodes.get(uniqueId(n.nodeId, index))!

            const ancestor = findAncestor(n, index)
            if (!ancestor) {
                rootNodes.push(self)
                return
            }
            // findAncestor returns indices we've already seeded into treeNodes — non-null.
            const parent = treeNodes.get(uniqueId(ancestor.nodeId, ancestor.index))!
            parent.children.push(self)
        })

        // Second pass: attach virtual iteration nodes to the iteration agent's
        // most recent instance.
        iterationGroups.forEach((byIdx, parentNodeId) => {
            const parentIndices = indicesByNodeId.get(parentNodeId)
            if (!parentIndices || parentIndices.length === 0) return
            const latestParentIndex = parentIndices[parentIndices.length - 1]
            const parent = treeNodes.get(uniqueId(parentNodeId, latestParentIndex))
            if (!parent) return
            Array.from(byIdx.keys())
                .sort((a, b) => a - b)
                .forEach((iterIdx) => {
                    const virtual = virtualNodes.get(`${parentNodeId}-iteration-${iterIdx}`)
                    if (virtual) parent.children.push(virtual)
                })
        })

        // Third pass: build sub-tree inside each virtual iteration container.
        nodes.forEach((n, index) => {
            if (!isIterationChild(n)) return
            const self = treeNodes.get(uniqueId(n.nodeId, index))!
            const virtualId = childToVirtualParent.get(self.id)
            if (!virtualId) return
            const virtualParent = virtualNodes.get(virtualId)
            if (!virtualParent) return

            const ancestor = findAncestor(n, index, true)
            if (!ancestor) {
                virtualParent.children.push(self)
                return
            }
            // findAncestor returns indices we've already seeded into treeNodes — non-null.
            const ancestorNode = treeNodes.get(uniqueId(ancestor.nodeId, ancestor.index))!
            ancestorNode.children.push(self)
        })

        // PARITY: legacy ExecutionDetails.jsx:589-614 sorts every node's
        // children so virtual iteration nodes appear before non-iteration
        // siblings; non-iteration siblings preserve original execution order.
        const sortChildren = (node: ExecutionTreeNode) => {
            if (node.children.length === 0) return
            node.children.sort((a, b) => {
                const aVirtual = a.isVirtualNode === true
                const bVirtual = b.isVirtualNode === true
                if (aVirtual !== bVirtual) return aVirtual ? -1 : 1
                // Every real and virtual node id is seeded into executionIndexById — non-null.
                return executionIndexById.get(a.id)! - executionIndexById.get(b.id)!
            })
            node.children.forEach(sortChildren)
        }
        rootNodes.forEach(sortChildren)

        return rootNodes
    }, [executionDataJson])
}
