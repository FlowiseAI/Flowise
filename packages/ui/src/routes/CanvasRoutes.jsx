import { lazy } from 'react'

// project imports
import Loadable from '@/ui-component/loading/Loadable'
import MinimalLayout from '@/layout/MinimalLayout'
import { RequireAuth } from '@/routes/RequireAuth'

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
            element: (
                <RequireAuth permission={'chatflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/canvas/:id',
            element: (
                <RequireAuth permission={'chatflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/agentcanvas',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/agentcanvas/:id',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/v2/agentcanvas',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <CanvasV2 />
                </RequireAuth>
            )
        },
        {
            path: '/v2/agentcanvas/:id',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <CanvasV2 />
                </RequireAuth>
            )
        },
        {
            path: '/marketplace/:id',
            element: (
                <RequireAuth permission={'templates:marketplace,templates:custom'}>
                    <MarketplaceCanvas />
                </RequireAuth>
            )
        },
        {
            path: '/v2/marketplace/:id',
            element: (
                <RequireAuth permission={'templates:marketplace,templates:custom'}>
                    <MarketplaceCanvasV2 />
                </RequireAuth>
            )
        }
    ]
}

export default CanvasRoutes
