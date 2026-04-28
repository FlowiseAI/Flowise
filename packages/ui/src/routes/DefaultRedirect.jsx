import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/store/context/ConfigContext'
import { useSelector } from 'react-redux'

// Import all view components
import Account from '@/views/account'
import Executions from '@/views/agentexecutions'
import Agentflows from '@/views/agentflows'
import APIKey from '@/views/apikey'
import Assistants from '@/views/assistants'
import Login from '@/views/auth/login'
import LoginActivityPage from '@/views/auth/loginActivity'
import SSOConfig from '@/views/auth/ssoConfig'
import Unauthorized from '@/views/auth/unauthorized'
import Chatflows from '@/views/chatflows'
import Credentials from '@/views/credentials'
import EvalDatasets from '@/views/datasets'
import Documents from '@/views/docstore'
import EvalEvaluation from '@/views/evaluations/index'
import Evaluators from '@/views/evaluators'
import Marketplaces from '@/views/marketplaces'
import RolesPage from '@/views/roles'
import Logs from '@/views/serverlogs'
import Tools from '@/views/tools'
import UsersPage from '@/views/users'
import Variables from '@/views/variables'
import Workspaces from '@/views/workspace'

/**
 * Component that redirects users to the first accessible page based on their permissions
 * This prevents 403 errors when users don't have access to the default chatflows page
 */
export const DefaultRedirect = () => {
    const { hasPermission, hasDisplay } = useAuth()
    const { isOpenSource } = useConfig()
    const isGlobal = useSelector((state) => state.auth.isGlobal)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    // Define the order of routes to check (based on the menu order in dashboard.js)
    const routesToCheck = [
        { component: Chatflows, permission: 'chatflows:view' },
        { component: Agentflows, permission: 'agentflows:view' },
        { component: Executions, permission: 'executions:view' },
        { component: Assistants, permission: 'assistants:view' },
        { component: Marketplaces, permission: 'templates:marketplace,templates:custom' },
        { component: Tools, permission: 'tools:view' },
        { component: Credentials, permission: 'credentials:view' },
        { component: Variables, permission: 'variables:view' },
        { component: APIKey, permission: 'apikeys:view' },
        { component: Documents, permission: 'documentStores:view' },
        // Evaluation routes (with display flags)
        { component: EvalDatasets, permission: 'datasets:view', display: 'feat:datasets' },
        { component: Evaluators, permission: 'evaluators:view', display: 'feat:evaluators' },
        { component: EvalEvaluation, permission: 'evaluations:view', display: 'feat:evaluations' },
        // Management routes (with display flags)
        { component: SSOConfig, permission: 'sso:manage', display: 'feat:sso-config' },
        { component: RolesPage, permission: 'roles:manage', display: 'feat:roles' },
        { component: UsersPage, permission: 'users:manage', display: 'feat:users' },
        { component: Workspaces, permission: 'workspace:view', display: 'feat:workspaces' },
        { component: LoginActivityPage, permission: 'loginActivity:view', display: 'feat:login-activity' },
        // Other routes
        { component: Logs, permission: 'logs:view', display: 'feat:logs' },
        { component: Account, display: 'feat:account' }
    ]

    // If user is not authenticated, show login page
    if (!isAuthenticated) {
        return <Login />
    }

    // For open source, show chatflows (no permission checks)
    if (isOpenSource) {
        return <Chatflows />
    }

    // For global admins, show chatflows (they have access to everything)
    if (isGlobal) {
        return <Chatflows />
    }

    // Check each route in order and return the first accessible component
    for (const route of routesToCheck) {
        const { component: Component, permission, display } = route

        // Check permission if specified
        const hasRequiredPermission = !permission || hasPermission(permission)

        // Check display flag if specified
        const hasRequiredDisplay = !display || hasDisplay(display)

        // If user has both required permission and display access, return this component
        if (hasRequiredPermission && hasRequiredDisplay) {
            return <Component />
        }
    }

    // If no accessible routes found, show unauthorized page
    // This should rarely happen as most users should have at least one permission
    return <Unauthorized />
}
