import { lazy } from 'react'

// project imports
import Loadable from 'ui-component/loading/Loadable'
import MinimalLayout from 'layout/MinimalLayout'

// canvas routing
const SigninFull = Loadable(lazy(() => import('views/signin')))

// ==============================|| CANVAS ROUTING ||============================== //

const SigninRoutes = {
    path: '/signin',
    element: <MinimalLayout />,
    children: [
        {
            path: '/signin',
            element: <SigninFull />
        }
    ]
}

export default SigninRoutes
