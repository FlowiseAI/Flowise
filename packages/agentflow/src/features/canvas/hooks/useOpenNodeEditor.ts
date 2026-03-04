import { useCallback } from 'react'

import type { NodeData } from '@/core/types'
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
            const nodeSchema = availableNodes.find((n) => n.name === node.data.name)
            if (!nodeSchema) return

            // Get inputParams from schema (API returns 'inputs' property as InputParam[])
            const inputParams = nodeSchema.inputs || []

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
