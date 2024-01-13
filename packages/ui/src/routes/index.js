import { useRoutes } from 'react-router-dom'

// routes
import MainRoutes from './MainRoutes'
import CanvasRoutes from './CanvasRoutes'
import ChatbotRoutes from './ChatbotRoutes'
import SigninRoutes from './SigninRoutes'
import SignupRoutes from './SignupRoutes'
import SubscribeRoutes from './SubscribeRoutes'
import ReloadRoutes from './ReloadRoutes'
import config from 'config'

// ==============================|| ROUTING RENDER ||============================== //

export default function ThemeRoutes() {
    return useRoutes([MainRoutes, CanvasRoutes, ChatbotRoutes, SigninRoutes, SignupRoutes, ReloadRoutes, SubscribeRoutes], config.basename)
}
