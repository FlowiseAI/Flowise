import PropTypes from 'prop-types'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Box, Drawer, useMediaQuery } from '@mui/material'
import { useEffect, useState } from 'react'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'
import { BrowserView, MobileView } from 'react-device-detect'

// project imports
import MenuList from './MenuList'
import LogoSection from '../LogoSection'
import { drawerIconWidth } from 'store/constant'

// ==============================|| SIDEBAR DRAWER ||============================== //

const SidebarStatic = (props) => {
    const theme = useTheme()
    const matchUpMd = useMediaQuery(theme.breakpoints.up('md'))

    const toggleDetailSliderCallback2 = () => {
        props.toggleDetailSlider3()
    }
    const [trigger, setTrigger] = useState(0)

    const togglePopper = () => {
        setTrigger((trigger) => trigger + 1)
    }

    useEffect(() => {
        if (props.trigger) {
            togglePopper()
        }
    }, [props.trigger])

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
                    <MenuList trigger={trigger} toggleDetailSlider2={toggleDetailSliderCallback2} />
                </PerfectScrollbar>
            </BrowserView>
            <MobileView>
                <PerfectScrollbar
                    component='div'
                    style={{
                        height: !matchUpMd ? 'calc(100vh - 56px)' : 'calc(100vh - 88px)'
                    }}
                >
                    <MenuList trigger={trigger} toggleDetailSlider2={toggleDetailSliderCallback2} />
                </PerfectScrollbar>
            </MobileView>
        </>
    )

    const container = props.window !== undefined ? () => props.window.document.body : undefined

    return (
        <Box component='nav' sx={{ flexShrink: { md: 0 }, width: matchUpMd ? drawerIconWidth : 'auto' }} aria-label='mailbox folders'>
            <Drawer
                hideBackdrop
                container={container}
                variant={matchUpMd ? 'persistent' : 'temporary'}
                anchor='left'
                open={true}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: drawerIconWidth,
                        background: 'linear-gradient(180.16deg, #02a84b, #016841)',
                        backgroundColor: '#02A54B',
                        color: '#FFFFFF',
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

SidebarStatic.propTypes = {
    window: PropTypes.object,
    toggleDetailSlider3: PropTypes.func,
    trigger: PropTypes.number
}

export default SidebarStatic
