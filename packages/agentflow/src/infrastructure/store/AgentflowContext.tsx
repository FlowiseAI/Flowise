import { createContext, Dispatch, ReactNode, useCallback, useContext, useReducer, useRef } from 'react'
import type { ReactFlowInstance } from 'reactflow'

import { cloneDeep } from 'lodash'

import type { AgentflowAction, AgentflowState, FlowConfig, FlowData, FlowEdge, FlowNode, InputParam, NodeData } from '@/core/types'
import { getUniqueNodeId } from '@/core/utils'

import { agentflowReducer, initialState, normalizeNodes } from './agentflowReducer'

// ========================================
// Helper Functions
// ========================================

/**
 * Check if a value is a connection string (e.g., "{{nodeId.data.instance}}")
 */
function isConnectionString(value: unknown): boolean {
    return typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')
}

/**
 * Update IDs in anchor arrays to match a new node ID
 */
function updateAnchorIds(items: unknown, oldId: string, newId: string): void {
    if (!Array.isArray(items)) return
    for (const item of items) {
        if (item?.id) {
            item.id = item.id.replace(oldId, newId)
        }
    }
}

/**
 * Clean up input values in nodes connected to a deleted node
 */
function deleteConnectedInput(deletedNodeId: string, nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
    // Find all edges where the deleted node is the source
    const connectedEdges = edges.filter((edge) => edge.source === deletedNodeId)

    return nodes.map((node) => {
        // Check if this node is a target of any connected edge
        const affectedEdge = connectedEdges.find((edge) => edge.target === node.id)
        if (!affectedEdge) return node

        // Extract the input name from the target handle (format: nodeId-input-inputName-type)
        const targetInput = affectedEdge.targetHandle?.split('-')[2]
        if (!targetInput || !node.data.inputValues) return node

        // Clean up the input value
        const currentValue = node.data.inputValues[targetInput]
        let newValue: unknown

        // Check if this is a list input (array of connections)
        const inputAnchor = node.data.inputAnchors?.find((anchor) => anchor.name === targetInput)
        const inputParam = node.data.inputs?.find((param) => param.name === targetInput)

        if (inputAnchor && (inputAnchor as { list?: boolean }).list) {
            // For list inputs, filter out connections to the deleted node
            const values = (currentValue as string[]) || []
            newValue = values.filter((item) => !item.includes(deletedNodeId))
        } else if (inputParam && (inputParam as { acceptVariable?: boolean }).acceptVariable) {
            // For variable inputs, remove the variable reference
            newValue = ((currentValue as string) || '').replace(`{{${deletedNodeId}.data.instance}}`, '') || ''
        } else {
            // Default: clear the value
            newValue = ''
        }

        return {
            ...node,
            data: {
                ...node.data,
                inputValues: {
                    ...node.data.inputValues,
                    [targetInput]: newValue
                }
            }
        }
    })
}

/**
 * Recursively collect all descendant nodes of a parent
 */
function collectDescendants(parentId: string, nodes: FlowNode[]): Set<string> {
    const nodesToDelete = new Set<string>()
    const childNodes = nodes.filter((node) => node.parentNode === parentId)

    childNodes.forEach((childNode) => {
        nodesToDelete.add(childNode.id)
        // Recursively collect descendants of this child
        const descendants = collectDescendants(childNode.id, nodes)
        descendants.forEach((id) => nodesToDelete.add(id))
    })

    return nodesToDelete
}

// ========================================
// Types
// ========================================

// Local state setter types
type NodesSetter = (nodes: FlowNode[]) => void
type EdgesSetter = (edges: FlowEdge[]) => void

// Context value interface
export interface AgentflowContextValue {
    state: AgentflowState
    dispatch: Dispatch<AgentflowAction>

    // Convenience methods
    setNodes: NodesSetter
    setEdges: EdgesSetter
    syncNodesFromReactFlow: NodesSetter
    syncEdgesFromReactFlow: EdgesSetter
    setChatflow: (chatflow: FlowConfig | null) => void
    setDirty: (dirty: boolean) => void
    setReactFlowInstance: (instance: ReactFlowInstance | null) => void

    // Node operations
    deleteNode: (nodeId: string) => void
    duplicateNode: (nodeId: string, distance?: number) => void
    updateNodeData: (nodeId: string, data: Partial<FlowNode['data']>) => void

