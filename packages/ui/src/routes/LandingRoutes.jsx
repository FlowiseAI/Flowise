import { lazy } from 'react'
import Loadable from '@/ui-component/loading/Loadable'
import MinimalLayout from '@/layout/MinimalLayout'

const LandingPage = Loadable(lazy(() => import('@/views/landing')))

const LandingRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/',
            element: <LandingPage />
        }
    ]
}

export default LandingRoutes