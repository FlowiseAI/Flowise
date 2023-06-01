import { useRoutes } from 'react-router-dom'

// routes
import MainRoutes from './MainRoutes'
import CanvasRoutes from './CanvasRoutes'
import ChatflowsRoutes from './ChatflowsRoutes'
import config from 'config'

// ==============================|| ROUTING RENDER ||============================== //

export default function ThemeRoutes() {
    return useRoutes([MainRoutes, CanvasRoutes, ChatflowsRoutes], config.basename)
}
