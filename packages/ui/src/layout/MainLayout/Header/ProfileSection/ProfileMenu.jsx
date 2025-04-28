import PropTypes from 'prop-types'

// material-ui
import { Box, ClickAwayListener, Divider, List, ListItemButton, ListItemIcon, ListItemText, Paper, Popper, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import Transitions from '@/ui-component/extended/Transitions'

// assets
import { IconFileExport, IconFileUpload, IconInfoCircle, IconLogout } from '@tabler/icons-react'

const ProfileMenu = ({
    open,
    anchorEl,
    handleClose,
    username,
    customization,
    setExportDialogOpen,
    importAll,
    setAboutDialogOpen,
    handleLogout,
    user,
    setOpen,
    inputRef,
    fileChange
}) => {
    const theme = useTheme()

    return (
        <Popper
            placement='bottom-end'
            open={open}
            anchorEl={anchorEl}
            role={undefined}
            transition
            disablePortal
            popperOptions={{
                modifiers: [
                    {
                        name: 'offset',
                        options: {
                            offset: [0, 14]
                        }
                    }
                ]
            }}
        >
            {({ TransitionProps }) => (
                <Transitions in={open} {...TransitionProps}>
                    <Paper>
                        <ClickAwayListener onClickAway={handleClose}>
                            <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                                {username && (
                                    <Box sx={{ p: 2 }}>
                                        <Typography component='span' variant='h4'>
                                            {username}
                                        </Typography>
                                    </Box>
                                )}
                                <PerfectScrollbar style={{ height: '100%', maxHeight: 'calc(100vh - 250px)', overflowX: 'hidden' }}>
                                    <Box sx={{ p: 2 }}>
                                        <Divider />
                                        <List
                                            component='nav'
                                            sx={{
                                                width: '100%',
                                                maxWidth: 250,
                                                minWidth: 200,
                                                backgroundColor: theme.palette.background.paper,
                                                borderRadius: '10px',
                                                [theme.breakpoints.down('md')]: {
                                                    minWidth: '100%'
                                                },
                                                '& .MuiListItemButton-root': {
                                                    mt: 0.5
                                                }
                                            }}
                                        >
                                            <ListItemButton
                                                sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                onClick={() => {
                                                    setExportDialogOpen(true)
                                                }}
                                            >
                                                <ListItemIcon>
                                                    <IconFileExport stroke={1.5} size='1.3rem' />
                                                </ListItemIcon>
                                                <ListItemText primary={<Typography variant='body2'>Export</Typography>} />
                                            </ListItemButton>
                                            <ListItemButton
                                                sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                onClick={() => {
                                                    importAll()
                                                }}
                                            >
                                                <ListItemIcon>
                                                    <IconFileUpload stroke={1.5} size='1.3rem' />
                                                </ListItemIcon>
                                                <ListItemText primary={<Typography variant='body2'>Import</Typography>} />
                                            </ListItemButton>
                                            <ListItemButton
                                                sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                onClick={() => {
                                                    setOpen(false)
                                                    setAboutDialogOpen(true)
                                                }}
                                            >
                                                <ListItemIcon>
                                                    <IconInfoCircle stroke={1.5} size='1.3rem' />
                                                </ListItemIcon>
                                                <ListItemText primary={<Typography variant='body2'>About Flowise</Typography>} />
                                            </ListItemButton>
                                            {user && (
                                                <ListItemButton
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={handleLogout}
                                                >
                                                    <ListItemIcon>
                                                        <IconLogout stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Logout</Typography>} />
                                                </ListItemButton>
                                            )}
                                        </List>
                                    </Box>
                                </PerfectScrollbar>
                            </MainCard>
                        </ClickAwayListener>
                    </Paper>
                </Transitions>
            )}
        </Popper>
    )
}

ProfileMenu.propTypes = {
    open: PropTypes.bool,
    anchorEl: PropTypes.object,
    handleClose: PropTypes.func,
    username: PropTypes.string,
    customization: PropTypes.object,
    setExportDialogOpen: PropTypes.func,
    importAll: PropTypes.func,
    setAboutDialogOpen: PropTypes.func,
    handleLogout: PropTypes.func,
    user: PropTypes.object,
    setOpen: PropTypes.func,
    inputRef: PropTypes.object,
    fileChange: PropTypes.func
}

export default ProfileMenu
