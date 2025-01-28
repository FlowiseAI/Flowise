import PropTypes from 'prop-types'

// material-ui
import { useTheme } from '@mui/material/styles'
import { List, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

// project imports
import NavItem from '../NavItem'
import NavCollapse from '../NavCollapse'
// ==============================|| SIDEBAR MENU LIST GROUP ||============================== //

const NavGroup = ({ item, drawerToggle, trigger }) => {
    const theme = useTheme()
    const [setTrigger] = useState(0)

    const onClickCallback = (id) => {
        if (id === 'expand') {
            drawerToggle()
        }
    }
    const togglePopper = () => {
        setTrigger((trigger) => trigger + 1)
    }

    useEffect(() => {
        if (trigger) {
            togglePopper()
        }
    })

    // menu list collapse & items
    const items = item.children?.map((menu) => {
        switch (menu.type) {
            case 'collapse':
                return <NavCollapse key={menu.id} menu={menu} level={1} />
            case 'item':
                if (menu.id == 'settings') {
                    return <NavItem trigger={trigger} key={menu.id} item={menu} level={1} navType='MENU' onClick={onClickCallback} />
                } else {
                    return <NavItem key={menu.id} item={menu} level={1} navType='MENU' onClick={onClickCallback} />
                }
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
                sx={{
                    // selected and (selected + hover) states
                    '&& .Mui-selected, && .Mui-selected:hover': {
                        bgcolor: '#017744'
                    },
                    // hover states
                    '& .MuiListItemButton-root:hover': {
                        bgcolor: '#017744'
                    },
                    py: '20px'
                }}
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
            >
                {items}
            </List>
        </>
    )
}

NavGroup.propTypes = {
    item: PropTypes.object,
    drawerToggle: PropTypes.func,
    trigger: PropTypes.number
}

export default NavGroup
