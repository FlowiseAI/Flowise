import { createContext, Dispatch, ReactNode, useCallback, useContext, useMemo, useReducer, useRef } from 'react'
import type { ReactFlowInstance } from 'reactflow'

import { cloneDeep } from 'lodash'

import { getDefaultValueForType } from '@/core/primitives'
import type {
    AgentflowAction,
    AgentflowState,
    ExecutionStatus,
    FlowConfig,
    FlowData,
    FlowDataCallback,
    FlowEdge,
    FlowExecutionState,
    FlowNode,
    InputParam,
    NodeData,
    NodeDataSchema
} from '@/core/types'
import { getDefinedStateKeys, getUniqueNodeId, isNodeOutdated, upgradeNodeData } from '@/core/utils'

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
    updateNodeData: (nodeId: string, data: Partial<FlowNode['data']>, edges?: FlowEdge[]) => void

    // Edge operations
    deleteEdge: (edgeId: string) => void

    // Flow operations
    getFlowData: () => FlowData
    /** Return all unique state keys defined via `updateFlowState` across all nodes. */
    getFlowStateKeys: () => string[]
    reset: () => void

    //Dialog operations
    openEditDialog: (nodeId: string, data: NodeData, inputParams: InputParam[]) => void
    closeEditDialog: () => void

    // Register ReactFlow local state setters
    registerLocalStateSetters: (setLocalNodes: NodesSetter, setLocalEdges: EdgesSetter) => void

    // Register onFlowChange callback (called by AgentflowCanvas)
    registerOnFlowChange: (callback: FlowDataCallback | undefined) => void

    // Execution operations
    executionState: FlowExecutionState | null
    startExecution: (executionId: string) => void
    setNodeExecutionStatus: (nodeId: string, status: ExecutionStatus, error?: string) => void
    clearExecutionState: () => void

    // Version operations
    setComponentNodes: (nodes: NodeDataSchema[]) => void
    hasOutdatedNodes: boolean
    syncNodes: () => void
}

const AgentflowContext = createContext<AgentflowContextValue | null>(null)

interface AgentflowStateProviderProps {
    children: ReactNode
    initialFlow?: FlowData
}

