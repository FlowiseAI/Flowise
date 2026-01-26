import { useCallback } from 'react'
import { useAgentflowContext } from './AgentflowProvider'
import { AgentFlowInstance, ValidationResult, FlowData } from './types'

export const useAgentFlow = (): AgentFlowInstance => {
    const { flow, reactFlowInstance } = useAgentflowContext()

    const getFlow = useCallback((): FlowData => {
        if (!flow) {
            return { nodes: [], edges: [] }
        }
        return flow
    }, [flow])

    const toJSON = useCallback((): string => {
        const currentFlow = getFlow()
        return JSON.stringify(currentFlow, null, 2)
    }, [getFlow])

    const validate = useCallback((): ValidationResult => {
        const currentFlow = getFlow()
        const errors: ValidationResult['errors'] = []

        // Check for disconnected nodes (nodes without edges)
        const connectedNodeIds = new Set<string>()
        currentFlow.edges.forEach((edge) => {
            connectedNodeIds.add(edge.source)
            connectedNodeIds.add(edge.target)
        })

        // Find nodes that should be connected but aren't
        currentFlow.nodes.forEach((node) => {
            // Skip sticky notes and other non-functional nodes
            if (node.type === 'stickyNote') {
                return
            }

            const hasConnection = connectedNodeIds.has(node.id)
            if (!hasConnection && currentFlow.nodes.length > 1) {
                errors.push({
                    nodeId: node.id,
                    message: `Node "${node.data?.label || node.id}" is not connected`,
                    type: 'missing_connection'
                })
            }
        })

        // Check for circular dependencies (simple cycle detection)
        const detectCycle = () => {
            const visited = new Set<string>()
            const recursionStack = new Set<string>()

            const dfs = (nodeId: string): boolean => {
                if (recursionStack.has(nodeId)) {
                    return true // Cycle detected
                }
                if (visited.has(nodeId)) {
                    return false
                }

                visited.add(nodeId)
                recursionStack.add(nodeId)

                const outgoingEdges = currentFlow.edges.filter((edge) => edge.source === nodeId)
                for (const edge of outgoingEdges) {
                    if (dfs(edge.target)) {
                        errors.push({
                            edgeId: edge.id,
                            message: `Circular dependency detected involving edge ${edge.id}`,
                            type: 'circular_dependency'
                        })
                        return true
                    }
                }

                recursionStack.delete(nodeId)
                return false
            }

            currentFlow.nodes.forEach((node) => {
                if (!visited.has(node.id)) {
                    dfs(node.id)
                }
            })
        }

        detectCycle()

        return {
            valid: errors.length === 0,
            errors
        }
    }, [getFlow])

    const fitView = useCallback(() => {
        if (reactFlowInstance) {
            reactFlowInstance.fitView({ padding: 0.2 })
        }
    }, [reactFlowInstance])

    const getReactFlowInstance = useCallback(() => {
        return reactFlowInstance
    }, [reactFlowInstance])

    return {
        getFlow,
        toJSON,
        validate,
        fitView,
        getReactFlowInstance
    }
}
