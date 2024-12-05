// material-ui
import { Typography } from '@mui/material'

// project imports
import NavGroup from './NavGroup'
import menuItem from '@/menu-items'

// ==============================|| SIDEBAR MENU LIST ||============================== //

const MenuList = () => {
    const navItems = menuItem.items.map((item) => {
        switch (item.type) {
            case 'group':
                return <NavGroup key={item.id} item={item} />
            default:
                console.log('item', item)
                return (
                    <Typography key={item.id} variant='h6' color='error' align='center'>
                        Menu Items Error
                    </Typography>
                )
        }
    })

    return <>{navItems}</>
}

export default MenuList
