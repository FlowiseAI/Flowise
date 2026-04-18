import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Divider, List, Typography, useMediaQuery } from '@mui/material'

// project imports
import NavItem from '../NavItem'
import NavCollapse from '../NavCollapse'
import { useAuth } from '@/hooks/useAuth'
import { Available } from '@/ui-component/rbac/available'

// ==============================|| SIDEBAR MENU LIST GROUP ||============================== //

const NavGroup = ({ item }) => {
    const theme = useTheme()
    const { hasPermission, hasDisplay } = useAuth()
    const drawerOpened = useSelector((state) => state.customization.opened)
    const matchUpMd = useMediaQuery(theme.breakpoints.up('md'))
    const collapsed = matchUpMd && !drawerOpened

    const listItems = (menu, level = 1) => {
        // Filter based on display and permission
        if (!shouldDisplayMenu(menu)) return null

        // Handle item and group types
        switch (menu.type) {
            case 'collapse':
                return <NavCollapse key={menu.id} menu={menu} level={level} />
            case 'item':
                return <NavItem key={menu.id} item={menu} level={level} navType='MENU' />
            default:
                return (
                    <Typography key={menu.id} variant='h6' color='error' align='center'>
                        Menu Items Error
                    </Typography>
                )
        }
    }

    const shouldDisplayMenu = (menu) => {
        // Handle permission check
        if (menu.permission && !hasPermission(menu.permission)) {
            return false // Do not render if permission is lacking
        }

        // If `display` is defined, check against cloud/enterprise conditions
        if (menu.display) {
            const shouldsiplay = hasDisplay(menu.display)
            return shouldsiplay
        }

        // If `display` is not defined, display by default
        return true
    }

    const renderPrimaryItems = () => {
        const primaryGroup = item.children.find((child) => child.id === 'primary')
        return primaryGroup.children
    }

    const renderNonPrimaryGroups = () => {
        let nonprimaryGroups = item.children.filter((child) => child.id !== 'primary')
        // Display children based on permission and display
        nonprimaryGroups = nonprimaryGroups.map((group) => {
            const children = group.children.filter((menu) => shouldDisplayMenu(menu))
            return { ...group, children }
        })
        // Get rid of group with empty children
        nonprimaryGroups = nonprimaryGroups.filter((group) => group.children.length > 0)
        return nonprimaryGroups
    }

    return (
        <>
            <List
                subheader={
                    !collapsed &&
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
                sx={{ px: collapsed ? '8px' : '16px', py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
            >
                {renderPrimaryItems().map((menu) => listItems(menu))}
            </List>

            {renderNonPrimaryGroups().map((group) => {
                const groupPermissions = group.children.map((menu) => menu.permission).join(',')
                return (
                    <Available key={group.id} permission={groupPermissions}>
                        <>
                            <Divider sx={{ height: '1px', borderColor: theme.palette.grey[900] + 25, my: 0 }} />
                            <List
                                subheader={
                                    !collapsed && (
                                        <Typography
                                            variant='caption'
                                            sx={{ ...theme.typography.subMenuCaption }}
                                            display='block'
                                            gutterBottom
                                        >
                                            {group.title}
                                        </Typography>
                                    )
                                }
                                sx={{ px: collapsed ? '8px' : '16px', py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
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

NavGroup.propTypes = {
    item: PropTypes.object
}

export default NavGroup
