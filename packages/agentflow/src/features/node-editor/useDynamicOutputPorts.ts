import { useCallback, useRef } from 'react'
import { useUpdateNodeInternals } from 'reactflow'

import { buildDynamicOutputAnchors, parseOutputHandleIndex } from '@/core/utils/dynamicOutputAnchors'
import { useAgentflowContext } from '@/infrastructure/store'

/**
 * Hook that syncs a node's output anchors with a dynamic item count.
 * Call syncOutputPorts after each data change that affects the anchor count.
 *
 * When the count decreases, edges connected to removed output handles are cleaned up.
 * Pass `enabled: false` (or omit labelPrefix) to make the hook inert for non-applicable nodes.
 */
export function useDynamicOutputPorts(nodeId: string, labelPrefix: string, enabled: boolean = true, includeElse: boolean = true) {
    const { state, updateNodeData, setEdges } = useAgentflowContext()
    const updateNodeInternals = useUpdateNodeInternals()
    const prevCountRef = useRef<number | null>(null)

    const syncOutputPorts = useCallback(
        (count: number) => {
            if (!enabled) return
            if (prevCountRef.current === count) return

            const prevCount = prevCountRef.current
            prevCountRef.current = count

            const outputAnchors = buildDynamicOutputAnchors(nodeId, count, labelPrefix, includeElse)
            updateNodeData(nodeId, { outputAnchors })

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
        [nodeId, labelPrefix, enabled, includeElse, state.edges, updateNodeData, setEdges, updateNodeInternals]
    )

    return { syncOutputPorts }
}
