import { useRoutes } from 'react-router-dom'

// routes
import LandingRoutes from './LandingRoutes'
import MainRoutes from './MainRoutes'
import CanvasRoutes from './CanvasRoutes'
import ChatbotRoutes from './ChatbotRoutes'
import config from '@/config'
import AuthRoutes from '@/routes/AuthRoutes'
import ExecutionRoutes from './ExecutionRoutes'

// ==============================|| ROUTING RENDER ||============================== //

export default function ThemeRoutes() {
    return useRoutes([LandingRoutes, AuthRoutes, MainRoutes, CanvasRoutes, ChatbotRoutes, ExecutionRoutes], config.basename)
}
