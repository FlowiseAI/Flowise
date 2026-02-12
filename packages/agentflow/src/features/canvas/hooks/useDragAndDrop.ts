import { RefObject, useCallback } from 'react'
import { useReactFlow } from 'reactflow'

import { getUniqueNodeId, initNode } from '../../../core'
import type { FlowNode, NodeData } from '../../../core/types'
import { useAgentflowContext } from '../../../infrastructure/store'

interface UseDragAndDropProps {
    nodes: FlowNode[]
    setLocalNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
    reactFlowWrapper: RefObject<HTMLDivElement>
}

/**
 * Hook for handling drag and drop of nodes onto the canvas
 */
export function useDragAndDrop({ nodes, setLocalNodes, reactFlowWrapper }: UseDragAndDropProps) {
    const { setDirty } = useAgentflowContext()
    const reactFlowInstance = useReactFlow()

    // Handle drag over for drop zone
    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    // Handle drop from AddNodesDrawer
    const handleDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault()

            const nodeDataStr = event.dataTransfer.getData('application/reactflow')
            if (!nodeDataStr) return

            try {
                const nodeData = JSON.parse(nodeDataStr) as NodeData

                // Get drop position relative to the canvas
                const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
                if (!reactFlowBounds) return

                const position = reactFlowInstance.screenToFlowPosition({
                    x: event.clientX - reactFlowBounds.left,
                    y: event.clientY - reactFlowBounds.top
                })

                const newId = getUniqueNodeId(nodeData, nodes)
                const initializedData = initNode(nodeData, newId, true)
                const newNode: FlowNode = {
                    id: newId,
                    type: 'agentflowNode',
                    position,
                    data: initializedData
                }

                setLocalNodes((nds) => [...nds, newNode])
                setDirty(true)
            } catch (error) {
                console.error('[Agentflow] Failed to parse dropped node data:', error)
            }
        },
        [nodes, reactFlowInstance, setLocalNodes, setDirty, reactFlowWrapper]
    )

    return {
        handleDragOver,
        handleDrop
    }
}
