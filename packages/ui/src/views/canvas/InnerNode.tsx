import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

// 内部节点组件
export const InnerNode: React.FC<NodeProps> = ({ data }) => {
    return (
        <div
            style={{
                padding: '10px',
                background: '#fff',
                border: '1px solid #e5e5e5',
                borderRadius: '4px'
            }}
        >
            <Handle type='target' position={Position.Left} />
            <div>{data?.label}</div>
            <Handle type='source' position={Position.Right} />
        </div>
    )
}
