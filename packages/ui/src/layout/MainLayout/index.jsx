import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'

// material-ui
import { styled, useTheme } from '@mui/material/styles'
import { Box, CssBaseline, useMediaQuery } from '@mui/material'

// project imports
import Sidebar from './Sidebar'
import { drawerWidth } from '@/store/constant' // Removed headerHeight dependency in MainLayout

import { SET_MENU } from '@/store/actions'

// styles
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
    // Reset standard styling
    ...theme.typography.mainContent,

    // Remove fixed margin from base typography/mainContent
    margin: 0, 

    // Uniform padding around the content card area. This is the **padding outside** the white card.
    // Setting this to a smaller value (e.g., 20px) reduces the white space between the sidebar and content.
    padding: '20px', 

    backgroundColor: '#efefee', // Ensure the background behind the content card is light gray
    minHeight: '100vh',

    // Calculate width and transition when drawer is CLOSED (or collapsed)
    ...(!open && {
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
        }),
        // 💥 PUSH CONTENT TO THE RIGHT BY MINIDRAWER WIDTH WHEN CLOSED (MATCHES SECOND IMAGE) 💥
        [theme.breakpoints.up('md')]: {
            marginLeft: 0, // Use miniDrawerWidth (72px)
            width: `calc(100% - 72px)`
        },
        [theme.breakpoints.down('md')]: {
            marginLeft: 0,
            width: `100%`,
            padding: '16px'
        }
    }),

    // Calculate width and transition when drawer is OPEN
    ...(open && {
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen
        }),
        // Push content over by full drawer width
        marginLeft: 0, 
        width: `calc(100% - ${drawerWidth}px)`,
        
        [theme.breakpoints.down('md')]: {
            marginLeft: 0, 
            width: `100%`
        }
    }),
    
    // INNER CONTENT WRAPPER STYLES (for the pure white card look with rounded corners)
    '& > div': {
        // This targets the first child inside Main (<Box> containing <Outlet />)
        backgroundColor: '#FFFFFF', // Pure white background for the inner content card
        // This padding controls the spacing *inside* the white card
        padding: '8px', 
        borderRadius: '12px', // Use consistent rounding for all corners as in the image
        minHeight: 'calc(100vh - 40px)', // Height minus the 20px top/bottom padding of Main
        boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.05)',
        
        [theme.breakpoints.down('md')]: {
            padding: '16px',
            borderRadius: '8px',
        }
    }
}))


// ==============================|| MAIN LAYOUT ||============================== //

const MainLayout = () => {
    const theme = useTheme()
    const matchDownMd = useMediaQuery(theme.breakpoints.down('lg'))

    const leftDrawerOpened = useSelector((state) => state.customization.opened)
    const dispatch = useDispatch()
    const handleLeftDrawerToggle = () => {
        dispatch({ type: SET_MENU, opened: !leftDrawerOpened })
    }

    useEffect(() => {
        setTimeout(() => dispatch({ type: SET_MENU, opened: !matchDownMd }), 0)
    }, [matchDownMd])

    return (
        <Box sx={{ 
            display: 'flex', 
            backgroundColor: '#efefee', // Light grayish background for the overall layout
            minHeight: '100vh',
            // Fixes the potential "weird padding" caused by `overflow: auto` on body/html
            overflowX: 'hidden' 
        }}>
            <CssBaseline />
            
            <Sidebar drawerOpen={leftDrawerOpened} drawerToggle={handleLeftDrawerToggle} handleLeftDrawerToggle={handleLeftDrawerToggle} />

            <Main theme={theme} open={leftDrawerOpened}>
                <Box> 
                    <Outlet />
                </Box>
            </Main>
        </Box>
    )
}

export default MainLayout