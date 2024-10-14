import { useRoutes } from 'react-router-dom'

// routes
import MainRoutes from './MainRoutes'
import CanvasRoutes from './CanvasRoutes'
import ChatbotRoutes from './ChatbotRoutes'
import config from '@/config'

import { useUser } from '@auth0/nextjs-auth0/client'
import LoginDialog from '@/ui-component/dialog/LoginDialog'

// ==============================|| ROUTING RENDER ||============================== //

export default function ThemeRoutes() {
    const { user } = useUser()

    return useRoutes(
        [...(!user ? [{ path: '/', element: <LoginDialog show={true} /> }] : [MainRoutes, CanvasRoutes]), ChatbotRoutes],
        config.basename
    )
}
