import React, { useContext, memo, useRef, useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Handle, Position, useUpdateNodeInternals, NodeToolbar } from 'reactflow'
import { styled, useTheme, alpha, darken, lighten } from '@mui/material/styles'
import { ButtonGroup, Avatar, Box, Typography, IconButton, Tooltip } from '@mui/material'
import MainCard from './MainCard'
import { flowContext } from '../AgentflowProvider'
import NodeInfoDialog from './NodeInfoDialog'
import {
    IconCheck,
    IconExclamationMark,
    IconCircleChevronRightFilled,
    IconCopy,
    IconTrash,
    IconInfoCircle,
    IconLoader,
    IconAlertCircleFilled,
    IconCode,
    IconWorldWww,
    IconPhoto,
    IconBrandGoogle,
    IconBrowserCheck
} from '@tabler/icons-react'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { AGENTFLOW_ICONS } from '../constants/agentflow'
import { RootState } from '../store'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.palette.text.primary,
    border: 'solid 1px',
    width: 'max-content',
    height: 'auto',
    padding: '10px',
    boxShadow: 'none'
}))

const StyledNodeToolbar = styled(NodeToolbar)(({ theme }) => ({
    backgroundColor: theme.palette.card.main,
    color: theme.palette.text.primary,
    padding: '5px',
    borderRadius: '10px',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)'
}))

interface AgentFlowNodeProps {
    data: any
}

