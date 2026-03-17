import { useCallback, useRef } from 'react'
import { useUpdateNodeInternals } from 'reactflow'

import { parseOutputHandleIndex } from '@/core/utils'
import { useAgentflowContext } from '@/infrastructure/store'

/**
 * Hook for managing dynamic output ports on nodes whose anchor count
 * depends on runtime data (e.g. condition nodes).
 *
 * Provides `cleanupOrphanedEdges` to remove edges that point to output
 * handles that no longer exist after the count decreases.
 *
 * The caller is responsible for computing outputAnchors (via
 * `buildDynamicOutputAnchors`) and merging them into the same
 * `updateNodeData` call that updates inputValues — this avoids the
 * stale-closure problem of two sequential store updates in one tick.
 *
 * Pass `enabled: false` to make the hook inert for non-applicable nodes.
 */
export function useDynamicOutputPorts(nodeId: string, enabled: boolean = true, includeElse: boolean = true) {
    const { state, setEdges } = useAgentflowContext()
    const updateNodeInternals = useUpdateNodeInternals()
    const prevCountRef = useRef<number | null>(null)

    /**
     * Removes edges connected to output handles that no longer exist
     * after the item count changes, and notifies ReactFlow to re-measure
     * the node's handles.
     */
    const cleanupOrphanedEdges = useCallback(
        (count: number) => {
            if (!enabled) return

            const prevCount = prevCountRef.current
            prevCountRef.current = count

            // Remove edges connected to output handles that no longer exist
            if (prevCount !== null && count < prevCount) {
                const totalNewAnchors = includeElse ? count + 1 : count
                const updatedEdges = state.edges.filter((edge) => {
                    if (edge.source !== nodeId || !edge.sourceHandle) return true
                    const handleIndex = parseOutputHandleIndex(nodeId, edge.sourceHandle)
                    if (isNaN(handleIndex)) return true
                    return handleIndex < totalNewAnchors
                })
                if (updatedEdges.length !== state.edges.length) {
                    setEdges(updatedEdges)
                }
            }

            updateNodeInternals(nodeId)
        },
        [nodeId, enabled, includeElse, state.edges, setEdges, updateNodeInternals]
    )

    return { cleanupOrphanedEdges }
}
