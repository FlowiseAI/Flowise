import { useCallback, useMemo } from 'react'

import type { AgentFlowInstance, FlowData, FlowNode, ValidationResult } from './core/types'
import { validateFlow } from './core/validation'
import { useAgentflowContext } from './infrastructure/store'

/**
 * Hook for programmatic access to the Agentflow instance.
 * Provides methods for getting flow data, validation, and canvas manipulation.
 *
 * @example
 * ```tsx
 * function ControlPanel() {
 *   const agentflow = useAgentflow()
 *
 *   const handleSave = () => {
 *     const flow = agentflow.getFlow()
 *     console.log('Saving flow:', flow)
 *   }
 *
 *   const handleValidate = () => {
 *     const result = agentflow.validate()
 *     if (!result.valid) {
 *       console.error('Validation errors:', result.errors)
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={handleSave}>Save</button>
 *       <button onClick={handleValidate}>Validate</button>
 *       <button onClick={() => agentflow.fitView()}>Fit View</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAgentflow(): AgentFlowInstance {
    const { state, setNodes, setEdges, setDirty, getFlowData } = useAgentflowContext()

    const { nodes, edges, reactFlowInstance } = state

    /**
     * Get the current flow data as a serializable object
     */
    const getFlow = useCallback((): FlowData => {
        return getFlowData()
    }, [getFlowData])

    /**
     * Convert the current flow to a JSON string
     */
    const toJSON = useCallback((): string => {
        return JSON.stringify(getFlowData(), null, 2)
    }, [getFlowData])

    /**
     * Validate the current flow structure
     */
    const validate = useCallback((): ValidationResult => {
        return validateFlow(nodes, edges)
    }, [nodes, edges])

    /**
     * Fit the canvas view to show all nodes
     */
    const fitView = useCallback((): void => {
        reactFlowInstance?.fitView({ padding: 0.2, duration: 200 })
    }, [reactFlowInstance])

    /**
     * Get the underlying ReactFlow instance
     */
    const getReactFlowInstance = useCallback(() => {
        return reactFlowInstance
    }, [reactFlowInstance])

    /**
     * Programmatically add a new node to the canvas
     */
    const addNode = useCallback(
        (nodeData: Partial<FlowNode>): void => {
            const newNode: FlowNode = {
                id: nodeData.id || `node_${Date.now()}`,
                type: nodeData.type || 'agentFlow',
                position: nodeData.position || { x: 100, y: 100 },
                data: nodeData.data || { name: '', label: '' },
                ...nodeData
            } as FlowNode

            setNodes([...nodes, newNode])
            setDirty(true)
        },
        [nodes, setNodes, setDirty]
    )

    /**
     * Clear all nodes and edges from the canvas
     */
    const clear = useCallback((): void => {
        setNodes([])
        setEdges([])
        setDirty(true)
    }, [setNodes, setEdges, setDirty])

    // Return memoized instance
    return useMemo<AgentFlowInstance>(
        () => ({
            getFlow,
            toJSON,
            validate,
            fitView,
            getReactFlowInstance,
            addNode,
            clear
        }),
        [getFlow, toJSON, validate, fitView, getReactFlowInstance, addNode, clear]
    )
}

export default useAgentflow