    // Edge operations
    deleteEdge: (edgeId: string) => void

    // Flow operations
    getFlowData: () => FlowData
    reset: () => void

    //Dialog operations
    openEditDialog: (nodeId: string, data: NodeData, inputParams: InputParam[]) => void
    closeEditDialog: () => void

    // Register ReactFlow local state setters
    registerLocalStateSetters: (setLocalNodes: NodesSetter, setLocalEdges: EdgesSetter) => void
}

const AgentflowContext = createContext<AgentflowContextValue | null>(null)

interface AgentflowStateProviderProps {
    children: ReactNode
    initialFlow?: FlowData
}

export function AgentflowStateProvider({ children, initialFlow }: AgentflowStateProviderProps) {
    const [state, dispatch] = useReducer(agentflowReducer, {
        ...initialState,
        nodes: normalizeNodes(initialFlow?.nodes || []),
        edges: initialFlow?.edges || []
    })

    // Store ReactFlow local state setters in refs which are populated by AgentflowCanvas
    const localNodesSetterRef = useRef<NodesSetter | null>(null)
    const localEdgesSetterRef = useRef<EdgesSetter | null>(null)

    const registerLocalStateSetters = useCallback((setLocalNodes: NodesSetter, setLocalEdges: EdgesSetter) => {
        localNodesSetterRef.current = setLocalNodes
        localEdgesSetterRef.current = setLocalEdges
    }, [])

    // Helper function to synchronize state updates between context and ReactFlow
    const syncStateUpdate = useCallback(({ nodes, edges }: { nodes?: FlowNode[]; edges?: FlowEdge[] }) => {
        if (nodes !== undefined) {
            const normalizedNodes = normalizeNodes(nodes)
            dispatch({ type: 'SET_NODES', payload: normalizedNodes })
            localNodesSetterRef.current?.(normalizedNodes)
        }
        if (edges !== undefined) {
            dispatch({ type: 'SET_EDGES', payload: edges })
            localEdgesSetterRef.current?.(edges)
        }
        if (nodes !== undefined || edges !== undefined) {
            dispatch({ type: 'SET_DIRTY', payload: true })
        }
    }, [])

    // Convenience setters
    const setNodes = useCallback<NodesSetter>(
        (nodes) => {
            syncStateUpdate({ nodes: nodes })
        },
        [syncStateUpdate]
    )

    const setEdges = useCallback<EdgesSetter>(
        (edges) => {
            syncStateUpdate({ edges: edges })
        },
        [syncStateUpdate]
    )

    const syncNodesFromReactFlow = useCallback<NodesSetter>((nodes) => {
        dispatch({ type: 'SET_NODES', payload: normalizeNodes(nodes) })
    }, [])

    const syncEdgesFromReactFlow = useCallback<EdgesSetter>((edges) => {
        dispatch({ type: 'SET_EDGES', payload: edges })
    }, [])

    const setChatflow = useCallback((chatflow: FlowConfig | null) => {
        dispatch({ type: 'SET_CHATFLOW', payload: chatflow })
    }, [])

    const setDirty = useCallback((dirty: boolean) => {
        dispatch({ type: 'SET_DIRTY', payload: dirty })
    }, [])

    const setReactFlowInstance = useCallback((instance: ReactFlowInstance | null) => {
        dispatch({ type: 'SET_REACTFLOW_INSTANCE', payload: instance })
    }, [])

    // Node operations
    const deleteNode = useCallback(
        (nodeId: string) => {
            // Collect all nodes to be deleted (parent and all descendants)
            const nodesToDelete = new Set<string>()
            nodesToDelete.add(nodeId)
            const descendants = collectDescendants(nodeId, state.nodes)
            descendants.forEach((id) => nodesToDelete.add(id))

            // Clean up connected inputs for the parent node first
            let updatedNodes = deleteConnectedInput(nodeId, state.nodes, state.edges)

            // Clean up connected inputs for each descendant
            descendants.forEach((id) => {
                updatedNodes = deleteConnectedInput(id, updatedNodes, state.edges)
            })

            // Remove all nodes in the deletion set
            const newNodes = updatedNodes.filter((node) => !nodesToDelete.has(node.id))

            // Remove all edges connected to any deleted node
            const newEdges = state.edges.filter((edge) => !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target))

            syncStateUpdate({ nodes: newNodes, edges: newEdges })
        },
        [state.nodes, state.edges, syncStateUpdate]
    )

    const duplicateNode = useCallback(
        (nodeId: string, distance = 50) => {
            const nodeToDuplicate = state.nodes.find((node) => node.id === nodeId)
            if (!nodeToDuplicate) return

            const newNodeId = getUniqueNodeId(nodeToDuplicate.data, state.nodes)
            const nodeWidth = nodeToDuplicate.width ?? 300

            // Deep clone to avoid mutating the original node's nested objects
            const clonedNode = cloneDeep(nodeToDuplicate)

            const newNode: FlowNode = {
                ...clonedNode,
                id: newNodeId,
                position: {
                    x: clonedNode.position.x + nodeWidth + distance,
                    y: clonedNode.position.y
                },
                data: {
                    ...clonedNode.data,
                    id: newNodeId,
                    label: clonedNode.data.label + ` (${newNodeId.split('_').pop()})`
                },
                selected: false
            }

            // Update IDs in all anchor arrays to match new node ID
            updateAnchorIds(newNode.data.inputs, nodeId, newNodeId)
            updateAnchorIds(newNode.data.inputAnchors, nodeId, newNodeId)
            updateAnchorIds(newNode.data.outputAnchors, nodeId, newNodeId)

            // Clear connected input values by resetting to defaults
            if (newNode.data.inputValues) {
                for (const inputName in newNode.data.inputValues) {
                    const value = newNode.data.inputValues[inputName]

                    if (isConnectionString(value)) {
                        // Reset string connections to parameter default
                        const inputParam = newNode.data.inputs?.find((p) => p.name === inputName)
                        newNode.data.inputValues[inputName] = inputParam?.default ?? ''
                    } else if (Array.isArray(value)) {
                        // Filter out connection strings from arrays
                        newNode.data.inputValues[inputName] = value.filter((item) => !isConnectionString(item))
                    }
                }
            }

            syncStateUpdate({ nodes: [...state.nodes, newNode] })
        },
        [state.nodes, syncStateUpdate]
    )

    const updateNodeData = useCallback(
        (nodeId: string, data: Partial<FlowNode['data']>) => {
            const newNodes = state.nodes.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: { ...node.data, ...data }
                    }
                }
                return node
            })

            syncStateUpdate({ nodes: newNodes })
        },
        [state.nodes, syncStateUpdate]
    )

    // Edge operations
    const deleteEdge = useCallback(
        (edgeId: string) => {
            const newEdges = state.edges.filter((edge) => edge.id !== edgeId)
            syncStateUpdate({ edges: newEdges })
        },
        [state.edges, syncStateUpdate]
    )

    // Dialog operations
    const openEditDialog = useCallback((nodeId: string, data: NodeData, inputParams: InputParam[]) => {
        const dialogProps = {
            inputParams: inputParams,
            data: data,
            disabled: false
        }
        dispatch({
            type: 'OPEN_EDIT_DIALOG',
            payload: {
                nodeId,
                dialogProps
            }
        })
    }, [])

    const closeEditDialog = useCallback(() => {
        dispatch({ type: 'CLOSE_EDIT_DIALOG' })
    }, [])

    // Get flow data
    const getFlowData = useCallback((): FlowData => {
        const viewport = state.reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
        return {
            nodes: state.nodes,
            edges: state.edges,
            viewport
        }
    }, [state.nodes, state.edges, state.reactFlowInstance])

    // Reset
    const reset = useCallback(() => {
        dispatch({ type: 'RESET' })
    }, [])

    const value: AgentflowContextValue = {
        state,
        dispatch,
        setNodes,
        setEdges,
        syncNodesFromReactFlow,
        syncEdgesFromReactFlow,
        setChatflow,
        setDirty,
        setReactFlowInstance,
        deleteNode,
        duplicateNode,
        updateNodeData,
        deleteEdge,
        openEditDialog,
        closeEditDialog,
        getFlowData,
        reset,
        registerLocalStateSetters
    }

    return <AgentflowContext.Provider value={value}>{children}</AgentflowContext.Provider>
}

export function useAgentflowContext(): AgentflowContextValue {
    const context = useContext(AgentflowContext)
    if (!context) {
        throw new Error('useAgentflowContext must be used within AgentflowProvider')
    }
    return context
}

export { AgentflowContext }
