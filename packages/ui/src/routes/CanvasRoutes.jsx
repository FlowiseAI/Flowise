import { lazy } from 'react'

// project imports
import Loadable from '@/ui-component/loading/Loadable'
import MinimalLayout from '@/layout/MinimalLayout'

// canvas routing
const Canvas = Loadable(lazy(() => import('@/views/canvas')))
const MarketplaceCanvas = Loadable(lazy(() => import('@/views/marketplaces/MarketplaceCanvas')))
const CanvasV2 = Loadable(lazy(() => import('@/views/agentflowsv2/Canvas')))
const MarketplaceCanvasV2 = Loadable(lazy(() => import('@/views/agentflowsv2/MarketplaceCanvas')))

// ==============================|| CANVAS ROUTING ||============================== //

const CanvasRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/canvas',
            element: <Canvas />
        },
        {
            path: '/canvas/:id',
            element: <Canvas />
        },
        {
            path: '/agentcanvas',
            element: <Canvas />
        },
        {
            path: '/agentcanvas/:id',
            element: <Canvas />
        },
        {
            path: '/v2/agentcanvas',
            element: <CanvasV2 />
        },
        {
            path: '/v2/agentcanvas/:id',
            element: <CanvasV2 />
        },
        {
            path: '/marketplace/:id',
            element: <MarketplaceCanvas />
        },
        {
            path: '/v2/marketplace/:id',
            element: <MarketplaceCanvasV2 />
        }
    ]
}

export default CanvasRoutes
