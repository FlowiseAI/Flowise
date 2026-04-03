// material-ui
import { Box, Typography } from '@mui/material'

// project imports
import NavGroup from './NavGroup'
import { menuItems } from '@/menu-items'

// i18n
import { useTranslation } from 'react-i18next'

// ==============================|| SIDEBAR MENU LIST ||============================== //

const MenuList = () => {
    const { t } = useTranslation()

    const navItems = menuItems.items.map((item) => {
        switch (item.type) {
            case 'group':
                return <NavGroup key={item.id} item={item} />
            default:
                return (
                    <Typography key={item.id} variant='h6' color='error' align='center'>
                        {t('common.menu.itemsError')}
                    </Typography>
                )
        }
    })

    return <Box>{navItems}</Box>
}

export default MenuList
