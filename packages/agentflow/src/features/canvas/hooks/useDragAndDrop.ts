import { RefObject, useCallback } from 'react'
import { useReactFlow } from 'reactflow'

import { getUniqueNodeId, getUniqueNodeLabel, initNode, resolveNodeType } from '@/core'
import type { FlowNode, NodeData } from '@/core/types'
import { checkNodePlacementConstraints, findParentIterationNode } from '@/core/validation'
import { useAgentflowContext } from '@/infrastructure/store'

// Offset to center the dropped node on the cursor position.
// Approximate half of a typical node's width/height.
export const DROP_OFFSET_X = 100
export const DROP_OFFSET_Y = 50

interface UseDragAndDropProps {
    nodes: FlowNode[]
    setLocalNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
    reactFlowWrapper: RefObject<HTMLDivElement>
    onConstraintViolation?: (message: string) => void
}

/**
 * Hook for handling drag and drop of nodes onto the canvas
 */
export function useDragAndDrop({ nodes, setLocalNodes, reactFlowWrapper, onConstraintViolation }: UseDragAndDropProps) {
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

                // project() is used instead of screenToFlowPosition() because
                // screenToFlowPosition applies viewport transform differently,
                // causing incorrect drop placement in this context.
                const position = reactFlowInstance.project({
                    x: event.clientX - reactFlowBounds.left - DROP_OFFSET_X,
                    y: event.clientY - reactFlowBounds.top - DROP_OFFSET_Y
                })

                // Check placement constraints (start node, nested iteration, human input in iteration)
                const constraintCheck = checkNodePlacementConstraints(nodes, nodeData.name, position)
                if (!constraintCheck.valid) {
                    onConstraintViolation?.(constraintCheck.message!)
                    return
                }

                // Determine if dropped inside an iteration node
                const parentNode = findParentIterationNode(nodes, position)

                const newId = getUniqueNodeId(nodeData, nodes)
                const newLabel = getUniqueNodeLabel(nodeData, nodes)
                const initializedData = initNode(nodeData, newId, true)

                const newNode: FlowNode = {
                    id: newId,
                    type: resolveNodeType(nodeData.type ?? ''),
                    position: parentNode ? { x: position.x - parentNode.position.x, y: position.y - parentNode.position.y } : position,
                    data: { ...initializedData, label: newLabel },
                    ...(parentNode ? { parentNode: parentNode.id, extent: 'parent' as const } : {})
                }

                setLocalNodes((nds) => [...nds, newNode])
                setDirty(true)
            } catch (error) {
                console.error('[Agentflow] Failed to parse dropped node data:', error)
            }
        },
        [nodes, reactFlowInstance, setLocalNodes, setDirty, reactFlowWrapper, onConstraintViolation]
    )

    return {
        handleDragOver,
        handleDrop
    }
}
