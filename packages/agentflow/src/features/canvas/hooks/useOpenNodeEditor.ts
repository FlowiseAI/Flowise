import { useCallback } from 'react'
import { useAgentflowContext } from '../../../infrastructure/store'
import { useFlowNodes } from './useFlowNodes'  // ← Add this import
import type { NodeData } from '../../../core/types'

/**
 * Hook to open the node editor dialog
 * Handles fetching node data and schema, then opens the edit dialog
 */
export function useOpenNodeEditor() {
    const { state, openEditDialog } = useAgentflowContext()
    const { availableNodes } = useFlowNodes()  // ← Get availableNodes from here
    
    const openNodeEditor = useCallback((nodeId: string) => {
        // Find the node data
        const node = state.nodes.find(n => n.id === nodeId)
        if (!node) return
        
        // Find the node schema
        const nodeSchema = availableNodes.find(n => n.name === node.data.name)
        if (!nodeSchema) return
        
        // Get inputParams (API returns 'inputs' property)
        const inputParams = (nodeSchema as any)?.inputs || []
        
        // Ensure inputs object exists
        const nodeDataWithInputs: NodeData = {
            ...node.data,
            inputs: node.data.inputs || {}
        }
        
        // Open the dialog
        openEditDialog(nodeId, nodeDataWithInputs, inputParams)
    }, [state.nodes, availableNodes, openEditDialog])
    
    return { openNodeEditor }
}
