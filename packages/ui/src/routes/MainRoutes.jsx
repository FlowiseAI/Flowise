import { lazy } from 'react'

// project imports
import MainLayout from '@/layout/MainLayout'
import Loadable from '@/ui-component/loading/Loadable'

import { RequireAuth } from '@/routes/RequireAuth'
import { DefaultRedirect } from '@/routes/DefaultRedirect'

// chatflows routing
const Chatflows = Loadable(lazy(() => import('@/views/chatflows')))

// agents routing
const Agentflows = Loadable(lazy(() => import('@/views/agentflows')))

// marketplaces routing
const Marketplaces = Loadable(lazy(() => import('@/views/marketplaces')))

// apikey routing
const APIKey = Loadable(lazy(() => import('@/views/apikey')))

// tools routing
const Tools = Loadable(lazy(() => import('@/views/tools')))

// assistants routing
const Assistants = Loadable(lazy(() => import('@/views/assistants')))
const OpenAIAssistantLayout = Loadable(lazy(() => import('@/views/assistants/openai/OpenAIAssistantLayout')))
const CustomAssistantLayout = Loadable(lazy(() => import('@/views/assistants/custom/CustomAssistantLayout')))
const CustomAssistantConfigurePreview = Loadable(lazy(() => import('@/views/assistants/custom/CustomAssistantConfigurePreview')))

// credentials routing
const Credentials = Loadable(lazy(() => import('@/views/credentials')))

// variables routing
const Variables = Loadable(lazy(() => import('@/views/variables')))

// documents routing
const Documents = Loadable(lazy(() => import('@/views/docstore')))
const DocumentStoreDetail = Loadable(lazy(() => import('@/views/docstore/DocumentStoreDetail')))
const ShowStoredChunks = Loadable(lazy(() => import('@/views/docstore/ShowStoredChunks')))
const LoaderConfigPreviewChunks = Loadable(lazy(() => import('@/views/docstore/LoaderConfigPreviewChunks')))
const VectorStoreConfigure = Loadable(lazy(() => import('@/views/docstore/VectorStoreConfigure')))
const VectorStoreQuery = Loadable(lazy(() => import('@/views/docstore/VectorStoreQuery')))

// Evaluations routing
const EvalEvaluation = Loadable(lazy(() => import('@/views/evaluations/index')))
const EvaluationResult = Loadable(lazy(() => import('@/views/evaluations/EvaluationResult')))
const EvalDatasetRows = Loadable(lazy(() => import('@/views/datasets/DatasetItems')))
const EvalDatasets = Loadable(lazy(() => import('@/views/datasets')))
const Evaluators = Loadable(lazy(() => import('@/views/evaluators')))

// account routing
const Account = Loadable(lazy(() => import('@/views/account')))

// files routing
const Files = Loadable(lazy(() => import('@/views/files')))

// logs routing
const Logs = Loadable(lazy(() => import('@/views/serverlogs')))

// executions routing
const Executions = Loadable(lazy(() => import('@/views/agentexecutions')))

