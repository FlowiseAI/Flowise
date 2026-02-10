import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Background, Handle, NodeResizer, NodeToolbar, Position, useUpdateNodeInternals } from 'reactflow'

import CancelIcon from '@mui/icons-material/Cancel'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import { Avatar, Box, ButtonGroup, Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from '@mui/material'
import { alpha, darken, lighten, styled, useTheme } from '@mui/material/styles'
import {
    IconCheck,
    IconCircleChevronRightFilled,
    IconCopy,
    IconExclamationMark,
    IconInfoCircle,
    IconLoader,
    IconTrash
} from '@tabler/icons-react'

import { MainCard } from '../../../atoms'
import { AGENTFLOW_ICONS } from '../../../core/node-config'
import type { NodeData, OutputAnchor } from '../../../core/types'
import { useAgentflowContext, useApiContext, useConfigContext } from '../../../infrastructure/store'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: (theme.palette as unknown as { card?: { main?: string } }).card?.main || theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: 'solid 1px',
    width: 'max-content',
    height: 'auto',
    padding: '10px',
    boxShadow: 'none'
}))

const StyledNodeToolbar = styled(NodeToolbar)(({ theme }) => ({
    backgroundColor: (theme.palette as unknown as { card?: { main?: string } }).card?.main || theme.palette.background.paper,
    color: theme.palette.text.primary,
    padding: '5px',
    borderRadius: '10px',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)'
}))

export interface IterationNodeProps {
    data: NodeData
}

/**
 * Iteration Node component for loop/iteration nodes in the canvas
 */
