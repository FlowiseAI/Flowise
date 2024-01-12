import { lazy } from 'react'

// project imports
import Loadable from 'ui-component/loading/Loadable'
import MinimalLayout from 'layout/MinimalLayout'

// canvas routing
const SignupFull = Loadable(lazy(() => import('views/signup')))

// ==============================|| CANVAS ROUTING ||============================== //

const SignupRoutes = {
    path: '/signup',
    element: <MinimalLayout />,
    children: [
        {
            path: '/signup',
            element: <SignupFull />
        }
    ]
}

export default SignupRoutes
