import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'

// material-ui
import { Box } from '@mui/material'

// ==============================|| MINIMAL LAYOUT ||============================== //

const MinimalLayout = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <Box className={`main w-screen ${customization.isDarkMode ? 'dark' : ''}`} sx={{ display: 'flex' }}>
            <Outlet />
        </Box>
    )
}

export default MinimalLayout
