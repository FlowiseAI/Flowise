import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'

// material-ui
import { styled, useTheme } from '@mui/material/styles'
import { AppBar, Box, CssBaseline, Toolbar, useMediaQuery } from '@mui/material'

// project imports
import Header from './Header'
// import Sidebar from './Sidebar'
import { headerHeight } from '@/store/constant'
import { SET_MENU } from '@/store/actions'
import {
    SIDEBAR_WIDTH,
    // SIDEBAR_WIDTH_ICON,
    SidebarProvider
} from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'

// styles
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
    ...theme.typography.mainContent,
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
            marginLeft: -SIDEBAR_WIDTH,
            width: `calc(100% - ${SIDEBAR_WIDTH}px)`
        },
        [theme.breakpoints.down('md')]: {
            marginLeft: '20px',
            width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
            padding: '16px'
        },
        [theme.breakpoints.down('sm')]: {
            marginLeft: '10px',
            width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
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
        width: `calc(100% - ${SIDEBAR_WIDTH}px)`
    })
}))

// ==============================|| MAIN LAYOUT ||============================== //

const MainLayout = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const matchDownMd = useMediaQuery(theme.breakpoints.down('lg'))

    // Handle left drawer
    const sidebarOpen = useSelector((state) => state.customization.opened)
    const dispatch = useDispatch()
    const handleSidebarToggle = () => {
        dispatch({ type: SET_MENU, opened: !sidebarOpen })
    }

    useEffect(() => {
        setTimeout(() => dispatch({ type: SET_MENU, opened: !matchDownMd }), 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchDownMd])

    return (
        <Box className={`main ${customization.isDarkMode ? 'dark' : ''}`} sx={{ display: 'flex' }}>
            <CssBaseline />

            {/* <Sidebar drawerOpen={leftDrawerOpened} drawerToggle={handleLeftDrawerToggle} /> */}
            <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarToggle}>
                {/* sidebar */}
                <AppSidebar />

                {/* header */}
                <AppBar
                    enableColorOnDark
                    position='fixed'
                    color='inherit'
                    elevation={0}
                    sx={{
                        // width: sidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH})` : `calc(100% - ${SIDEBAR_WIDTH_ICON})`,
                        width: sidebarOpen ? `calc(100% - ${SIDEBAR_WIDTH})` : '100%',
                        [theme.breakpoints.down('md')]: {
                            width: '100%'
                        },
                        // backgroundColor: theme.palette.background.default,
                        backgroundColor: 'transparent',
                        transition: sidebarOpen ? theme.transitions.create('width') : 'none',
                        zIndex: 10
                    }}
                >
                    <Toolbar
                        // className='px-4 border-b border-border'
                        className='px-4'
                        sx={{ height: `${headerHeight}px` }}
                    >
                        <Header handleSidebarToggle={handleSidebarToggle} sidebarOpen={sidebarOpen} />
                    </Toolbar>
                </AppBar>

                {/* main content */}
                <Main theme={theme} open={sidebarOpen}>
                    <Outlet />
                </Main>
            </SidebarProvider>
        </Box>
    )
}

export default MainLayout
