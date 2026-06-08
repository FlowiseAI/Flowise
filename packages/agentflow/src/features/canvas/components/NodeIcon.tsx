import { memo } from 'react'

import type { NodeData } from '@/core/types'

import { renderNodeIcon } from '../nodeIcons'

export interface NodeIconProps {
    data: NodeData
    apiBaseUrl: string
}

function NodeIconComponent({ data, apiBaseUrl }: NodeIconProps) {
    if (data.color && !data.icon) {
        return (
            <div
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: '15px',
                    backgroundColor: data.color,
                    cursor: 'grab',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                {renderNodeIcon(data)}
            </div>
        )
    }

    return (
        <div
            style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'white',
                cursor: 'grab',
                overflow: 'hidden'
            }}
        >
            <img
                style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }}
                src={`${apiBaseUrl}/api/v1/node-icon/${data.name}`}
                alt={data.name}
            />
        </div>
    )
}

export const NodeIcon = memo(NodeIconComponent)
