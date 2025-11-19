import { useRoutes } from 'react-router-dom'

// routes
import AuthRoutes from '@/routes/AuthRoutes'
import CanvasRoutes from './CanvasRoutes'
import ChatbotRoutes from './ChatbotRoutes'
import ExecutionRoutes from './ExecutionRoutes'
import MainRoutes from './MainRoutes'

// ==============================|| ROUTING RENDER ||============================== //

export default function ThemeRoutes() {
    // Note: basename is already set on BrowserRouter, don't pass it to useRoutes
    return useRoutes([MainRoutes, AuthRoutes, CanvasRoutes, ChatbotRoutes, ExecutionRoutes])
}
