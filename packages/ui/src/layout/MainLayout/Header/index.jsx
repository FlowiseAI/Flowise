import PropTypes from 'prop-types'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

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
import { baseURL } from '@/store/constant'
import { Toggle } from '@/components/ui/toggle'

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

const Header = ({ handleSidebarToggle }) => {
    const navigate = useNavigate()

    const customization = useSelector((state) => state.customization)

    const [isDark, setIsDark] = useState(customization.isDarkMode)
    const [versionData, setVersionData] = useState(null)

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

    useEffect(() => {
        const username = localStorage.getItem('username')
        const password = localStorage.getItem('password')

        const config = {}
        if (username && password) {
            config.auth = {
                username,
                password
            }
            config.headers = {
                'Content-type': 'application/json',
                'x-request-from': 'internal'
            }
        }
        const latestReleaseReq = axios.get('https://api.github.com/repos/FlowiseAI/Flowise/releases/latest')
        const currentVersionReq = axios.get(`${baseURL}/api/v1/version`, { ...config })

        Promise.all([latestReleaseReq, currentVersionReq])
            .then(([latestReleaseData, currentVersionData]) => {
                const finalData = {
                    ...latestReleaseData.data,
                    currentVersion: currentVersionData.data.version
                }
                setVersionData(finalData)
            })
            .catch((error) => {
                console.error('Error fetching data:', error)
            })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
                <ProfileSection handleLogout={signOutClicked} username={localStorage.getItem('username') ?? ''} versionData={versionData} />
            </Box>
        </>
    )
}

Header.propTypes = {
    handleSidebarToggle: PropTypes.func
}

export default Header
