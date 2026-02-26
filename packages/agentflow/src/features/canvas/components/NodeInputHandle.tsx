import { memo, useMemo } from 'react'
import { Handle, Position } from 'reactflow'

export interface NodeInputHandleProps {
    nodeId: string
    nodeColor: string
    hidden?: boolean
}

// Constants for handle dimensions
const HANDLE_WIDTH = 5
const HANDLE_HEIGHT = 20
const HANDLE_OFFSET = -2

/**
 * Input handle component for agent flow nodes
 * Note: Uses inline styles because ReactFlow's Handle component doesn't support sx prop
 */
function NodeInputHandleComponent({ nodeId, nodeColor, hidden }: NodeInputHandleProps) {
    // Memoize styles to prevent object recreation on every render
    const handleStyle = useMemo(
        () => ({
            width: HANDLE_WIDTH,
            height: HANDLE_HEIGHT,
            backgroundColor: 'transparent',
            border: 'none',
            position: 'absolute' as const,
            left: HANDLE_OFFSET
        }),
        []
    )

    const innerStyle = useMemo(
        () => ({
            width: HANDLE_WIDTH,
            height: HANDLE_HEIGHT,
            backgroundColor: nodeColor,
            position: 'absolute' as const,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
        }),
        [nodeColor]
    )

    if (hidden) return null

    return (
        <Handle type='target' position={Position.Left} id={nodeId} style={handleStyle}>
            <div style={innerStyle} />
        </Handle>
    )
}

export const NodeInputHandle = memo(NodeInputHandleComponent)
