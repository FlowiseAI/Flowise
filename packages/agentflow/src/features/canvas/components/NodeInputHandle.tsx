import { memo } from 'react'
import { Handle, Position } from 'reactflow'

export interface NodeInputHandleProps {
    nodeId: string
    nodeColor: string
    hidden?: boolean
}

function NodeInputHandleComponent({ nodeId, nodeColor, hidden }: NodeInputHandleProps) {
    if (hidden) return null

    return (
        <Handle
            type='target'
            position={Position.Left}
            id={nodeId}
            style={{
                width: 5,
                height: 20,
                backgroundColor: 'transparent',
                border: 'none',
                position: 'absolute',
                left: -2
            }}
        >
            <div
                style={{
                    width: 5,
                    height: 20,
                    backgroundColor: nodeColor,
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                }}
            />
        </Handle>
    )
}

export const NodeInputHandle = memo(NodeInputHandleComponent)
