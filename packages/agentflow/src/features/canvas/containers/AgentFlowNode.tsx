import { memo, useEffect, useRef, useState } from 'react'

import { Box, Typography } from '@mui/material'

import { tokens } from '@/core/theme/tokens'
import type { NodeData } from '@/core/types'
import { useApiContext, useConfigContext } from '@/infrastructure/store'

import { NodeIcon } from '../components/NodeIcon'
import { NodeInputHandle } from '../components/NodeInputHandle'
import { NodeModelConfigs } from '../components/NodeModelConfigs'
import { getMinimumNodeHeight, NodeOutputHandles } from '../components/NodeOutputHandles'
import { NodeStatusIndicator, NodeWarningIndicator } from '../components/NodeStatusIndicator'
import { NodeToolbarActions } from '../components/NodeToolbarActions'
import { useOpenNodeEditor } from '../hooks'
import { useNodeColors } from '../hooks/useNodeColors'
import { CardWrapper } from '../styled'

import { NodeInfoDialog } from './NodeInfoDialog'

/** Width of the node icon container in pixels (theme.spacing(6.25) = 50px) */
const NODE_ICON_CONTAINER_WIDTH = 50

export interface AgentFlowNodeProps {
    data: NodeData
}

/**
 * Agent Flow Node component for rendering nodes in the canvas
 */
function AgentFlowNodeComponent({ data }: AgentFlowNodeProps) {
    const { isDarkMode } = useConfigContext()
    const { apiBaseUrl } = useApiContext()
    const ref = useRef<HTMLDivElement>(null)
    const { openNodeEditor } = useOpenNodeEditor()

    const [isHovered, setIsHovered] = useState(false)
    const [warningMessage, setWarningMessage] = useState('')
    const [showInfoDialog, setShowInfoDialog] = useState(false)

    const { nodeColor, stateColor, backgroundColor } = useNodeColors({
        nodeColor: data.color,
        selected: data.selected,
        isDarkMode,
        isHovered
    })

    const handleDoubleClick = () => {
        openNodeEditor(data.id)
    }

    const hasValidationErrors = (data.validationErrors?.length ?? 0) > 0
    const outputAnchors = data.outputAnchors ?? []
    const minHeight = getMinimumNodeHeight(outputAnchors.length)

    useEffect(() => {
        const messages: string[] = []
        if (data.warning) messages.push(data.warning)
        if (data.validationErrors?.length) messages.push(...data.validationErrors)
        setWarningMessage(messages.join('\n'))
    }, [data.name, data.version, data.warning, data.validationErrors])

    return (
        <div ref={ref} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onDoubleClick={handleDoubleClick}>
            <NodeToolbarActions
                nodeId={data.id}
                nodeName={data.name}
                isVisible={data.selected || isHovered}
                onInfoClick={() => setShowInfoDialog(true)}
            />

            <CardWrapper
                content={false}
                sx={{
                    borderColor: hasValidationErrors ? tokens.colors.border.validation : stateColor,
                    borderWidth: hasValidationErrors ? '2px' : '1px',
                    boxShadow: data.selected ? `0 0 0 1px ${stateColor} !important` : 'none',
                    minHeight,
                    height: 'auto',
                    backgroundColor,
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': {
                        boxShadow: data.selected ? `0 0 0 1px ${stateColor} !important` : 'none'
                    }
                }}
                border={false}
            >
                <NodeStatusIndicator status={data.status} error={data.error} />
                <NodeWarningIndicator message={warningMessage} />

                <Box sx={{ width: '100%' }}>
                    <NodeInputHandle nodeId={data.id} nodeColor={nodeColor} hidden={data.hideInput} />

                    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <Box sx={{ width: NODE_ICON_CONTAINER_WIDTH }}>
                            <NodeIcon data={data} apiBaseUrl={apiBaseUrl} />
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
                            <NodeModelConfigs inputs={data.inputValues} />
                        </Box>
                    </Box>

                    <NodeOutputHandles
                        outputAnchors={outputAnchors}
                        nodeColor={nodeColor}
                        isHovered={isHovered}
                        nodeRef={ref}
                        nodeId={data.id}
                    />
                </Box>
            </CardWrapper>

            <NodeInfoDialog open={showInfoDialog} onClose={() => setShowInfoDialog(false)} data={data} />
        </div>
    )
}

export const AgentFlowNode = memo(AgentFlowNodeComponent)
export default AgentFlowNode
