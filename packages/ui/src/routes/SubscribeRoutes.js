import { lazy } from 'react'

// project imports
import Loadable from 'ui-component/loading/Loadable'
import MinimalLayout from 'layout/MinimalLayout'

// canvas routing
const SubscribeFull = Loadable(lazy(() => import('views/subscribe')))

// ==============================|| CANVAS ROUTING ||============================== //

const SubscribeRoutes = {
    path: '/subscribe',
    element: <MinimalLayout />,
    children: [
        {
            path: '/subscribe',
            element: <SubscribeFull />
        }
    ]
}

export default SubscribeRoutes
