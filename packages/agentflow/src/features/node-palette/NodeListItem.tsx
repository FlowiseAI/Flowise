import { memo } from 'react'

import { Box, Chip, Divider, ListItem, ListItemAvatar, ListItemButton, ListItemText } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { AGENTFLOW_ICONS } from '@/core'
import { tokens } from '@/core/theme/tokens'
import type { NodeData } from '@/core/types'

const NODE_ICON_SIZE = 30
const NODE_AVATAR_SIZE = 50

interface NodeListItemProps {
    node: NodeData
    apiBaseUrl: string
    isLast: boolean
    onDragStart: (event: React.DragEvent, node: NodeData) => void
    onClick: (node: NodeData) => void
}

function NodeListItemComponent({ node, apiBaseUrl, isLast, onDragStart, onClick }: NodeListItemProps) {
    const theme = useTheme()

    const handleDragStart = (event: React.DragEvent) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(node))
        event.dataTransfer.effectAllowed = 'move'
        onDragStart(event, node)
    }

    const renderIcon = () => {
        const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === node.name)
        if (foundIcon) {
            const IconComponent = foundIcon.icon
            return <IconComponent size={NODE_ICON_SIZE} color={node.color} />
        }
        return null
    }

    return (
        <Box onDragStart={handleDragStart} draggable>
            <ListItemButton
                sx={{
                    p: 0,
                    borderRadius: tokens.borderRadius.md,
                    cursor: 'grab',
                    '&:active': { cursor: 'grabbing' }
                }}
                onClick={() => onClick(node)}
            >
                <ListItem alignItems='center'>
                    {node.color && !node.icon ? (
                        <ListItemAvatar>
                            <Box
                                sx={{
                                    width: NODE_AVATAR_SIZE,
                                    height: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {renderIcon()}
                            </Box>
                        </ListItemAvatar>
                    ) : (
                        <ListItemAvatar>
                            <Box
                                sx={{
                                    width: NODE_AVATAR_SIZE,
                                    height: NODE_AVATAR_SIZE,
                                    borderRadius: '50%',
                                    backgroundColor: 'white'
                                }}
                            >
                                <Box
                                    component='img'
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        p: '10px',
                                        objectFit: 'contain'
                                    }}
                                    alt={node.name}
                                    src={`${apiBaseUrl}/api/v1/node-icon/${node.name}`}
                                />
                            </Box>
                        </ListItemAvatar>
                    )}
                    <ListItemText
                        sx={{ ml: 1 }}
                        primary={
                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <span>{node.label}</span>
                                {typeof node.badge === 'string' && node.badge && (
                                    <>
                                        &nbsp;
                                        <Chip
                                            sx={{
                                                width: 'max-content',
                                                fontWeight: 700,
                                                fontSize: '0.65rem',
                                                background:
                                                    node.badge === 'DEPRECATING' ? theme.palette.warning.main : theme.palette.success.main,
                                                color: node.badge !== 'DEPRECATING' ? 'white' : 'inherit'
                                            }}
                                            size='small'
                                            label={node.badge}
                                        />
                                    </>
                                )}
                            </Box>
                        }
                        secondary={node.description}
                    />
                </ListItem>
            </ListItemButton>
            {!isLast && <Divider />}
        </Box>
    )
}

export const NodeListItem = memo(NodeListItemComponent)