// enterprise features
const UsersPage = Loadable(lazy(() => import('@/views/users')))
const RolesPage = Loadable(lazy(() => import('@/views/roles')))
const LoginActivityPage = Loadable(lazy(() => import('@/views/auth/loginActivity')))
const Workspaces = Loadable(lazy(() => import('@/views/workspace')))
const WorkspaceDetails = Loadable(lazy(() => import('@/views/workspace/WorkspaceUsers')))
const SSOConfig = Loadable(lazy(() => import('@/views/auth/ssoConfig')))
const SSOSuccess = Loadable(lazy(() => import('@/views/auth/ssoSuccess')))

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
    path: '/',
    element: <MainLayout />,
    children: [
        {
            path: '/',
            element: <DefaultRedirect />
        },
        {
            path: '/chatflows',
            element: (
                <RequireAuth permission={'chatflows:view'}>
                    <Chatflows />
                </RequireAuth>
            )
        },
        {
            path: '/agentflows',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <Agentflows />
                </RequireAuth>
            )
        },
        {
            path: '/executions',
            element: (
                <RequireAuth permission={'executions:view'}>
                    <Executions />
                </RequireAuth>
            )
        },
        {
            path: '/marketplaces',
            element: (
                <RequireAuth permission={'templates:marketplace,templates:custom'}>
                    <Marketplaces />
                </RequireAuth>
            )
        },
        {
            path: '/apikey',
            element: (
                <RequireAuth permission={'apikeys:view'}>
                    <APIKey />
                </RequireAuth>
            )
        },
        {
            path: '/tools',
            element: (
                <RequireAuth permission={'tools:view'}>
                    <Tools />
                </RequireAuth>
            )
        },
        {
            path: '/assistants',
            element: (
                <RequireAuth permission={'assistants:view'}>
                    <Assistants />
                </RequireAuth>
            )
        },
        {
            path: '/assistants/custom',
            element: (
                <RequireAuth permission={'assistants:view'}>
                    <CustomAssistantLayout />
                </RequireAuth>
            )
        },
        {
            path: '/assistants/custom/:id',
            element: (
                <RequireAuth permission={'assistants:view'}>
                    <CustomAssistantConfigurePreview />
                </RequireAuth>
            )
        },
        {
            path: '/assistants/openai',
            element: (
                <RequireAuth permission={'assistants:view'}>
                    <OpenAIAssistantLayout />
                </RequireAuth>
            )
        },
        {
            path: '/credentials',
            element: (
                <RequireAuth permission={'credentials:view'}>
                    <Credentials />
                </RequireAuth>
            )
        },
        {
            path: '/variables',
            element: (
                <RequireAuth permission={'variables:view'}>
                    <Variables />
                </RequireAuth>
            )
        },
        {
            path: '/document-stores',
            element: (
                <RequireAuth permission={'documentStores:view'}>
                    <Documents />
                </RequireAuth>
            )
        },
        {
            path: '/document-stores/:storeId',
            element: (
                <RequireAuth permission={'documentStores:view'}>
                    <DocumentStoreDetail />
                </RequireAuth>
            )
        },
        {
            path: '/document-stores/chunks/:storeId/:fileId',
            element: (
                <RequireAuth permission={'documentStores:view'}>
                    <ShowStoredChunks />
                </RequireAuth>
            )
        },
        {
            path: '/document-stores/:storeId/:name',
            element: (
                <RequireAuth permission={'documentStores:view'}>
                    <LoaderConfigPreviewChunks />
                </RequireAuth>
            )
        },
        {
            path: '/document-stores/vector/:storeId',
            element: (
                <RequireAuth permission={'documentStores:view'}>
                    <VectorStoreConfigure />
                </RequireAuth>
            )
        },
        {
            path: '/document-stores/vector/:storeId/:docId',
            element: (
                <RequireAuth permission={'documentStores:view'}>
                    <VectorStoreConfigure />
                </RequireAuth>
            )
        },
        {
            path: '/document-stores/query/:storeId',
            element: (
                <RequireAuth permission={'documentStores:view'}>
                    <VectorStoreQuery />
                </RequireAuth>
            )
        },
        {
            path: '/datasets',
            element: (
                <RequireAuth permission={'datasets:view'} display={'feat:datasets'}>
                    <EvalDatasets />
                </RequireAuth>
            )
        },
        {
            path: '/dataset_rows/:id',
            element: (
                <RequireAuth permission={'datasets:view'} display={'feat:datasets'}>
                    <EvalDatasetRows />
                </RequireAuth>
            )
        },
        {
            path: '/evaluations',
            element: (
                <RequireAuth permission={'evaluations:view'} display={'feat:evaluations'}>
                    <EvalEvaluation />
                </RequireAuth>
            )
        },
        {
            path: '/evaluation_results/:id',
            element: (
                <RequireAuth permission={'evaluations:view'} display={'feat:evaluations'}>
                    <EvaluationResult />
                </RequireAuth>
            )
        },
        {
            path: '/evaluators',
            element: (
                <RequireAuth permission={'evaluators:view'} display={'feat:evaluators'}>
                    <Evaluators />
                </RequireAuth>
            )
        },
        {
            path: '/logs',
            element: (
                <RequireAuth permission={'logs:view'} display={'feat:logs'}>
                    <Logs />
                </RequireAuth>
            )
        },
        {
            path: '/files',
            element: (
                <RequireAuth display={'feat:files'}>
                    <Files />
                </RequireAuth>
            )
        },
        {
            path: '/account',
            element: <Account />
        },
        {
            path: '/users',
            element: (
                <RequireAuth permission={'users:manage'} display={'feat:users'}>
                    <UsersPage />
                </RequireAuth>
            )
        },
        {
            path: '/roles',
            element: (
                <RequireAuth permission={'roles:manage'} display={'feat:roles'}>
                    <RolesPage />
                </RequireAuth>
            )
        },
        {
            path: '/login-activity',
            element: (
                <RequireAuth permission={'loginActivity:view'} display={'feat:login-activity'}>
                    <LoginActivityPage />
                </RequireAuth>
            )
        },
        {
            path: '/workspaces',
            element: (
                <RequireAuth permission={'workspace:view'} display={'feat:workspaces'}>
                    <Workspaces />
                </RequireAuth>
            )
        },
        {
            path: '/workspace-users/:id',
            element: (
                <RequireAuth permission={'workspace:view'} display={'feat:workspaces'}>
                    <WorkspaceDetails />
                </RequireAuth>
            )
        },
        {
            path: '/sso-config',
            element: (
                <RequireAuth permission={'sso:manage'} display={'feat:sso-config'}>
                    <SSOConfig />
                </RequireAuth>
            )
        },
        {
            path: '/sso-success',
            element: <SSOSuccess />
        }
    ]
}

export default MainRoutes
