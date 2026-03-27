import { useCallback } from 'react'

import type { InputParam, NodeData } from '@/core/types'
import { useAgentflowContext } from '@/infrastructure/store'

import { useFlowNodes } from './useFlowNodes'

/**
 * Hook to open the node editor dialog
 * Handles fetching node data and schema, then opens the edit dialog
 */
export function useOpenNodeEditor() {
    const { state, openEditDialog } = useAgentflowContext()
    const { availableNodes } = useFlowNodes()

    const openNodeEditor = useCallback(
        (nodeId: string) => {
            // Find the node data
            const node = state.nodes.find((n) => n.id === nodeId)
            if (!node) return

            // Find the node schema from available nodes (contains InputParam[] definitions)
            // Fall back to node.data.inputs when the API schema isn't available
            const nodeSchema = availableNodes.find((n) => n.name === node.data.name)
            const baseParams = nodeSchema?.inputs || node.data.inputs || []

            // The credential field is a separate property on the node schema (not in inputs).
            // Prepend it to inputParams so the dialog renders it.
            const credentialParam = (nodeSchema as Record<string, unknown>)?.credential as InputParam | undefined
            const inputParams = credentialParam ? [credentialParam, ...baseParams] : baseParams

            // Ensure inputValues object exists for storing user input
            const nodeDataWithInputValues: NodeData = {
                ...node.data,
                inputValues: node.data.inputValues || {}
            }

            // Open the dialog
            openEditDialog(nodeId, nodeDataWithInputValues, inputParams)
        },
        [state.nodes, availableNodes, openEditDialog]
    )

    return { openNodeEditor }
}
