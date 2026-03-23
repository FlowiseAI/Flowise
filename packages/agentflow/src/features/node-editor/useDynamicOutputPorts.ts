import { useCallback } from 'react'
import { useUpdateNodeInternals } from 'reactflow'

import type { FlowEdge } from '@/core/types'
import { parseOutputHandleIndex } from '@/core/utils'
import { useAgentflowContext } from '@/infrastructure/store'

/**
 * Hook for managing dynamic output ports on nodes whose anchor count
 * depends on runtime data (e.g. condition nodes).
 *
 * Provides `cleanupOrphanedEdges` which filters out edges pointing to
 * output handles that no longer exist and returns the cleaned array.
 * The caller should pass the returned edges to `updateNodeData` so that
 * nodes and edges are updated atomically in a single `onFlowChange` call.
 *
 * Pass `enabled: false` to make the hook inert for non-applicable nodes.
 */
export function useDynamicOutputPorts(nodeId: string, enabled: boolean = true, includeElse: boolean = true) {
    const { state } = useAgentflowContext()
    const updateNodeInternals = useUpdateNodeInternals()

    /**
     * Filters out edges connected to output handles whose index is ≥ the
     * new anchor count, notifies ReactFlow to re-measure the node's
     * handles, and returns the cleaned edges array.
     *
     * Returns `undefined` when no edges were removed (caller can skip the
     * edges update in that case).
     */
    const cleanupOrphanedEdges = useCallback(
        (count: number): FlowEdge[] | undefined => {
            if (!enabled) return undefined

            const totalNewAnchors = includeElse ? count + 1 : count
            const updatedEdges = state.edges.filter((edge) => {
                if (edge.source !== nodeId || !edge.sourceHandle) return true
                const handleIndex = parseOutputHandleIndex(nodeId, edge.sourceHandle)
                if (isNaN(handleIndex)) return true
                return handleIndex < totalNewAnchors
            })

            updateNodeInternals(nodeId)

            if (updatedEdges.length !== state.edges.length) {
                return updatedEdges
            }
            return undefined
        },
        [nodeId, enabled, includeElse, state.edges, updateNodeInternals]
    )

    return { cleanupOrphanedEdges }
}