const AgentFlowNode: React.FC<AgentFlowNodeProps> = ({ data }) => {
    const theme = useTheme()
    const customization = useSelector((state: RootState) => state.customization)
    const canvas = useSelector((state: RootState) => state.canvas)
    const ref = useRef<HTMLDivElement>(null)
    const updateNodeInternals = useUpdateNodeInternals()
    const [position, setPosition] = useState(0)
    const [isHovered, setIsHovered] = useState(false)
    const [warningMessage, setWarningMessage] = useState('')
    const { deleteNode, duplicateNode } = useContext(flowContext)
    const [showInfoDialog, setShowInfoDialog] = useState(false)
    const [infoDialogProps, setInfoDialogProps] = useState({})

    const defaultColor = '#666666'
    const nodeColor = data.color || defaultColor

    const getStateColor = () => {
        if (data.selected) return nodeColor
        if (isHovered) return alpha(nodeColor, 0.8)
        return alpha(nodeColor, 0.5)
    }

    const getOutputAnchors = () => {
        return data.outputAnchors ?? []
    }

    const getAnchorPosition = (index: number) => {
        const currentHeight = ref.current?.clientHeight || 0
        const spacing = currentHeight / (getOutputAnchors().length + 1)
        const position = spacing * (index + 1)

        if (position > 0) {
            updateNodeInternals(data.id)
        }

        return position
    }

    const getMinimumHeight = () => {
        const outputCount = getOutputAnchors().length
        return Math.max(60, outputCount * 20 + 40)
    }

    const getBackgroundColor = () => {
        if (customization.isDarkMode) {
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

    const renderIcon = (node: any) => {
        const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === node.name)
        if (!foundIcon || !foundIcon.icon) return null
        const IconComponent = foundIcon.icon
        return <IconComponent size={24} color={'white'} />
    }

    const getBuiltInOpenAIToolIcon = (toolName: string) => {
        switch (toolName) {
            case 'web_search_preview':
                return <IconWorldWww size={14} color={'white'} />
            case 'code_interpreter':
                return <IconCode size={14} color={'white'} />
            case 'image_generation':
                return <IconPhoto size={14} color={'white'} />
            default:
                return null
        }
    }

    const getBuiltInGeminiToolIcon = (toolName: string) => {
        switch (toolName) {
            case 'urlContext':
                return <IconWorldWww size={14} color={'white'} />
            case 'googleSearch':
                return <IconBrandGoogle size={14} color={'white'} />
            case 'codeExecution':
                return <IconCode size={14} color={'white'} />
            default:
                return null
        }
    }

    const getBuiltInAnthropicToolIcon = (toolName: string) => {
        switch (toolName) {
            case 'web_search_20250305':
                return <IconWorldWww size={14} color={'white'} />
            case 'web_fetch_20250910':
                return <IconBrowserCheck size={14} color={'white'} />
            default:
                return null
        }
    }

    useEffect(() => {
        if (ref.current) {
            setTimeout(() => {
                setPosition(ref.current?.offsetTop! + ref.current?.clientHeight! / 2)
                updateNodeInternals(data.id)
            }, 10)
        }
    }, [data, ref, updateNodeInternals])

    useEffect(() => {
        const nodeOutdatedMessage = (oldVersion: number, newVersion: number) =>
            `Node version ${oldVersion} outdated\nUpdate to latest version ${newVersion}`
        const nodeVersionEmptyMessage = (newVersion: number) => `Node outdated\nUpdate to latest version ${newVersion}`

        const componentNode = canvas.componentNodes.find((nd: any) => nd.name === data.name)
        if (componentNode) {
            if (!data.version) {
                setWarningMessage(nodeVersionEmptyMessage(componentNode.version))
            } else if (data.version && componentNode.version > data.version) {
                setWarningMessage(nodeOutdatedMessage(data.version, componentNode.version))
            } else if (componentNode.badge === 'DEPRECATING') {
                setWarningMessage(
                    componentNode?.deprecateMessage ??
                        'This node will be deprecated in the next release. Change to a new node tagged with NEW'
                )
            } else if (componentNode.warning) {
                setWarningMessage(componentNode.warning)
            } else {
                setWarningMessage('')
            }
        }
    }, [canvas.componentNodes, data.name, data.version])

    return (
        <div ref={ref} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <StyledNodeToolbar>
                <ButtonGroup sx={{ gap: 1 }} variant='outlined'>
                    {data.name !== 'startAgentflow' && (
                        <IconButton
                            size={'small'}
                            title='Duplicate'
                            onClick={() => duplicateNode(data.id)}
                            sx={{
                                color: customization.isDarkMode ? 'white' : 'inherit',
                                '&:hover': {
                                    color: theme.palette.primary.main
                                }
                            }}
                        >
                            <IconCopy size={20} />
                        </IconButton>
                    )}
                    <IconButton
                        size={'small'}
                        title='Delete'
                        onClick={() => deleteNode(data.id)}
                        sx={{
                            color: customization.isDarkMode ? 'white' : 'inherit',
                            '&:hover': {
                                color: theme.palette.error.main
                            }
                        }}
                    >
                        <IconTrash size={20} />
                    </IconButton>
                    <IconButton
                        size={'small'}
                        title='Info'
                        onClick={() => {
                            setInfoDialogProps({ data })
                            setShowInfoDialog(true)
                        }}
                        sx={{
                            color: customization.isDarkMode ? 'white' : 'inherit',
                            '&:hover': {
                                color: theme.palette.info.main
                            }
                        }}
                    >
                        <IconInfoCircle size={20} />
                    </IconButton>
                </ButtonGroup>
            </StyledNodeToolbar>
            <CardWrapper
                content={false}
                sx={{
                    borderColor: getStateColor(),
                    borderWidth: '1px',
                    boxShadow: data.selected ? `0 0 0 1px ${getStateColor()} !important` : 'none',
                    minHeight: getMinimumHeight(),
                    height: 'auto',
                    backgroundColor: getBackgroundColor(),
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': {
                        boxShadow: data.selected ? `0 0 0 1px ${getStateColor()} !important` : 'none'
                    }
                }}
                border={false}
            >
                {data && data.status && (
                    <Tooltip title={data.status === 'ERROR' ? data.error || 'Error' : ''}>
                        <Avatar
                            variant='rounded'
                            sx={{
                                width: 24,
                                height: 24,
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
                                <CancelIcon sx={{ color: getStatusBackgroundColor(data.status) }} />
                            ) : data.status === 'STOPPED' ? (
                                <StopCircleIcon sx={{ color: getStatusBackgroundColor(data.status) }} />
                            ) : (
                                <IconCheck />
                            )}
                        </Avatar>
                    </Tooltip>
                )}

                {warningMessage && (
                    <Tooltip placement='right-start' title={<span style={{ whiteSpace: 'pre-line' }}>{warningMessage}</span>}>
                        <Avatar
                            variant='rounded'
                            sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: 'white',
                                position: 'absolute',
                                top: -10,
                                left: -10
                            }}
                        >
                            <IconAlertCircleFilled color='orange' />
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
                        <Box style={{ width: 50 }}>
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '15px',
                                    backgroundColor: data.color,
                                    cursor: 'grab',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    background: data.color
                                }}
                            >
                                {renderIcon(data)}
                            </div>
                        </Box>
                        <Box>
                            <Typography
                                sx={{
                                    fontSize: '0.85rem',
                                    fontWeight: 500
                                }}
                            >
                                {data.label}
                            </Typography>
                        </Box>
                    </div>
                    {getOutputAnchors().map((outputAnchor: any, index: number) => {
                        return (
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
                        )
                    })}
                </Box>
            </CardWrapper>
            <NodeInfoDialog show={showInfoDialog} dialogProps={infoDialogProps} onCancel={() => setShowInfoDialog(false)} />
        </div>
    )
}

export default memo(AgentFlowNode)
