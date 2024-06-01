import { useRoutes } from 'react-router-dom'

// routes
import MainRoutes from './MainRoutes'
import CanvasRoutes from './CanvasRoutes'
import ChatbotRoutes from './ChatbotRoutes'
import config from '@/config'
import { useAuth0 } from '@auth0/auth0-react'
import LoginDialog from '@/ui-component/dialog/LoginDialog'

// ==============================|| ROUTING RENDER ||============================== //

export default function ThemeRoutes() {
    const { user } = useAuth0()

    return useRoutes(
        [...(!user ? [{ path: '/', element: <LoginDialog show={true} /> }] : [MainRoutes, CanvasRoutes]), ChatbotRoutes],
        config.basename
    )
}
