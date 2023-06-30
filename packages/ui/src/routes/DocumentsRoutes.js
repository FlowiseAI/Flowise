import { lazy } from 'react'

// project imports
import MainLayout from 'layout/MainLayout'
import Loadable from 'ui-component/loading/Loadable'

// documents - sources routing
const Sources = Loadable(lazy(() => import('views/sources')))
const Documents = Loadable(lazy(() => import('views/sources/Documents')))
const Embeddings = Loadable(lazy(() => import('views/sources/Embeddings')))

const DocumentsRoutes = {
    path: '/',
    element: <MainLayout />,
    children: [
        {
            path: '/sources',
            element: <Sources />
        },
        {
            path: '/sources/:id',
            element: <Documents />
        },
        {
            path: '/sources/:id/documents/:documentId',
            element: <Embeddings />
        }
    ]
}

export default DocumentsRoutes
