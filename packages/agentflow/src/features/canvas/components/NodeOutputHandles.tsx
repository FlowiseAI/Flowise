import type { RefObject } from 'react'
import { memo } from 'react'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'

import { useTheme } from '@mui/material/styles'
import { IconCircleChevronRightFilled } from '@tabler/icons-react'

import type { OutputAnchor } from '../../../core/types'

export interface NodeOutputHandlesProps {
    outputAnchors: OutputAnchor[]
    nodeColor: string
    isHovered: boolean
    nodeRef: RefObject<HTMLDivElement | null>
    nodeId: string
}

/**
 * Calculate the minimum height needed for a node based on output anchor count
 */
export function getMinimumNodeHeight(outputCount: number): number {
    return Math.max(60, outputCount * 20 + 40)
}

function NodeOutputHandlesComponent({ outputAnchors, nodeColor, isHovered, nodeRef, nodeId }: NodeOutputHandlesProps) {
    const theme = useTheme()
    const updateNodeInternals = useUpdateNodeInternals()

    const getAnchorPosition = (index: number) => {
        const currentHeight = nodeRef.current?.clientHeight || 0
        const spacing = currentHeight / (outputAnchors.length + 1)
        const anchorPosition = spacing * (index + 1)

        if (anchorPosition > 0) {
            updateNodeInternals(nodeId)
        }

        return anchorPosition
    }

    return (
        <>
            {outputAnchors.map((outputAnchor, index) => (
                <Handle
                    type='source'
                    position={Position.Right}
                    key={outputAnchor.id}
                    id={outputAnchor.id}
                    style={{
                        height: 20,
                        width: 20,
                        top: getAnchorPosition(index),
                        backgroundColor: 'transparent',
                        border: 'none',
                        position: 'absolute',
                        right: -10,
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 0.2s'
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: theme.palette.background.paper,
                            pointerEvents: 'none'
                        }}
                    />
                    <IconCircleChevronRightFilled
                        size={20}
                        color={nodeColor}
                        style={{
                            pointerEvents: 'none',
                            position: 'relative',
                            zIndex: 1
                        }}
                    />
                </Handle>
            ))}
        </>
    )
}

export const NodeOutputHandles = memo(NodeOutputHandlesComponent)
