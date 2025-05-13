import { lazy } from 'react'

// project imports
import Loadable from '@/ui-component/loading/Loadable'
import MinimalLayout from '@/layout/MinimalLayout'

// canvas routing
const PublicExecutionDetails = Loadable(lazy(() => import('@/views/agentexecutions/PublicExecutionDetails')))

// ==============================|| CANVAS ROUTING ||============================== //

const ExecutionRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/execution/:id',
            element: <PublicExecutionDetails />
        }
    ]
}

export default ExecutionRoutes
