import PropTypes from 'prop-types'
import { useSelector, useDispatch } from 'react-redux'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// material-ui
import { Box } from '@mui/material'

// components
import { Button } from '@/components/ui/button'

// project imports
import ProfileSection from './ProfileSection'

// assets
import { IconSunFilled, IconMoonFilled, IconLayoutSidebar } from '@tabler/icons-react'

// store
import { SET_DARKMODE } from '@/store/actions'
import { Toggle } from '@/components/ui/toggle'

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

const Header = ({ handleSidebarToggle }) => {
    const navigate = useNavigate()

    const customization = useSelector((state) => state.customization)

    const [isDark, setIsDark] = useState(customization.isDarkMode)
    const dispatch = useDispatch()

    const changeDarkMode = () => {
        dispatch({ type: SET_DARKMODE, isDarkMode: !isDark })
        setIsDark((isDark) => !isDark)
        localStorage.setItem('isDarkMode', !isDark)
    }

    const signOutClicked = () => {
        localStorage.removeItem('username')
        localStorage.removeItem('password')
        navigate('/', { replace: true })
        navigate(0)
    }

    return (
        <>
            <Box className='flex items-center justify-between'>
                <Button onClick={handleSidebarToggle} size='icon' variant='ghost'>
                    <IconLayoutSidebar size={20} />
                </Button>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Box className='flex items-center gap-2'>
                <Toggle pressed={isDark} onPressedChange={changeDarkMode} variant='ghost' size='icon'>
                    {isDark ? <IconMoonFilled /> : <IconSunFilled />}
                </Toggle>
                <ProfileSection handleLogout={signOutClicked} username={localStorage.getItem('username') ?? ''} />
            </Box>
        </>
    )
}

Header.propTypes = {
    handleSidebarToggle: PropTypes.func
}

export default Header