function IterationNodeComponent({ data }: IterationNodeProps) {
    const theme = useTheme()
    const { isDarkMode } = useConfigContext()
    const { instanceUrl } = useApiContext()
    const { deleteNode, duplicateNode, state } = useAgentflowContext()
    const ref = useRef<HTMLDivElement>(null)
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const updateNodeInternals = useUpdateNodeInternals()

    const [_position, setPosition] = useState(0)
    const [isHovered, setIsHovered] = useState(false)
    const [showInfoDialog, setShowInfoDialog] = useState(false)
    const [cardDimensions, setCardDimensions] = useState({
        width: '300px',
        height: '250px'
    })

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

    const defaultColor = '#666666'
    const nodeColor = data.color || defaultColor

    const getStateColor = () => {
        if (data.selected) return nodeColor
        if (isHovered) return alpha(nodeColor, 0.8)
        return alpha(nodeColor, 0.5)
    }

    const getOutputAnchors = (): OutputAnchor[] => {
        return data.outputAnchors ?? []
    }

    const getAnchorPosition = (index: number) => {
        const currentHeight = ref.current?.clientHeight || 0
        const spacing = currentHeight / (getOutputAnchors().length + 1)
        const anchorPosition = spacing * (index + 1)

        if (anchorPosition > 0) {
            updateNodeInternals(data.id)
        }

        return anchorPosition
    }

    const getMinimumHeight = () => {
        const outputCount = getOutputAnchors().length
        return Math.max(60, outputCount * 20 + 40)
    }

    const getBackgroundColor = () => {
        if (isDarkMode) {
            return isHovered ? darken(nodeColor, 0.7) : darken(nodeColor, 0.8)
        }
        return isHovered ? lighten(nodeColor, 0.8) : lighten(nodeColor, 0.9)
    }

    const getStatusBackgroundColor = (status: string) => {
        switch (status) {
            case 'ERROR':
                return theme.palette.error.dark
            case 'INPROGRESS':
                return theme.palette.warning.dark
            case 'STOPPED':
            case 'TERMINATED':
                return theme.palette.error.main
            case 'FINISHED':
                return theme.palette.success.dark
            default:
                return theme.palette.primary.dark
        }
    }

    const renderIcon = (node: NodeData) => {
        const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === node.name)
        if (!foundIcon) return null
        const IconComponent = foundIcon.icon
        return <IconComponent size={24} color='white' />
    }

    useEffect(() => {
        if (ref.current) {
            setTimeout(() => {
                setPosition((ref.current?.offsetTop || 0) + (ref.current?.clientHeight || 0) / 2)
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
                    {data.color && !data.icon ? (
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
                            {renderIcon(data)}
                        </div>
                    ) : (
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
                                src={`${instanceUrl}/api/v1/node-icon/${data.name}`}
                                alt={data.name}
                            />
                        </div>
                    )}
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
            <StyledNodeToolbar align='end'>
                <ButtonGroup sx={{ gap: 1 }} variant='outlined' aria-label='Node actions'>
                    <IconButton
                        size='small'
                        title='Duplicate'
                        onClick={() => duplicateNode(data.id)}
                        sx={{
                            color: isDarkMode ? 'white' : 'inherit',
                            '&:hover': { color: theme.palette.primary.main }
                        }}
                    >
                        <IconCopy size={20} />
                    </IconButton>
                    <IconButton
                        size='small'
                        title='Delete'
                        onClick={() => deleteNode(data.id)}
                        sx={{
                            color: isDarkMode ? 'white' : 'inherit',
                            '&:hover': { color: theme.palette.error.main }
                        }}
                    >
                        <IconTrash size={20} />
                    </IconButton>
                    <IconButton
                        size='small'
                        title='Info'
                        onClick={() => setShowInfoDialog(true)}
                        sx={{
                            color: isDarkMode ? 'white' : 'inherit',
                            '&:hover': { color: theme.palette.info.main }
                        }}
                    >
                        <IconInfoCircle size={20} />
                    </IconButton>
                </ButtonGroup>
            </StyledNodeToolbar>
            <NodeResizer minWidth={300} minHeight={Math.max(getMinimumHeight(), 250)} onResizeEnd={onResizeEnd} />
            <CardWrapper
                content={false}
                sx={{
                    borderColor: getStateColor(),
                    borderWidth: '1px',
                    boxShadow: data.selected ? `0 0 0 1px ${getStateColor()} !important` : 'none',
                    minHeight: Math.max(getMinimumHeight(), 250),
                    minWidth: 300,
                    width: cardDimensions.width,
                    height: cardDimensions.height,
                    backgroundColor: getBackgroundColor(),
                    display: 'flex',
                    '&:hover': {
                        boxShadow: data.selected ? `0 0 0 1px ${getStateColor()} !important` : 'none'
                    }
                }}
                border={false}
            >
                {data.status && (
                    <Tooltip title={data.status === 'ERROR' ? data.error || 'Error' : ''}>
                        <Avatar
                            variant='rounded'
                            sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background:
                                    data.status === 'STOPPED' || data.status === 'TERMINATED'
                                        ? 'white'
                                        : getStatusBackgroundColor(data.status),
                                color: 'white',
                                ml: 2,
                                position: 'absolute',
                                top: -10,
                                right: -10
                            }}
                        >
                            {data.status === 'INPROGRESS' ? (
                                <IconLoader className='spin-animation' />
                            ) : data.status === 'ERROR' ? (
                                <IconExclamationMark />
                            ) : data.status === 'TERMINATED' ? (
                                <CancelIcon sx={{ color: getStatusBackgroundColor(data.status), fontSize: 16 }} />
                            ) : data.status === 'STOPPED' ? (
                                <StopCircleIcon sx={{ color: getStatusBackgroundColor(data.status), fontSize: 16 }} />
                            ) : (
                                <IconCheck />
                            )}
                        </Avatar>
                    </Tooltip>
                )}

                <Box sx={{ width: '100%' }}>
                    {!data.hideInput && (
                        <Handle
                            type='target'
                            position={Position.Left}
                            id={data.id}
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
                    )}
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
                    {getOutputAnchors().map((outputAnchor, index) => (
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
                </Box>
            </CardWrapper>

            {/* Simple Info Dialog */}
            <Dialog open={showInfoDialog} onClose={() => setShowInfoDialog(false)} maxWidth='sm' fullWidth>
                <DialogTitle>{data.label}</DialogTitle>
                <DialogContent>
                    <Typography variant='body2' color='text.secondary'>
                        <strong>Name:</strong> {data.name}
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                        <strong>ID:</strong> {data.id}
                    </Typography>
                    {data.description && (
                        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                            <strong>Description:</strong> {data.description}
                        </Typography>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export const IterationNode = memo(IterationNodeComponent)
export default IterationNode
