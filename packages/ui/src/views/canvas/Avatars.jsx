import { Box, Avatar, AvatarGroup, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconDots, IconPalette, IconCheck } from '@tabler/icons-react'
import PropTypes from 'prop-types'
import { useState } from 'react'
import { AVAILABLE_COLORS } from '@/contexts/CanvasPresenceContext'

const Avatars = ({ activeUsers = [], currentUser, onColorChange }) => {
    const theme = useTheme()
    const [menuAnchorEl, setMenuAnchorEl] = useState(null)
    const [colorMenuAnchorEl, setColorMenuAnchorEl] = useState(null)
    const isMenuOpen = Boolean(menuAnchorEl)
    const isColorMenuOpen = Boolean(colorMenuAnchorEl)

    const currentUserColor = activeUsers.find((u) => u.id === currentUser?.id)?.color || '#4db8a8'

    const handleMenuOpen = (event) => {
        setMenuAnchorEl(event.currentTarget)
    }

    const handleMenuClose = () => {
        setMenuAnchorEl(null)
        setColorMenuAnchorEl(null)
    }

    const handleColorMenuOpen = (event) => {
        setColorMenuAnchorEl(event.currentTarget)
    }

    const handleColorSelect = (color) => {
        if (onColorChange) {
            onColorChange(color)
        }
        handleMenuClose()
    }

    const getInitials = (name) => {
        if (!name) return '?'
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'idle':
                return '#FFC107' // Yellow
            case 'away':
                return '#9E9E9E' // Gray
            case 'active':
            default:
                return '#4CAF50' // Green
        }
    }

    if (!activeUsers || activeUsers.length === 0) {
        return null
    }

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: theme.palette.background.paper,
                borderRadius: '50px',
                padding: '8px 12px',
                boxShadow: theme.shadows[3]
            }}
        >
            <AvatarGroup
                max={4}
                sx={{
                    '& .MuiAvatar-root': {
                        width: 40,
                        height: 40,
                        fontSize: '1rem',
                        fontWeight: 600,
                        border: `2px solid ${theme.palette.background.paper}`,
                        position: 'relative'
                    }
                }}
            >
                {activeUsers.map((user, index) => (
                    <Box key={user.id || index} sx={{ position: 'relative' }}>
                        <Avatar
                            sx={{
                                bgcolor: user.color || '#4db8a8',
                                color: '#fff'
                            }}
                            title={user.name || 'Anonymous User'}
                        >
                            {getInitials(user.name)}
                        </Avatar>
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 2,
                                right: 2,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: getStatusColor(user.status || 'active'),
                                border: `2px solid ${theme.palette.background.paper}`,
                                zIndex: 1
                            }}
                        />
                    </Box>
                ))}{' '}
            </AvatarGroup>
            <IconButton size='small' sx={{ ml: 0.5 }} onClick={handleMenuOpen}>
                <IconDots size={20} />
            </IconButton>

            {/* Main Menu */}
            <Menu
                anchorEl={menuAnchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
            >
                <MenuItem onClick={handleColorMenuOpen}>
                    <ListItemIcon>
                        <IconPalette size={20} />
                    </ListItemIcon>
                    <ListItemText>My Color</ListItemText>
                </MenuItem>
            </Menu>

            {/* Color Picker Submenu */}
            <Menu
                anchorEl={colorMenuAnchorEl}
                open={isColorMenuOpen}
                onClose={() => setColorMenuAnchorEl(null)}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left'
                }}
                sx={{
                    '& .MuiPaper-root': {
                        minWidth: 200
                    }
                }}
            >
                {AVAILABLE_COLORS.map((color) => (
                    <MenuItem
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5
                        }}
                    >
                        <Box
                            sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: color,
                                border: `2px solid ${theme.palette.divider}`,
                                flexShrink: 0
                            }}
                        />
                        <Box sx={{ flexGrow: 1, fontSize: '0.875rem' }}>{color}</Box>
                        {currentUserColor === color && <IconCheck size={16} color={theme.palette.primary.main} />}
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    )
}

Avatars.propTypes = {
    activeUsers: PropTypes.array,
    currentUser: PropTypes.object,
    onColorChange: PropTypes.func
}

export default Avatars
