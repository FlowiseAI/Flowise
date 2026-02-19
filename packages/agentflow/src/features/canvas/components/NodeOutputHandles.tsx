import type { CSSProperties, RefObject } from 'react'
import { memo, useMemo } from 'react'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'

import { useTheme } from '@mui/material/styles'
import { IconCircleChevronRightFilled } from '@tabler/icons-react'

import type { OutputAnchor } from '@/core/types'

export interface NodeOutputHandlesProps {
    outputAnchors: OutputAnchor[]
    nodeColor: string
    isHovered: boolean
    nodeRef: RefObject<HTMLDivElement | null>
    nodeId: string
}

// Constants for handle dimensions and positioning
const HANDLE_SIZE = 20
const HANDLE_OFFSET = -10
const MIN_NODE_HEIGHT = 60
const SPACING_PER_OUTPUT = 20
const BASE_HEIGHT_OFFSET = 40
const TRANSITION_DURATION = '0.2s'

/**
 * Calculate the minimum height needed for a node based on output anchor count
 */
export function getMinimumNodeHeight(outputCount: number): number {
    return Math.max(MIN_NODE_HEIGHT, outputCount * SPACING_PER_OUTPUT + BASE_HEIGHT_OFFSET)
}

/**
 * Output handles component for agent flow nodes
 * Note: Uses inline styles because ReactFlow's Handle component doesn't support sx prop
 */
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

    // Memoize static styles
    const backgroundCircleStyle: CSSProperties = useMemo(
        () => ({
            position: 'absolute',
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            borderRadius: '50%',
            backgroundColor: theme.palette.background.paper,
            pointerEvents: 'none'
        }),
        [theme.palette.background.paper]
    )

    const iconStyle: CSSProperties = useMemo(
        () => ({
            pointerEvents: 'none',
            position: 'relative',
            zIndex: 1
        }),
        []
    )

    return (
        <>
            {outputAnchors.map((outputAnchor, index) => {
                // Create handle style for each anchor (position is dynamic)
                const handleStyle: CSSProperties = {
                    height: HANDLE_SIZE,
                    width: HANDLE_SIZE,
                    top: getAnchorPosition(index),
                    backgroundColor: 'transparent',
                    border: 'none',
                    position: 'absolute',
                    right: HANDLE_OFFSET,
                    opacity: isHovered ? 1 : 0,
                    transition: `opacity ${TRANSITION_DURATION}`
                }

                return (
                    <Handle type='source' position={Position.Right} key={outputAnchor.id} id={outputAnchor.id} style={handleStyle}>
                        <div style={backgroundCircleStyle} />
                        <IconCircleChevronRightFilled size={HANDLE_SIZE} color={nodeColor} style={iconStyle} />
                    </Handle>
                )
            })}
        </>
    )
}

export const NodeOutputHandles = memo(NodeOutputHandlesComponent)
