// material-ui
import { Typography } from '@mui/material'
import { useEffect, useState } from 'react'
// project imports
import NavGroup from './NavGroup'
import menuItem from 'menu-items'
import PropTypes from 'prop-types'

// ==============================|| SIDEBAR MENU LIST ||============================== //

const MenuList = (props) => {
    const toggleDetailSliderCallback = () => {
        props.toggleDetailSlider2()
    }
    const [trigger, setTrigger] = useState(0)

    const togglePopper = () => {
        setTrigger((trigger) => trigger + 1)
    }

    useEffect(() => {
        if (props.trigger) {
            togglePopper()
        }
    }, [props.trigger])

    const navItems = menuItem.items.map((item) => {
        switch (item.type) {
            case 'group':
                return <NavGroup trigger={trigger} key={item.id} item={item} toggleDetailSlider={toggleDetailSliderCallback} />
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
    toggleDetailSlider2: PropTypes.func,
    trigger: PropTypes.number
}

export default MenuList
