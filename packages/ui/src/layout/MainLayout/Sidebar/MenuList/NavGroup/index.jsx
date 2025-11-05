import PropTypes from 'prop-types'
import { useTheme } from '@mui/material/styles'
import { Divider, List, Typography } from '@mui/material'
import NavItem from '../NavItem'
import NavCollapse from '../NavCollapse'
import { useAuth } from '@/hooks/useAuth'
import { Available } from '@/ui-component/rbac/available'

const NavGroup = ({ item }) => {
  const theme = useTheme()
  const { hasPermission, hasDisplay } = useAuth()

  const shouldDisplayMenu = (menu) => {
    if (menu.permission && !hasPermission(menu.permission)) return false
    if (menu.display) return hasDisplay(menu.display)
    return true
  }

  const renderPrimaryItems = () => item.children.find((c) => c.id === 'primary').children
  const renderNonPrimaryGroups = () => {
    let groups = item.children.filter((c) => c.id !== 'primary')
    groups = groups.map((g) => ({ ...g, children: g.children.filter((m) => shouldDisplayMenu(m)) }))
    return groups.filter((g) => g.children.length > 0)
  }

  const listItems = (menu, level = 1) => {
    if (!shouldDisplayMenu(menu)) return null
    switch (menu.type) {
      case 'collapse': return <NavCollapse key={menu.id} menu={menu} level={level} />
      case 'item': return <NavItem key={menu.id} item={menu} level={level} navType='MENU' />
      default: return <Typography key={menu.id} variant='h6' color='error' align='center'>Menu Items Error</Typography>
    }
  }

  return (
    <>
      <List
        subheader={
          item.title && (
            <Typography variant='caption' sx={{ ...theme.typography.menuCaption }} display='block' gutterBottom>
              {item.title}
              {item.caption && (
                <Typography variant='caption' sx={{ ...theme.typography.subMenuCaption }} display='block' gutterBottom>
                  {item.caption}
                </Typography>
              )}
            </Typography>
          )
        }
        sx={{ p: '16px', py: 2, display: 'flex', flexDirection: 'column', gap: 1, zIndex: 2 }}
      >
        {renderPrimaryItems().map((menu) => listItems(menu))}
      </List>

      {renderNonPrimaryGroups().map((group) => {
        const groupPermissions = group.children.map((menu) => menu.permission).join(',')
        return (
          <Available key={group.id} permission={groupPermissions}>
            <>
              <Divider sx={{ height: 1, borderColor: theme.palette.divider, my: 0 }} />
              <List
                subheader={<Typography variant='caption' sx={{ ...theme.typography.subMenuCaption }} display='block' gutterBottom>{group.title}</Typography>}
                sx={{ p: '16px', py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
              >
                {group.children.map((menu) => listItems(menu))}
              </List>
            </>
          </Available>
        )
      })}
    </>
  )
}

NavGroup.propTypes = { item: PropTypes.object }
export default NavGroup
