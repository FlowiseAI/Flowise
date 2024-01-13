import { lazy } from 'react'

// project imports
import Loadable from 'ui-component/loading/Loadable'
import MinimalLayout from 'layout/MinimalLayout'

// canvas routing
const ReloadFull = Loadable(lazy(() => import('views/reload')))

// ==============================|| CANVAS ROUTING ||============================== //

const ReloadRoutes = {
    path: '/reload',
    element: <MinimalLayout />,
    children: [
        {
            path: '/reload',
            element: <ReloadFull />
        }
    ]
}

export default ReloadRoutes
