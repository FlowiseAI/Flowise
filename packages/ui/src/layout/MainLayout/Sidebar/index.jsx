import PropTypes from 'prop-types'
import { useSelector, useDispatch } from 'react-redux'
import { useTheme } from '@mui/material/styles'
import {
  Box,
  Avatar,
  ButtonBase,
  Drawer,
  useMediaQuery,
  IconButton,
  Stack,
} from '@mui/material'
import PerfectScrollbar from 'react-perfect-scrollbar'
import MenuList from './MenuList'
import LogoSection from '../LogoSection'
import CloudMenuList from '@/layout/MainLayout/Sidebar/CloudMenuList'
import { drawerWidth, headerHeight } from '@/store/constant'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { SET_DARKMODE } from '@/store/actions'
import { IconArrowLeftToArc, IconArrowRightToArc } from '@tabler/icons-react'

const DRAWER_PADDING_X = '16px'

const Sidebar = ({ drawerOpen, drawerToggle, window, handleLeftDrawerToggle }) => {
  const theme = useTheme()
  const matchUpMd = useMediaQuery(theme.breakpoints.up('md'))
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const customization = useSelector((state) => state.customization)
  const dispatch = useDispatch()

  const toggleDarkMode = () => {
    dispatch({ type: SET_DARKMODE, isDarkMode: !customization.isDarkMode })
    localStorage.setItem('isDarkMode', !customization.isDarkMode)
  }

  const miniDrawerWidth = 72
  const collapsed = matchUpMd && !drawerOpen

  const CollapsedToggleButton = (
    <ButtonBase onClick={handleLeftDrawerToggle} sx={{ borderRadius: '12px', overflow: 'hidden', p: 0.5 }}>
      <Avatar
        variant='rounded'
        sx={{
          ...theme.typography.commonAvatar,
          ...theme.typography.mediumAvatar,
          background: '#1c1917',
          color: '#fff',
          width: 34,
          height: 34,
          transition: 'all .2s ease-in-out',
          '&:hover': { background: '#fff', color: '#1c1917' }
        }}
        color='inherit'
      >
        {collapsed ? <IconArrowRightToArc stroke={1.5} size='1.3rem' /> : <IconArrowLeftToArc stroke={1.5} size='1.3rem' />}
      </Avatar>
    </ButtonBase>
  )

  const drawerContent = (
    <PerfectScrollbar
      component='div'
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}
    >
      {/* Sticky Logo Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          height: `${headerHeight}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          paddingLeft: collapsed ? '8px' : DRAWER_PADDING_X,
          paddingRight: collapsed ? '8px' : DRAWER_PADDING_X,
          bgcolor: 'inherit'
        }}
      >
        <LogoSection />
      </Box>

      {/* Nav List */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          px: collapsed ? '8px' : DRAWER_PADDING_X, // increased slightly
          pt: 1
        }}
      >
        <MenuList />
        <CloudMenuList />
      </Box>

      {/* Footer */}
      <Stack
        direction='row'
        alignItems='center'
        justifyContent={collapsed ? 'center' : 'flex-start'}
        sx={{
          py: 1,
          px: collapsed ? 0 : DRAWER_PADDING_X,
          minHeight: 56,
          backgroundColor: 'transparent'
        }}
      >
        {isAuthenticated && <Box sx={{ mr: collapsed ? 0 : 1 }}>{CollapsedToggleButton}</Box>}
        {/* {!collapsed && (
          <IconButton onClick={toggleDarkMode} size='small' color='inherit'>
            {customization.isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        )} */}
      </Stack>
    </PerfectScrollbar>
  )

  const container = window !== undefined ? () => window.document.body : undefined

  return (
    <Box
      component='nav'
      aria-label='sidebar navigation'
      data-collapsed={collapsed ? 'true' : 'false'}
      sx={{
        flexShrink: { md: 0 },
        width: matchUpMd ? (collapsed ? miniDrawerWidth : drawerWidth) : 'auto',
        '--rail-width': `${collapsed ? miniDrawerWidth : drawerWidth}px`
      }}
    >
      {isAuthenticated && (
        <Drawer
          container={container}
          variant={matchUpMd ? 'persistent' : 'temporary'}
          anchor='left'
          open={matchUpMd ? true : drawerOpen}
          onClose={drawerToggle}
          sx={{
            '& .MuiDrawer-paper': {
              width: collapsed ? miniDrawerWidth : drawerWidth,
              color: (t) => t.palette.text.primary,
              [theme.breakpoints.up('md')]: { top: 0 },
              borderRight: 'none',
              ...(collapsed && {
                overflowY: 'hidden',
                overflowX: 'hidden',
                '& .MuiListSubheader-root': { display: 'none' },
                '& .MuiDivider-root': { display: 'none' },
                '& .MuiListItemText-root': { display: 'none' },
                '& .MuiListItemButton-root .MuiTypography-root': { display: 'none' },
                '& .MuiChip-root': { display: 'none' },

                // ✅ Updated collapsed layout spacing (only change)
                '& .MuiListItemButton-root': {
                  justifyContent: 'center',
                  minHeight: 48,
                  borderRadius: '12px',
                  paddingLeft: '12px !important',
                  paddingRight: '12px !important',
                  marginLeft: '10px',
                  marginRight: '10px'
                },
                '& .MuiListItemIcon-root': {
                  minWidth: 0,
                  marginRight: 0,
                  justifyContent: 'center'
                }
              })
            }
          }}
          ModalProps={{ keepMounted: true }}
          color='inherit'
        >
          {drawerContent}
        </Drawer>
      )}
    </Box>
  )
}

Sidebar.propTypes = {
  drawerOpen: PropTypes.bool,
  drawerToggle: PropTypes.func,
  window: PropTypes.object,
  handleLeftDrawerToggle: PropTypes.func
}

export default Sidebar
