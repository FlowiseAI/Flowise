import { useRoutes } from 'react-router-dom'

// routes
import MainRoutes from './MainRoutes'
import CanvasRoutes from './CanvasRoutes'
import ChatbotRoutes from './ChatbotRoutes'
import DocumentsRoutes from './DocumentsRoutes'
import config from 'config'

// ==============================|| ROUTING RENDER ||============================== //

const routes = [MainRoutes, CanvasRoutes, ChatbotRoutes, DocumentsRoutes]

export default function ThemeRoutes() {
    return useRoutes(routes, config.basename)
}

export { routes }
