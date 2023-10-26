// material-ui
import { Typography } from '@mui/material'
import PropTypes from 'prop-types'

// project imports
import NavGroup from './NavGroup'
import menuItem from 'menu-items'

// ==============================|| SIDEBAR MENU LIST ||============================== //

const MenuList = ({ toggleSettingsPopper }) => {
    const toggleSettingsPopperCallBack = () => {
        toggleSettingsPopper()
    }
    const navItems = menuItem.itemsInDetail.map((item) => {
        switch (item.type) {
            case 'group':
                return <NavGroup key={item.id} item={item} toggleSettingsPopper={toggleSettingsPopperCallBack} />
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
    toggleSettingsPopper: PropTypes.func
}

export default MenuList
