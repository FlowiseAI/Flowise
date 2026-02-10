import { memo, useEffect, useRef, useState } from 'react'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'

import { Box, Typography } from '@mui/material'
import { alpha, darken, lighten, useTheme } from '@mui/material/styles'
import { IconCircleChevronRightFilled } from '@tabler/icons-react'

import type { NodeData, OutputAnchor } from '../../../core/types'
import { useApiContext, useConfigContext } from '../../../infrastructure/store'
import { NodeInfoDialog } from '../components/NodeInfoDialog'
import { NodeModelConfigs } from '../components/NodeModelConfigs'
import { NodeStatusIndicator, NodeWarningIndicator } from '../components/NodeStatusIndicator'
import { NodeToolbarActions } from '../components/NodeToolbarActions'
import { renderNodeIcon } from '../nodeIcons'
import { CardWrapper } from '../styled'

export interface AgentFlowNodeProps {
    data: NodeData
}

/**
 * Agent Flow Node component for rendering nodes in the canvas
 */
function AgentFlowNodeComponent({ data }: AgentFlowNodeProps) {
    const theme = useTheme()
    const { isDarkMode } = useConfigContext()
    const { instanceUrl } = useApiContext()
    const ref = useRef<HTMLDivElement>(null)
    const updateNodeInternals = useUpdateNodeInternals()

    const [isHovered, setIsHovered] = useState(false)
    const [warningMessage, setWarningMessage] = useState('')
    const [showInfoDialog, setShowInfoDialog] = useState(false)

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

    useEffect(() => {
        if (ref.current) {
            setTimeout(() => {
                updateNodeInternals(data.id)
            }, 10)
        }
    }, [data, ref, updateNodeInternals])

    useEffect(() => {
        if (data.warning) {
            setWarningMessage(data.warning)
        } else {
            setWarningMessage('')
        }
    }, [data.name, data.version, data.warning])

    return (
        <div
            ref={ref}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ position: 'relative', width: 'fit-content' }}
        >
            <NodeToolbarActions
                nodeId={data.id}
                nodeName={data.name}
                isVisible={data.selected || isHovered}
                onInfoClick={() => setShowInfoDialog(true)}
            />

            <CardWrapper
                content={false}
                sx={{
                    width: 'max-content',
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
                <NodeStatusIndicator status={data.status} error={data.error} />
                <NodeWarningIndicator message={warningMessage} />

                <Box sx={{ width: 'max-content', flexShrink: 0 }}>
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
                        <Box style={{ padding: 10 }}>
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
                                    {renderNodeIcon(data)}
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
                            <NodeModelConfigs inputs={data.inputs} />
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

export const AgentFlowNode = memo(AgentFlowNodeComponent)
export default AgentFlowNode
