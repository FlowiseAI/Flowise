import { useMemo } from 'react'
import PropTypes from 'prop-types'
import { Box, Avatar, AvatarGroup, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'

/**
 * Visual indicator for node presence
 * Shows who is hovering or editing a node
 */
const NodePresenceOverlay = ({ nodeId, hovering = new Set(), editing = new Set(), activeUsers = [] }) => {
    const theme = useTheme()

    const hoveringUsers = useMemo(() => {
        return Array.from(hovering)
            .map((sessionId) => activeUsers.find((u) => u.sessionId === sessionId))
            .filter(Boolean)
    }, [hovering, activeUsers])

    const editingUsers = useMemo(() => {
        return Array.from(editing)
            .map((sessionId) => activeUsers.find((u) => u.sessionId === sessionId))
            .filter(Boolean)
    }, [editing, activeUsers])

    // Priority: editing > hovering
    const displayUsers = editingUsers.length > 0 ? editingUsers : hoveringUsers
    const isEditing = editingUsers.length > 0

    if (displayUsers.length === 0) return null

    const getInitials = (name) => {
        if (!name) return '?'
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    // Get the primary user's color for the border
    const primaryUser = displayUsers[0]
    const borderColor = primaryUser?.color || '#4db8a8'

    return (
        <>
            {/* Colored border overlay */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: -2,
                    borderRadius: '8px',
                    border: `4px ${isEditing ? 'solid' : 'dashed'} ${borderColor}`,
                    pointerEvents: 'none',
                    zIndex: 1,
                    opacity: isEditing ? 0.8 : 0.5,
                    animation: isEditing ? 'pulse 2s ease-in-out infinite' : 'none',
                    '@keyframes pulse': {
                        '0%, 100%': {
                            opacity: 0.8
                        },
                        '50%': {
                            opacity: 0.5
                        }
                    }
                }}
            />

            {/* User avatars */}
            <Box
                sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    zIndex: 10,
                    pointerEvents: 'none'
                }}
            >
                <Tooltip
                    title={
                        displayUsers.length === 1
                            ? `${displayUsers[0].name} is ${isEditing ? 'editing' : 'viewing'}`
                            : `${displayUsers.length} users ${isEditing ? 'editing' : 'viewing'}`
                    }
                    arrow
                >
                    <AvatarGroup
                        max={3}
                        sx={{
                            '& .MuiAvatar-root': {
                                width: 24,
                                height: 24,
                                fontSize: '0.65rem',
                                border: `2px solid ${theme.palette.background.paper}`,
                                boxShadow: theme.shadows[2]
                            }
                        }}
                    >
                        {displayUsers.map((user) => (
                            <Avatar
                                key={user.id}
                                sx={{
                                    bgcolor: user.color || '#4db8a8',
                                    color: '#fff',
                                    fontWeight: 600
                                }}
                            >
                                {getInitials(user.name)}
                            </Avatar>
                        ))}
                    </AvatarGroup>
                </Tooltip>
            </Box>
        </>
    )
}

NodePresenceOverlay.propTypes = {
    nodeId: PropTypes.string.isRequired,
    hovering: PropTypes.instanceOf(Set),
    editing: PropTypes.instanceOf(Set),
    activeUsers: PropTypes.array
}

export default NodePresenceOverlay
