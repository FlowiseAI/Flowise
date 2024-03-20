// material-ui
import { Typography } from '@mui/material'
import PropTypes from 'prop-types'

// project imports
import NavGroup from './NavGroup'
import menuItem from '@/menu-items'

// ==============================|| SIDEBAR MENU LIST ||============================== //

const MenuList = ({ drawerToggle, toggleSettingsPopper }) => {
    const toggleSettingsPopperCallBack = () => {
        toggleSettingsPopper()
    }
    const navItems = menuItem.items.map((item) => {
        switch (item.type) {
            case 'group':
                return (
                    <NavGroup key={item.id} item={item} drawerToggle={drawerToggle} toggleSettingsPopper={toggleSettingsPopperCallBack} />
                )
            default:
                return (
                    <Typography key={item.id} variant='h6' color='error' align='center'>
                        Menu Items Error
                    </Typography>
                )
        }
    })

    return <>{navItems}</>
}
MenuList.propTypes = {
    drawerToggle: PropTypes.func,
    toggleSettingsPopper: PropTypes.func
}

export default MenuList
