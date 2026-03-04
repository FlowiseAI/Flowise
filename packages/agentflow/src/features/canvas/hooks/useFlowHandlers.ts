import { useCallback, useRef } from 'react'
import { addEdge, applyEdgeChanges, applyNodeChanges, Connection, EdgeChange, Node, NodeChange } from 'reactflow'

import { getNodeColor, getUniqueNodeId, getUniqueNodeLabel, initNode, isValidConnectionAgentflowV2 } from '@/core'
import type { FlowDataCallback, FlowEdge, FlowNode, NodeData } from '@/core/types'
import { useAgentflowContext } from '@/infrastructure/store'

interface UseFlowHandlersProps {
    nodes: FlowNode[]
    edges: FlowEdge[]
    setLocalNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
    setLocalEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>
    onNodesChange: (changes: NodeChange[]) => void
    onEdgesChange: (changes: EdgeChange[]) => void
    onFlowChange?: FlowDataCallback
    availableNodes: NodeData[]
}

/**
 * Hook for handling flow connection and change events
 */
export function useFlowHandlers({
    nodes,
    edges,
    setLocalNodes,
    setLocalEdges,
    onNodesChange,
    onEdgesChange,
    onFlowChange,
    availableNodes
}: UseFlowHandlersProps) {
    const { state, setDirty } = useAgentflowContext()

    // Ref to store onFlowChange callback to avoid stale closures
    const onFlowChangeRef = useRef(onFlowChange)
    onFlowChangeRef.current = onFlowChange

    /** Get the current viewport from the ReactFlow instance, with a fallback */
    const getViewport = useCallback(() => {
        return state.reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
    }, [state.reactFlowInstance])

    // Handle connection
    const handleConnect = useCallback(
        (params: Connection) => {
            if (!params.source || !params.target) {
                return
            }
            if (!isValidConnectionAgentflowV2({ source: params.source, target: params.target }, nodes, edges)) {
                return
            }

            const sourceNode = nodes.find((n) => n.id === params.source)
            const targetNode = nodes.find((n) => n.id === params.target)

            const sourceColor = getNodeColor(sourceNode?.data?.name || '')
            const targetColor = getNodeColor(targetNode?.data?.name || '')

            const newEdge = {
                ...params,
                type: 'agentflowEdge',
                data: {
                    sourceColor,
                    targetColor
                }
            }
            // Use functional updater to avoid stale edge state from rapid sequential connections
            let updatedEdges: FlowEdge[] = []
            setLocalEdges((currentEdges) => {
                updatedEdges = addEdge(newEdge, currentEdges) as FlowEdge[]
                return updatedEdges
            })
            setDirty(true)

            // Notify parent of flow change
            onFlowChangeRef.current?.({
                nodes,
                edges: updatedEdges,
                viewport: getViewport()
            })
        },
        [nodes, edges, setLocalEdges, setDirty, getViewport]
    )

    // Handle node changes
    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            onNodesChange(changes)
            // Only set dirty and notify for meaningful changes
            // Skip: selection, dimension updates, and position changes (handled by onNodeDragStop)
            const meaningfulChanges = changes.filter((c) => c.type !== 'select' && c.type !== 'dimensions' && c.type !== 'position')
            if (meaningfulChanges.length > 0) {
                setDirty(true)
                // Compute the updated nodes by applying changes to current state
                const updatedNodes = applyNodeChanges(changes, nodes) as FlowNode[]
                onFlowChangeRef.current?.({
                    nodes: updatedNodes,
                    edges,
                    viewport: getViewport()
                })
            }
        },
        [onNodesChange, setDirty, nodes, edges, getViewport]
    )

    // Handle node drag stop — fires onFlowChange once when drag ends (instead of on every frame)
    const handleNodeDragStop = useCallback(
        (_event: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
            if (draggedNodes.length === 0) return
            // Apply final positions to current nodes
            const updatedNodes = nodes.map((n) => {
                const dragged = draggedNodes.find((d) => d.id === n.id)
                return dragged ? { ...n, position: dragged.position } : n
            })
            setDirty(true)
            onFlowChangeRef.current?.({
                nodes: updatedNodes as FlowNode[],
                edges,
                viewport: getViewport()
            })
        },
        [nodes, edges, setDirty, getViewport]
    )

    // Handle edge changes
    const handleEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            onEdgesChange(changes)
            // Only set dirty and notify for meaningful changes (not selection)
            const meaningfulChanges = changes.filter((c) => c.type !== 'select')
            if (meaningfulChanges.length > 0) {
                setDirty(true)
                // Compute the updated edges by applying changes to current state
                const updatedEdges = applyEdgeChanges(changes, edges) as FlowEdge[]
                onFlowChangeRef.current?.({
                    nodes,
                    edges: updatedEdges,
                    viewport: getViewport()
                })
            }
        },
        [onEdgesChange, setDirty, nodes, edges, getViewport]
    )

    // Handle add node from palette
    const handleAddNode = useCallback(
        (nodeType: string, position?: { x: number; y: number }) => {
            const nodeData = availableNodes.find((n) => n.name === nodeType)
            if (!nodeData) return

            const newId = getUniqueNodeId(nodeData, nodes)
            const newLabel = getUniqueNodeLabel(nodeData, nodes)
            const initializedData = initNode(nodeData, newId, true)
            const newNode: FlowNode = {
                id: newId,
                type: 'agentflowNode',
                position: position || { x: 100, y: 100 },
                data: { ...initializedData, label: newLabel }
            }

            // Use functional updater to avoid stale node state from rapid sequential additions
            let updatedNodes: FlowNode[] = []
            setLocalNodes((currentNodes) => {
                updatedNodes = [...currentNodes, newNode]
                return updatedNodes
            })
            setDirty(true)

            // Notify parent of flow change
            onFlowChangeRef.current?.({
                nodes: updatedNodes,
                edges,
                viewport: getViewport()
            })
        },
        [availableNodes, nodes, edges, setLocalNodes, setDirty, getViewport]
    )

    return {
        handleConnect,
        handleNodesChange,
        handleNodeDragStop,
        handleEdgesChange,
        handleAddNode
    }
}
