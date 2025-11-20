import { useMemo } from 'react'
import PropTypes from 'prop-types'
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Paper, Popper, ClickAwayListener, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MainCard from '@/ui-component/cards/MainCard'
import Transitions from '@/ui-component/extended/Transitions'
import PerfectScrollbar from 'react-perfect-scrollbar'
import settings from '@/menu-items/settings'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

const SidebarSettingsDropdown = ({ anchorEl, open, onClose, onItemClick }) => {
  const theme = useTheme()

  const items = useMemo(() => {
    const menus = settings.children || []
    return menus.map((menu) => {
      const Icon = menu.icon
      const iconEl = Icon ? (
        <Icon stroke={1.5} size='1.3rem' />
      ) : (
        <FiberManualRecordIcon sx={{ width: 6, height: 6 }} fontSize='inherit' />
      )

      return (
        <ListItemButton
          key={menu.id}
          sx={{ borderRadius: 1, mb: 0.5, alignItems: 'flex-start', py: 1.0, pl: '24px' }}
          onClick={() => onItemClick(menu.id)}
        >
          <ListItemIcon sx={{ my: 'auto', minWidth: Icon ? 36 : 18 }}>{iconEl}</ListItemIcon>
          <ListItemText primary={<Typography color='inherit'>{menu.title}</Typography>} />
        </ListItemButton>
      )
    })
  }, [onItemClick])

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="right-start"
      disablePortal={false}
      strategy="fixed"
      popperOptions={{
        modifiers: [
          { name: 'offset', options: { offset: [8, 0] } },
          { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } },
          { name: 'computeStyles', options: { gpuAcceleration: false } }
        ]
      }}
      sx={{ zIndex: 1300 }}
    >
      {({ TransitionProps }) => (
        <Transitions in={open} {...TransitionProps}>
          <Paper elevation={0} sx={{ backgroundColor: 'background.paper', border: 'none' }}>
            <ClickAwayListener onClickAway={onClose}>
              <MainCard border={false} elevation={0} content={false} boxShadow={false} sx={{ border: 'none' }}>
                <PerfectScrollbar style={{ height: '100%', maxHeight: 'calc(100vh - 250px)', overflowX: 'hidden' }}>
                  <Box sx={{ p: 2 }}>
                    <List>{items}</List>
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

SidebarSettingsDropdown.propTypes = {
  anchorEl: PropTypes.any,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired
}

export default SidebarSettingsDropdown