export function AgentflowStateProvider({ children, initialFlow }: AgentflowStateProviderProps) {
    const [state, dispatch] = useReducer(agentflowReducer, {
        ...initialState,
        nodes: normalizeNodes(Array.isArray(initialFlow?.nodes) ? initialFlow.nodes : []),
        edges: Array.isArray(initialFlow?.edges) ? initialFlow.edges : []
    })

    // Store ReactFlow local state setters in refs which are populated by AgentflowCanvas
    const localNodesSetterRef = useRef<NodesSetter | null>(null)
    const localEdgesSetterRef = useRef<EdgesSetter | null>(null)

    const registerLocalStateSetters = useCallback((setLocalNodes: NodesSetter, setLocalEdges: EdgesSetter) => {
        localNodesSetterRef.current = setLocalNodes
        localEdgesSetterRef.current = setLocalEdges
    }, [])

    // Store onFlowChange callback ref (registered by AgentflowCanvas)
    const onFlowChangeRef = useRef<FlowDataCallback | undefined>(undefined)

    const registerOnFlowChange = useCallback((callback: FlowDataCallback | undefined) => {
        onFlowChangeRef.current = callback
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
            const toDelete = new Set<string>([nodeId])
            const collectDescendants = (parentId: string) => {
                state.nodes
                    .filter((n) => n.parentNode === parentId)
                    .forEach((child) => {
                        toDelete.add(child.id)
                        collectDescendants(child.id)
                    })
            }
            collectDescendants(nodeId)

            const newNodes = state.nodes.filter((node) => !toDelete.has(node.id))
            const newEdges = state.edges.filter((edge) => !toDelete.has(edge.source) && !toDelete.has(edge.target))
            syncStateUpdate({ nodes: newNodes, edges: newEdges })

            // Notify parent of flow change so the deletion is persisted
            if (onFlowChangeRef.current) {
                const viewport = state.reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
                onFlowChangeRef.current({ nodes: newNodes, edges: newEdges, viewport })
            }
        },
        [state.nodes, state.edges, state.reactFlowInstance, syncStateUpdate]
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
            updateAnchorIds(newNode.data.inputParams, nodeId, newNodeId)
            updateAnchorIds(newNode.data.inputAnchors, nodeId, newNodeId)
            updateAnchorIds(newNode.data.outputAnchors, nodeId, newNodeId)

            // Clear connected input values by resetting to defaults
            if (newNode.data.inputs) {
                for (const inputName in newNode.data.inputs) {
                    const value = newNode.data.inputs[inputName]

                    if (isConnectionString(value)) {
                        // Reset string connections to parameter default
                        const inputParam = newNode.data.inputParams?.find((p) => p.name === inputName)
                        newNode.data.inputs[inputName] = inputParam ? getDefaultValueForType(inputParam) : ''
                    } else if (Array.isArray(value)) {
                        // Filter out connection strings from arrays
                        newNode.data.inputs[inputName] = value.filter((item) => !isConnectionString(item))
                    }
                }
            }

            const newNodes = [...state.nodes, newNode]
            syncStateUpdate({ nodes: newNodes })

            // Notify parent of flow change so the duplication is persisted
            if (onFlowChangeRef.current) {
                const viewport = state.reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
                onFlowChangeRef.current({ nodes: normalizeNodes(newNodes), edges: state.edges, viewport })
            }
        },
        [state.nodes, state.edges, state.reactFlowInstance, syncStateUpdate]
    )

    const updateNodeData = useCallback(
        (nodeId: string, data: Partial<FlowNode['data']>, edges?: FlowEdge[]) => {
            const newNodes = state.nodes.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: { ...node.data, ...data }
                    }
                }
                return node
            })

            const effectiveEdges = edges ?? state.edges
            syncStateUpdate({ nodes: newNodes, ...(edges !== undefined && { edges }) })

            // Notify parent of flow change (e.g. node data edits from EditNodeDialog)
            if (onFlowChangeRef.current) {
                const viewport = state.reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
                onFlowChangeRef.current({ nodes: newNodes, edges: effectiveEdges, viewport })
            }
        },
        [state.nodes, state.edges, state.reactFlowInstance, syncStateUpdate]
    )

    // Edge operations
    const deleteEdge = useCallback(
        (edgeId: string) => {
            const newEdges = state.edges.filter((edge) => edge.id !== edgeId)
            syncStateUpdate({ edges: newEdges })

            // Notify parent of flow change so the deletion is persisted
            if (onFlowChangeRef.current) {
                const viewport = state.reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
                onFlowChangeRef.current({ nodes: state.nodes, edges: newEdges, viewport })
            }
        },
        [state.nodes, state.edges, state.reactFlowInstance, syncStateUpdate]
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

    // Flow state keys
    const getFlowStateKeys = useCallback((): string[] => {
        return getDefinedStateKeys(state.nodes)
    }, [state.nodes])

    // Reset
    const reset = useCallback(() => {
        dispatch({ type: 'RESET' })
    }, [])

    // Execution operations
    const startExecution = useCallback((executionId: string) => {
        dispatch({ type: 'START_EXECUTION', payload: executionId })
    }, [])

    const setNodeExecutionStatus = useCallback((nodeId: string, status: ExecutionStatus, error?: string) => {
        dispatch({ type: 'SET_NODE_EXECUTION_STATUS', nodeId, status, error })
    }, [])

    const clearExecutionState = useCallback(() => {
        dispatch({ type: 'CLEAR_EXECUTION_STATE' })
    }, [])

    // Version operations
    const setComponentNodes = useCallback((nodes: NodeDataSchema[]) => {
        dispatch({ type: 'SET_COMPONENT_NODES', payload: nodes })
    }, [])

    const hasOutdatedNodes = useMemo(
        () =>
            state.nodes.some((node) => {
                const cn = state.componentNodes.find((c) => c.name === node.data.name)
                return cn ? isNodeOutdated(node.data, cn) : false
            }),
        [state.nodes, state.componentNodes]
    )

    const syncNodes = useCallback(() => {
        const clonedNodes = cloneDeep(state.nodes)
        const clonedEdges = cloneDeep(state.edges)
        const componentMap = new Map(state.componentNodes.map((c) => [c.name, c]))
        const upgradedNodeIds = new Set<string>()

        for (let i = 0; i < clonedNodes.length; i++) {
            const node = clonedNodes[i]
            const cn = componentMap.get(node.data.name)
            if (cn && isNodeOutdated(node.data, cn)) {
                node.data = upgradeNodeData(cn, node.data)
                upgradedNodeIds.add(node.id)
            }
        }

        if (upgradedNodeIds.size === 0) return

        const newEdges = clonedEdges.filter((edge) => (upgradedNodeIds.has(edge.target) ? edge.targetHandle === edge.target : true))

        syncStateUpdate({ nodes: clonedNodes, edges: newEdges })

        if (onFlowChangeRef.current) {
            const viewport = state.reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
            onFlowChangeRef.current({ nodes: clonedNodes, edges: newEdges, viewport })
        }
    }, [state.nodes, state.edges, state.componentNodes, state.reactFlowInstance, syncStateUpdate])

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
        getFlowStateKeys,
        reset,
        registerLocalStateSetters,
        registerOnFlowChange,
        executionState: state.executionState,
        startExecution,
        setNodeExecutionStatus,
        clearExecutionState,
        setComponentNodes,
        hasOutdatedNodes,
        syncNodes
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
