import { createContext, Dispatch, ReactNode, useCallback, useContext, useReducer, useRef } from 'react'
import type { ReactFlowInstance } from 'reactflow'

import type { AgentflowAction, AgentflowState, FlowConfig, FlowData, FlowEdge, FlowNode, InputParam, NodeData } from '@/core/types'

import { agentflowReducer, initialState, normalizeNodes } from './agentflowReducer'

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
    duplicateNode: (nodeId: string) => void
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

    // Helper function to generate unique copy IDs
    const getUniqueCopyId = useCallback((baseId: string, nodes: FlowNode[]): string => {
        const existingIds = new Set(nodes.map((node) => node.id))
        for (let i = 1; i < Number.MAX_SAFE_INTEGER; i++) {
            const newId = `${baseId}_copy_${i}`
            if (!existingIds.has(newId)) {
                return newId
            }
        }
        //Fallback
        return `${baseId}_copy_${Date.now()}`
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
            const newNodes = state.nodes.filter((node) => node.id !== nodeId)
            const newEdges = state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)

            syncStateUpdate({ nodes: newNodes, edges: newEdges })
        },
        [state.nodes, state.edges, syncStateUpdate]
    )

    const duplicateNode = useCallback(
        (nodeId: string) => {
            const nodeToDuplicate = state.nodes.find((node) => node.id === nodeId)
            if (!nodeToDuplicate) return

            const newNodeId = getUniqueCopyId(nodeToDuplicate.id, state.nodes)
            const newNode: FlowNode = {
                ...nodeToDuplicate,
                id: newNodeId,
                selected: false,
                position: {
                    x: nodeToDuplicate.position.x + 50,
                    y: nodeToDuplicate.position.y + 50
                },
                data: {
                    ...nodeToDuplicate.data,
                    id: newNodeId
                }
            }

            const newNodes = [...state.nodes, newNode]
            syncStateUpdate({ nodes: newNodes })
        },
        [state.nodes, syncStateUpdate, getUniqueCopyId]
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
