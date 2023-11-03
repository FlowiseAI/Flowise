import PropTypes from 'prop-types'

// material-ui
import { styled, useTheme } from '@mui/material/styles'
import { Box, useMediaQuery } from '@mui/material'
import MuiDrawer from '@mui/material/Drawer'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'
import { BrowserView, MobileView } from 'react-device-detect'

// project imports
import MenuList from './MenuList'
import LogoSection from '../LogoSection'
import { drawerWidth, drawerIconWidth } from 'store/constant'

// ==============================|| SIDEBAR DRAWER ||============================== //

const Sidebar = ({ drawerOpen, drawerToggle, window, toggleSettingsPopper }) => {
    const theme = useTheme()
    const matchUpMd = useMediaQuery(theme.breakpoints.up('md'))

    const toggleSettingsPopperCallBack = () => {
        toggleSettingsPopper()
    }

    const openedMixin = (theme) => ({
        width: drawerWidth,
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen
        }),
        overflowX: 'hidden'
    })

    const closedMixin = (theme) => ({
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
        }),
        overflowX: 'hidden',
        width: drawerIconWidth
    })

    const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...(open && {
            ...openedMixin(theme),
            '& .MuiDrawer-paper': openedMixin(theme)
        }),
        ...(!open && {
            ...closedMixin(theme),
            '& .MuiDrawer-paper': closedMixin(theme)
        })
    }))

    const drawer = (
        <>
            <Box sx={{ display: { xs: 'none', md: 'none' } }}>
                <Box sx={{ display: 'flex', p: 2, mx: 'auto' }}>
                    <LogoSection />
                </Box>
            </Box>
            <BrowserView>
                <PerfectScrollbar
                    component='div'
                    style={{
                        height: !matchUpMd ? 'calc(100vh - 56px)' : 'calc(100vh - 88px)'
                    }}
                >
                    <MenuList drawerToggle={drawerToggle} toggleSettingsPopper={toggleSettingsPopperCallBack} />
                </PerfectScrollbar>
            </BrowserView>
            <MobileView>
                <PerfectScrollbar
                    component='div'
                    style={{
                        height: !matchUpMd ? 'calc(100vh - 56px)' : 'calc(100vh - 88px)'
                    }}
                >
                    <MenuList drawerToggle={drawerToggle} toggleSettingsPopper={toggleSettingsPopperCallBack} />
                </PerfectScrollbar>
            </MobileView>
        </>
    )

    const container = window !== undefined ? () => window.document.body : undefined

    return (
        <Box component='nav' sx={{ flexShrink: { md: 0 }, width: matchUpMd ? drawerWidth : 'auto' }} aria-label='mailbox folders'>
            <Drawer
                hideBackdrop
                container={container}
                variant='permanent'
                anchor='left'
                open={drawerOpen}
                sx={{
                    '& .MuiDrawer-paper': {
                        background: 'linear-gradient(180.16deg, #02a84b, #016841)',
                        backgroundColor: '#EDF0F3',
                        borderRight: 'none'
                    }
                }}
                ModalProps={{ keepMounted: true }}
                color='inherit'
            >
                {drawer}
            </Drawer>
        </Box>
    )
}

Sidebar.propTypes = {
    drawerOpen: PropTypes.bool,
    drawerToggle: PropTypes.func,
    window: PropTypes.object,
    toggleSettingsPopper: PropTypes.func
}

export default Sidebar
