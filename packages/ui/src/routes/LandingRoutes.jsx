import { lazy } from 'react'

import MinimalLayout from '@/layout/MinimalLayout'
import Loadable from '@/ui-component/loading/Loadable'

const FamilyTiesLanding = Loadable(lazy(() => import('@/views/landing/FamilyTiesLanding')))

const LandingRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/family-ties',
            element: <FamilyTiesLanding />
        }
    ]
}

export default LandingRoutes
