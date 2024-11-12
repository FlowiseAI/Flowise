'use client'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

// material-ui
import { styled, useTheme } from '@mui/material/styles'
import { AppBar, Box, CssBaseline, Toolbar, useMediaQuery } from '@mui/material'

// project imports
import Header from './Header'
import Sidebar from './Sidebar'
import { drawerWidth, headerHeight } from '@/store/constant'
import { SET_MENU } from '@/store/actions'

// styles
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' && prop !== 'isInIframe' })(({ theme, open, isInIframe }) => ({
    ...theme.typography.mainContent,
    ...(!isInIframe && { marginTop: '75px' }),
    ...(!open && {
        backgroundColor: 'transparent',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        transition: theme.transitions.create('all', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
        }),
        marginRight: 0,
        [theme.breakpoints.up('md')]: {
            marginLeft: -drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`
        },
        [theme.breakpoints.down('md')]: {
            marginLeft: '20px',
            width: `calc(100% - ${drawerWidth}px)`,
            padding: '16px'
        },
        [theme.breakpoints.down('sm')]: {
            marginLeft: '10px',
            width: `calc(100% - ${drawerWidth}px)`,
            padding: '16px',
            marginRight: '10px'
        }
    }),
    ...(open && {
        backgroundColor: 'transparent',
        transition: theme.transitions.create('all', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen
        }),
        marginLeft: 0,
        marginRight: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        // width: `calc(100% - ${drawerWidth}px)`
        width: `calc(100%)`
    })
}))

// ==============================|| MAIN LAYOUT ||============================== //

const MainLayout = ({ children }) => {
    const theme = useTheme()
    const matchDownMd = useMediaQuery(theme.breakpoints.down('lg'))
    const [isInIframe, setIsInIframe] = useState(true)

    // Handle left drawer
    const leftDrawerOpened = true
    const dispatch = useDispatch()
    const handleLeftDrawerToggle = () => {
        dispatch({ type: SET_MENU, opened: !leftDrawerOpened })
    }

    useEffect(() => {
        // Detect if loaded inside an iframe
        // setIsInIframe(window.parent !== window)

        setTimeout(() => dispatch({ type: SET_MENU, opened: !matchDownMd }), 0)
    }, [matchDownMd, dispatch])

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            {/* header */}
            <>
                {!isInIframe && (
                    <AppBar
                        enableColorOnDark
                        position='absolute'
                        color='inherit'
                        elevation={0}
                        sx={{
                            bgcolor: theme.palette.background.default,
                            transition: leftDrawerOpened ? theme.transitions.create('width') : 'none'
                        }}
                    >
                        <Toolbar>
                            <Header handleLeftDrawerToggle={handleLeftDrawerToggle} />
                        </Toolbar>
                    </AppBar>
                )}
                {/* <Sidebar drawerOpen={leftDrawerOpened} drawerToggle={handleLeftDrawerToggle} isInIframe={isInIframe} /> */}
            </>
            {/* main content */}
            <Main theme={theme} open={leftDrawerOpened} isInIframe={isInIframe}>
                {children}
            </Main>
        </Box>
    )
}

export default MainLayout
