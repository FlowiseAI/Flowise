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
import { drawerWidth, headerHeight } from '@/store/constant'
import { useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
// ==============================|| SIDEBAR DRAWER ||============================== //

const Sidebar = ({ drawerOpen, drawerToggle, window }) => {
  const user = useSelector((state) => state.user)
  const { pathname } = useLocation()
  const isAdminPage = pathname === '/canvas' || pathname === '/agentcanvas' ? true : user?.role === 'ADMIN' ? true : false

  const theme = useTheme()
  const matchUpMd = useMediaQuery(theme.breakpoints.up('md'))

  const drawer = (
    <>
      <Box
        sx={{
          display: { xs: 'block', md: 'none' },
          height: '80px'
        }}
      >
        <Box sx={{ display: 'flex', p: 2, mx: 'auto' }}>
          <LogoSection />
        </Box>
      </Box>
      <BrowserView>
        <PerfectScrollbar
          className='flex flex-col justify-between'
          component='div'
          style={{
            height: !matchUpMd ? 'calc(100vh - 56px)' : `calc(100vh - ${headerHeight}px)`,
            paddingLeft: '16px',
            paddingRight: '16px'
          }}
        >
          <MenuList />
          {isAdminPage && (
            <span
              className='flex items-center justify-center text-[36px]'
              style={{ color: theme.palette.primary.dark, fontWeight: 'bold', marginBottom: '26px' }}
            >
              Admin
            </span>
          )}
        </PerfectScrollbar>
      </BrowserView>
      <MobileView>
        <Box sx={{ px: 2 }}>
          <MenuList />
        </Box>
      </MobileView>
    </>
  )

  const container = window !== undefined ? () => window.document.body : undefined

  return (
    <Box
      component='nav'
      sx={{
        flexShrink: { md: 0 },
        width: matchUpMd ? drawerWidth : 'auto'
      }}
      aria-label='mailbox folders'
    >
      <Drawer
        container={container}
        variant={matchUpMd ? 'persistent' : 'temporary'}
        anchor='left'
        open={drawerOpen}
        onClose={drawerToggle}
        sx={{
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            background: theme.palette.background.default,
            color: theme.palette.text.primary,
            [theme.breakpoints.up('md')]: {
              top: `${headerHeight}px`
            },
            borderRight: drawerOpen ? '1px solid' : 'none',
            borderColor: drawerOpen ? theme.palette.primary[200] + 75 : 'transparent'
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
  window: PropTypes.object
}

export default Sidebar
