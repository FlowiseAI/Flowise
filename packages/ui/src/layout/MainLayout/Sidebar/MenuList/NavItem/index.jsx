import PropTypes from 'prop-types'
import { forwardRef, useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Avatar, Chip, ListItemButton, ListItemIcon, ListItemText, Typography, useMediaQuery } from '@mui/material'

// project imports
import { MENU_OPEN, SET_MENU } from '@/store/actions'
import config from '@/config'

// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import SidebarSettingsDropdown from '../../SidebarSettingsDropdown'

const NavItem = ({ item, level = 1, navType = 'MENU', onClick = () => {}, onUploadFile = () => {} }) => {
  const theme = useTheme()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const customization = useSelector((state) => state.customization)
  const matchesSM = useMediaQuery(theme.breakpoints.down('lg'))

  const isSettingsItem = item?.id === 'settings' && item?.url === '/dbsettings'
  const anchorRef = useRef(null)
  const [openSettings, setOpenSettings] = useState(false)

  const Icon = item.icon
  const itemIcon = item?.icon ? (
    <Icon stroke={1.5} size='1.3rem' />
  ) : (
    <FiberManualRecordIcon
      sx={{
        width: customization.isOpen.findIndex((id) => id === item?.id) > -1 ? 8 : 6,
        height: customization.isOpen.findIndex((id) => id === item?.id) > -1 ? 8 : 6
      }}
      fontSize={level > 0 ? 'inherit' : 'medium'}
    />
  )

  let itemTarget = '_self'
  if (item.target) itemTarget = '_blank'

  let listItemProps = {
    component: forwardRef(function ListItemPropsComponent(props, ref) {
      return <Link ref={ref} {...props} to={`${config.basename}${item.url}`} target={itemTarget} />
    })
  }
  if (item?.external) listItemProps = { component: 'a', href: item.url, target: itemTarget }
  if (item?.id === 'loadChatflow') listItemProps.component = 'label'

  const handleFileUpload = (e) => {
    if (!e.target.files) return
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (evt) => {
      if (!evt?.target?.result) return
      const { result } = evt.target
      onUploadFile(result)
    }
    reader.readAsText(file)
  }

  const itemHandler = (id, e) => {
    if (isSettingsItem) {
      if (e) e.preventDefault()
      setOpenSettings((v) => !v)
      return
    }
    if (navType === 'SETTINGS' && id !== 'loadChatflow') {
      onClick(id)
    } else {
      dispatch({ type: MENU_OPEN, id })
      if (matchesSM) dispatch({ type: SET_MENU, opened: false })
    }
  }

  const handleMouseEnter = useCallback(() => {
    if (isSettingsItem && window.matchMedia('(hover: hover)').matches) setOpenSettings(true)
  }, [isSettingsItem])

  const handleMouseLeave = useCallback(() => {
    if (isSettingsItem && window.matchMedia('(hover: hover)').matches) setOpenSettings(false)
  }, [isSettingsItem])

  const handleSettingsChildClick = useCallback(
    (childId) => {
      navigate(`/dbsettings#${childId}`)
      setOpenSettings(false)
      if (matchesSM) dispatch({ type: SET_MENU, opened: false })
    },
    [navigate, matchesSM, dispatch]
  )

  useEffect(() => {
    if (navType === 'MENU') {
      const currentIndex = document.location.pathname.toString().split('/').findIndex((id) => id === item.id)
      if (currentIndex > -1) dispatch({ type: MENU_OPEN, id: item.id })
      if (!document.location.pathname.toString().split('/')[1]) {
        itemHandler('chatflows')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navType])

  return (
    <>
      <ListItemButton
        {...listItemProps}
        ref={isSettingsItem ? anchorRef : null}
        disabled={item.disabled}
        sx={{
          borderRadius: `${customization.borderRadius}px`,
          alignItems: 'flex-start',
          backgroundColor: level > 1 ? 'transparent !important' : 'inherit',
          py: level > 1 ? 1 : 1.25,
          pl: `${level * 24}px`,

          /* THEME COLORS from _themes-vars.module.scss (light/dark via .dark overrides) */
          color: 'var(--sidebar-item-inactive-text)',
          border: '1px solid transparent',
          transition: 'background-color .25s ease, color .25s ease, box-shadow .25s ease, border-color .25s ease',

          /* Hover (inactive) */
          '&:hover': {
            backgroundColor: 'var(--sidebar-item-hover-bg)',
            color: 'var(--sidebar-item-hover-text)' /* dark mode = black; light mode = same as inactive */
          },

          /* Selected (active) */
          '&.Mui-selected': {
            backgroundColor: 'var(--sidebar-item-active-bg)',
            backgroundImage:
              'linear-gradient(to bottom, var(--sidebar-item-gradient-from), var(--sidebar-item-gradient-to))',
            color: 'var(--sidebar-item-active-text)',
            borderColor: 'var(--sidebar-item-border)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.35)'
          },

          /* Keep active styling on hover */
          '&.Mui-selected:hover': {
            backgroundColor: 'var(--sidebar-item-active-bg)',
            backgroundImage:
              'linear-gradient(to bottom, var(--sidebar-item-gradient-from), var(--sidebar-item-gradient-to))',
            color: 'var(--sidebar-item-active-text)',
            borderColor: 'var(--sidebar-item-border)'
          }
        }}
        selected={customization.isOpen.findIndex((id) => id === item.id) > -1}
        onClick={(e) => itemHandler(item.id, e)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {item.id === 'loadChatflow' && <input type='file' hidden accept='.json' onChange={(e) => handleFileUpload(e)} />}

        {/* Icons/text inherit currentColor so they flip automatically */}
        <ListItemIcon sx={{ my: 'auto', minWidth: !item?.icon ? 18 : 36, color: 'inherit' }}>
          {itemIcon}
        </ListItemIcon>

        <ListItemText
          primary={
            <Typography
              variant={customization.isOpen.findIndex((id) => id === item.id) > -1 ? 'h5' : 'body1'}
              color='inherit'
              sx={{ my: 0.5 }}
            >
              {item.title}
            </Typography>
          }
          secondary={
            item.caption && (
              <Typography variant='caption' sx={{ ...theme.typography.subMenuCaption, mt: -0.6 }} display='block' gutterBottom>
                {item.caption}
              </Typography>
            )
          }
          sx={{ my: 'auto' }}
        />

        {item.chip && (
          <Chip
            color={item.chip.color}
            variant={item.chip.variant}
            size={item.chip.size}
            label={item.chip.label}
            avatar={item.chip.avatar && <Avatar>{item.chip.avatar}</Avatar>}
          />
        )}

        {item.isBeta && (
          <Chip
            sx={{ my: 'auto', width: 'max-content', fontWeight: 700, fontSize: '0.65rem', background: theme.palette.teal.main, color: 'white' }}
            label={'BETA'}
          />
        )}
      </ListItemButton>

      {isSettingsItem && (
        <SidebarSettingsDropdown
          anchorEl={anchorRef.current}
          open={openSettings}
          onClose={() => setOpenSettings(false)}
          onItemClick={handleSettingsChildClick}
        />
      )}
    </>
  )
}

NavItem.propTypes = {
  item: PropTypes.object,
  level: PropTypes.number,
  navType: PropTypes.string,
  onClick: PropTypes.func,
  onUploadFile: PropTypes.func
}

export default NavItem
