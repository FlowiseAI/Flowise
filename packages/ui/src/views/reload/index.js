import { createTheme, ThemeProvider } from '@mui/material/styles'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Copyright(props) {
    return <Reload></Reload>
}

// TODO remove, this demo shouldn't need to reset the theme.

const defaultTheme = createTheme()

export default function Reload() {
    const [reloaded, setReloaded] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        if (!reloaded) {
            navigate('/')
            window.location.reload()
        }
    })

    return <ThemeProvider theme={defaultTheme}>{}</ThemeProvider>
}
