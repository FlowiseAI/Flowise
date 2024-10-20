import PropTypes from 'prop-types'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Divider, List, Typography } from '@mui/material'

// project imports
import NavItem from '../NavItem'
import NavCollapse from '../NavCollapse'

// ==============================|| SIDEBAR MENU LIST GROUP ||============================== //

const NavGroup = ({ item }) => {
    const theme = useTheme()

    // menu list collapse & items
    const items = item.children?.map((menu) => {
        switch (menu.type) {
            case 'collapse':
                return <NavCollapse key={menu.id} menu={menu} level={1} />
            case 'item':
                return <NavItem key={menu.id} item={menu} level={1} navType='MENU' />
            default:
                return (
                    <Typography key={menu.id} variant='h6' color='error' align='center'>
                        Menu Items Error
                    </Typography>
                )
        }
    })

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
                sx={{ py: '20px' }}
            >
                {items}
            </List>

            {/* group divider */}
            <Divider sx={{ mt: 0.25, mb: 1.25 }} />
        </>
    )
}

NavGroup.propTypes = {
    item: PropTypes.object
}

export default NavGroup
