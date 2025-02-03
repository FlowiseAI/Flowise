import { lazy } from 'react'

import Loadable from '@/ui-component/loading/Loadable'

// project imports
import MainLayout from '@/layout/MainLayout'
const AdminAccount = Loadable(lazy(() => import('@/views/AdminAccount')))

// canvas routing

// ==============================|| CANVAS ROUTING ||============================== //

const AdminRoutes = {
  path: '/',
  element: <MainLayout />,
  children: [
    {
      path: '/admin-account',
      element: <AdminAccount />
    }
  ]
}

export default AdminRoutes
