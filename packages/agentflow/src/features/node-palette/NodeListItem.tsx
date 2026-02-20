import { memo } from 'react'

import { Chip, Divider, ListItem, ListItemAvatar, ListItemButton, ListItemText } from '@mui/material'
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
        <div onDragStart={handleDragStart} draggable>
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
                            <div
                                style={{
                                    width: NODE_AVATAR_SIZE,
                                    height: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {renderIcon()}
                            </div>
                        </ListItemAvatar>
                    ) : (
                        <ListItemAvatar>
                            <div
                                style={{
                                    width: NODE_AVATAR_SIZE,
                                    height: NODE_AVATAR_SIZE,
                                    borderRadius: '50%',
                                    backgroundColor: 'white'
                                }}
                            >
                                <img
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        padding: 10,
                                        objectFit: 'contain'
                                    }}
                                    alt={node.name}
                                    src={`${apiBaseUrl}/api/v1/node-icon/${node.name}`}
                                />
                            </div>
                        </ListItemAvatar>
                    )}
                    <ListItemText
                        sx={{ ml: 1 }}
                        primary={
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
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
                            </div>
                        }
                        secondary={node.description}
                    />
                </ListItem>
            </ListItemButton>
            {!isLast && <Divider />}
        </div>
    )
}

export const NodeListItem = memo(NodeListItemComponent)
