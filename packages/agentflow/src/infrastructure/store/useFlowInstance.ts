import { useCallback } from 'react'
import type { ReactFlowInstance } from 'reactflow'

import type { FlowData, FlowNode, ValidationResult } from '../../core/types'

import { useAgentflowContext } from './AgentflowContext'

/**
 * Hook for accessing and manipulating the ReactFlow instance
 */
export function useFlowInstance() {
    const { state, setReactFlowInstance, getFlowData, setNodes, setEdges, setDirty } = useAgentflowContext()

    const { reactFlowInstance, nodes, edges } = state

    /**
     * Set the ReactFlow instance
     */
    const onInit = useCallback(
        (instance: ReactFlowInstance) => {
            setReactFlowInstance(instance)
        },
        [setReactFlowInstance]
    )

    /**
     * Get the current flow data
     */
    const getFlow = useCallback((): FlowData => {
        return getFlowData()
    }, [getFlowData])

    /**
     * Convert flow to JSON string
     */
    const toJSON = useCallback((): string => {
        return JSON.stringify(getFlowData())
    }, [getFlowData])

    /**
     * Fit view to show all nodes
     */
    const fitView = useCallback(() => {
        reactFlowInstance?.fitView({ padding: 0.2 })
    }, [reactFlowInstance])

    /**
     * Add a new node to the canvas
     */
    const addNode = useCallback(
        (nodeData: Partial<FlowNode>) => {
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
     * Clear all nodes and edges
     */
    const clear = useCallback(() => {
        setNodes([])
        setEdges([])
        setDirty(true)
    }, [setNodes, setEdges, setDirty])

    /**
     * Validate the current flow
     */
    const validate = useCallback((): ValidationResult => {
        const errors: ValidationResult['errors'] = []

        // Check for start node
        const startNode = nodes.find((n) => n.data.name === 'startAgentflow')
        if (!startNode) {
            errors.push({
                message: 'Flow must have a start node',
                type: 'error'
            })
        }

        // Check for disconnected nodes (except start and sticky notes)
        nodes.forEach((node) => {
            if (node.data.name === 'stickyNoteAgentflow') return

            const hasIncoming = edges.some((e) => e.target === node.id)
            const hasOutgoing = edges.some((e) => e.source === node.id)

            if (node.data.name !== 'startAgentflow' && !hasIncoming) {
                errors.push({
                    nodeId: node.id,
                    message: `Node "${node.data.label || node.data.name}" has no incoming connections`,
                    type: 'warning'
                })
            }

            // End nodes don't need outgoing connections
            const isEndNode = ['directReplyAgentflow'].includes(node.data.name)
            if (!isEndNode && !hasOutgoing && node.data.name !== 'stickyNoteAgentflow') {
                errors.push({
                    nodeId: node.id,
                    message: `Node "${node.data.label || node.data.name}" has no outgoing connections`,
                    type: 'warning'
                })
            }
        })

        return {
            valid: errors.filter((e) => e.type === 'error').length === 0,
            errors
        }
    }, [nodes, edges])

    return {
        reactFlowInstance,
        onInit,
        getFlow,
        toJSON,
        fitView,
        addNode,
        clear,
        validate
    }
}

export default useFlowInstance
