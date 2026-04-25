import { useMemo } from 'react'

import type { ExecutionTreeNode, NodeExecutionData } from '@/core/types'

/**
 * Builds a hierarchical ExecutionTreeNode[] from the flat NodeExecutionData[] stored in
 * execution.executionData (JSON string). Handles:
 *
 * - Top-level nodes (no parentNodeId)
 * - Iteration child nodes (parentNodeId set, grouped by iterationIndex)
 * - Virtual iteration container nodes (synthesized to group iteration children)
 *
 * Mirrors the tree-building logic in OSS ExecutionDetails.jsx.
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

        // Separate top-level nodes from iteration children
        const topLevel = nodes.filter((n) => !n.parentNodeId)
        const iterationChildren = nodes.filter((n) => !!n.parentNodeId)

        // Group iteration children by parentNodeId, then by iterationIndex
        const childrenByParent = new Map<string, Map<number, NodeExecutionData[]>>()
        for (const child of iterationChildren) {
            const parentId = child.parentNodeId!
            const iterIdx = child.iterationIndex ?? 0

            if (!childrenByParent.has(parentId)) {
                childrenByParent.set(parentId, new Map())
            }
            const byIndex = childrenByParent.get(parentId)!
            if (!byIndex.has(iterIdx)) {
                byIndex.set(iterIdx, [])
            }
            byIndex.get(iterIdx)!.push(child)
        }

        function buildNode(n: NodeExecutionData): ExecutionTreeNode {
            const treeNode: ExecutionTreeNode = {
                id: `${n.nodeId}-${n.iterationIndex ?? 0}`,
                nodeId: n.nodeId,
                nodeLabel: n.nodeLabel,
                status: n.status,
                name: n.name,
                iterationIndex: n.iterationIndex,
                children: [],
                raw: n
            }

            const childGroups = childrenByParent.get(n.nodeId)
            if (childGroups && childGroups.size > 0) {
                // Build a virtual container per iteration group
                const sortedIterations = Array.from(childGroups.keys()).sort((a, b) => a - b)
                treeNode.children = sortedIterations.map((iterIdx) => {
                    const groupChildren = childGroups.get(iterIdx)!
                    const virtualNode: ExecutionTreeNode = {
                        id: `${n.nodeId}-iteration-${iterIdx}`,
                        nodeId: `${n.nodeId}-iteration-${iterIdx}`,
                        nodeLabel: `Iteration #${iterIdx + 1}`,
                        status: groupChildren[groupChildren.length - 1]?.status ?? 'FINISHED',
                        isVirtualNode: true,
                        iterationIndex: iterIdx,
                        children: groupChildren.map(buildNode)
                    }
                    return virtualNode
                })
            }

            return treeNode
        }

        return topLevel.map(buildNode)
    }, [executionDataJson])
}
