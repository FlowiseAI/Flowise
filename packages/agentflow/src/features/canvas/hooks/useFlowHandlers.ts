import { useCallback, useRef } from 'react'
import { addEdge, Connection, EdgeChange, NodeChange } from 'reactflow'

import { getNodeColor, getUniqueNodeId, getUniqueNodeLabel, initNode, isValidConnectionAgentflowV2 } from '@/core'
import type { FlowData, FlowEdge, FlowNode, NodeData } from '@/core/types'
import { useAgentflowContext } from '@/infrastructure/store'

interface UseFlowHandlersProps {
    nodes: FlowNode[]
    edges: FlowEdge[]
    setLocalNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
    setLocalEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>
    onNodesChange: (changes: NodeChange[]) => void
    onEdgesChange: (changes: EdgeChange[]) => void
    onFlowChange?: (flow: FlowData) => void
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
    const { setDirty } = useAgentflowContext()

    // Ref to store onFlowChange callback to avoid stale closures
    const onFlowChangeRef = useRef(onFlowChange)
    onFlowChangeRef.current = onFlowChange

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

            setLocalEdges(
                (eds) =>
                    addEdge(
                        {
                            ...params,
                            type: 'agentflowEdge',
                            data: {
                                sourceColor,
                                targetColor
                            }
                        },
                        eds
                    ) as FlowEdge[]
            )
            setDirty(true)
        },
        [nodes, edges, setLocalEdges, setDirty]
    )

    // Handle node changes
    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            onNodesChange(changes)
            // Only set dirty and notify for meaningful changes (not selection or internal dimension updates)
            const meaningfulChanges = changes.filter((c) => c.type !== 'select' && c.type !== 'dimensions')
            if (meaningfulChanges.length > 0) {
                setDirty(true)
                // Use setTimeout to ensure state has updated before notifying
                setTimeout(
                    () =>
                        onFlowChangeRef.current?.({
                            nodes,
                            edges,
                            viewport: { x: 0, y: 0, zoom: 1 }
                        }),
                    0
                )
            }
        },
        [onNodesChange, setDirty, nodes, edges]
    )

    // Handle edge changes
    const handleEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            onEdgesChange(changes)
            // Only set dirty and notify for meaningful changes (not selection)
            const meaningfulChanges = changes.filter((c) => c.type !== 'select')
            if (meaningfulChanges.length > 0) {
                setDirty(true)
                setTimeout(
                    () =>
                        onFlowChangeRef.current?.({
                            nodes,
                            edges,
                            viewport: { x: 0, y: 0, zoom: 1 }
                        }),
                    0
                )
            }
        },
        [onEdgesChange, setDirty, nodes, edges]
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

            setLocalNodes((nds) => [...nds, newNode])
            setDirty(true)
        },
        [availableNodes, nodes, setLocalNodes, setDirty]
    )

    return {
        handleConnect,
        handleNodesChange,
        handleEdgesChange,
        handleAddNode
    }
}
