import PropTypes from 'prop-types'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Box, Drawer, useMediaQuery } from '@mui/material'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'
import { BrowserView, MobileView } from 'react-device-detect'

// project imports
import MenuList from './MenuList'
import LogoSection from '../LogoSection'
import { drawerWidth } from 'store/constant'

// ==============================|| SIDEBAR DRAWER ||============================== //

const Sidebar = ({ drawerOpen, window, toggleSettingsPopper }) => {
    const theme = useTheme()
    const matchUpMd = useMediaQuery(theme.breakpoints.up('md'))

    const toggleSettingsPopperCallBack = () => {
        toggleSettingsPopper()
    }

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
                        height: !matchUpMd ? 'calc(100vh - 56px)' : 'calc(100vh - 88px)',
                        paddingLeft: '16px',
                        paddingRight: '16px',
                        marginTop: '49px'
                    }}
                >
                    <MenuList toggleSettingsPopper={toggleSettingsPopperCallBack} />
                </PerfectScrollbar>
            </BrowserView>
            <MobileView>
                <PerfectScrollbar
                    component='div'
                    style={{
                        height: !matchUpMd ? 'calc(100vh - 56px)' : 'calc(100vh - 88px)',
                        paddingLeft: '16px',
                        paddingRight: '16px',
                        marginTop: '49px'
                    }}
                >
                    <MenuList toggleSettingsPopper={toggleSettingsPopperCallBack} />
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
                variant={matchUpMd ? 'persistent' : 'temporary'}
                anchor='left'
                open={drawerOpen}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
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
    window: PropTypes.object,
    toggleSettingsPopper: PropTypes.func
}

export default Sidebar
