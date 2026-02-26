import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Background, NodeResizer, NodeToolbar, useUpdateNodeInternals } from 'reactflow'

import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import type { NodeData } from '@/core/types'
import { useAgentflowContext, useApiContext, useConfigContext } from '@/infrastructure/store'

import { NodeIcon } from '../components/NodeIcon'
import { NodeInfoDialog } from '../components/NodeInfoDialog'
import { NodeInputHandle } from '../components/NodeInputHandle'
import { getMinimumNodeHeight, NodeOutputHandles } from '../components/NodeOutputHandles'
import { NodeStatusIndicator } from '../components/NodeStatusIndicator'
import { NodeToolbarActions } from '../components/NodeToolbarActions'
import { useNodeColors } from '../hooks/useNodeColors'
import { CardWrapper } from '../styled'

export interface IterationNodeProps {
    data: NodeData
}

/**
 * Iteration Node component for loop/iteration nodes in the canvas
 */
function IterationNodeComponent({ data }: IterationNodeProps) {
    const theme = useTheme()
    const { isDarkMode } = useConfigContext()
    const { apiBaseUrl } = useApiContext()
    const { state } = useAgentflowContext()
    const ref = useRef<HTMLDivElement>(null)
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const updateNodeInternals = useUpdateNodeInternals()

    const [isHovered, setIsHovered] = useState(false)
    const [showInfoDialog, setShowInfoDialog] = useState(false)
    const [cardDimensions, setCardDimensions] = useState({
        width: '300px',
        height: '250px'
    })

    const { nodeColor, stateColor, backgroundColor } = useNodeColors({
        nodeColor: data.color,
        selected: data.selected,
        isDarkMode,
        isHovered
    })

    const outputAnchors = data.outputAnchors ?? []
    const minHeight = Math.max(getMinimumNodeHeight(outputAnchors.length), 250)

    useEffect(() => {
        if (state.reactFlowInstance) {
            const node = state.reactFlowInstance.getNodes().find((n) => n.id === data.id)
            if (node && node.width && node.height) {
                setCardDimensions({
                    width: `${node.width}px`,
                    height: `${node.height}px`
                })
            }
        }
    }, [state.reactFlowInstance, data.id])

    useEffect(() => {
        if (ref.current) {
            setTimeout(() => {
                updateNodeInternals(data.id)
            }, 10)
        }
    }, [data, ref, updateNodeInternals])

    const onResizeEnd = useCallback(
        (e: unknown, params: { width: number; height: number }) => {
            if (!ref.current) return
            setCardDimensions({
                width: `${params.width}px`,
                height: `${params.height}px`
            })
        },
        [ref]
    )

    return (
        <div ref={ref} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <NodeToolbar align='start' isVisible={true}>
                <Box style={{ display: 'flex', alignItems: 'center', flexDirection: 'row' }}>
                    <NodeIcon data={data} apiBaseUrl={apiBaseUrl} />
                    <Typography
                        sx={{
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            ml: 1
                        }}
                    >
                        {data.label}
                    </Typography>
                </Box>
            </NodeToolbar>
            <NodeToolbarActions
                nodeId={data.id}
                nodeName={data.name}
                isVisible={data.selected || isHovered}
                onInfoClick={() => setShowInfoDialog(true)}
            />
            <NodeResizer minWidth={300} minHeight={minHeight} onResizeEnd={onResizeEnd} />
            <CardWrapper
                content={false}
                sx={{
                    borderColor: stateColor,
                    borderWidth: '1px',
                    boxShadow: data.selected ? `0 0 0 1px ${stateColor} !important` : 'none',
                    minHeight,
                    minWidth: 300,
                    width: cardDimensions.width,
                    height: cardDimensions.height,
                    backgroundColor,
                    display: 'flex',
                    '&:hover': {
                        boxShadow: data.selected ? `0 0 0 1px ${stateColor} !important` : 'none'
                    }
                }}
                border={false}
            >
                <NodeStatusIndicator status={data.status} error={data.error} />

                <Box sx={{ width: '100%' }}>
                    <NodeInputHandle nodeId={data.id} nodeColor={nodeColor} hidden={data.hideInput} />
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <Box
                            sx={{
                                height: `calc(${cardDimensions.height} - 20px)`,
                                width: `${cardDimensions.width}`,
                                overflow: 'hidden',
                                position: 'relative',
                                borderRadius: '10px'
                            }}
                        >
                            <div
                                ref={reactFlowWrapper}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: theme.palette.background.default
                                }}
                            >
                                <Background color='#aaa' gap={16} />
                            </div>
                        </Box>
                    </div>
                    <NodeOutputHandles
                        outputAnchors={outputAnchors}
                        nodeColor={nodeColor}
                        isHovered={isHovered}
                        nodeRef={ref}
                        nodeId={data.id}
                    />
                </Box>
            </CardWrapper>

            <NodeInfoDialog
                open={showInfoDialog}
                onClose={() => setShowInfoDialog(false)}
                label={data.label}
                name={data.name}
                nodeId={data.id}
                description={data.description}
            />
        </div>
    )
}

export const IterationNode = memo(IterationNodeComponent)
export default IterationNode
