import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSelector } from 'react-redux'
import { useConfig } from '@/store/context/ConfigContext'

/**
 * Component that redirects users to the first accessible page based on their permissions
 * This prevents 403 errors when users don't have access to the default chatflows page
 */
export const DefaultRedirect = () => {
    const { hasPermission, hasDisplay } = useAuth()
    const { isOpenSource } = useConfig()
    const isGlobal = useSelector((state) => state.auth.isGlobal)

    // Define the order of routes to check (based on the menu order in dashboard.js)
    const routesToCheck = [
        { path: '/chatflows', permission: 'chatflows:view' },
        { path: '/agentflows', permission: 'agentflows:view' },
        { path: '/executions', permission: 'executions:view' },
        { path: '/assistants', permission: 'assistants:view' },
        { path: '/marketplaces', permission: 'templates:marketplace,templates:custom' },
        { path: '/tools', permission: 'tools:view' },
        { path: '/credentials', permission: 'credentials:view' },
        { path: '/variables', permission: 'variables:view' },
        { path: '/apikey', permission: 'apikeys:view' },
        { path: '/document-stores', permission: 'documentStores:view' },
        // Evaluation routes (with display flags)
        { path: '/datasets', permission: 'datasets:view', display: 'feat:datasets' },
        { path: '/evaluators', permission: 'evaluators:view', display: 'feat:evaluators' },
        { path: '/evaluations', permission: 'evaluations:view', display: 'feat:evaluations' },
        // Management routes (with display flags)
        { path: '/sso-config', permission: 'sso:manage', display: 'feat:sso-config' },
        { path: '/roles', permission: 'roles:manage', display: 'feat:roles' },
        { path: '/users', permission: 'users:manage', display: 'feat:users' },
        { path: '/workspaces', permission: 'workspace:view', display: 'feat:workspaces' },
        { path: '/login-activity', permission: 'loginActivity:view', display: 'feat:login-activity' },
        // Other routes
        { path: '/logs', permission: 'logs:view', display: 'feat:logs' },
        { path: '/account', display: 'feat:account' }
    ]

    // For open source, redirect to chatflows (no permission checks)
    if (isOpenSource) {
        return <Navigate to='/chatflows' replace />
    }

    // For global admins, redirect to chatflows (they have access to everything)
    if (isGlobal) {
        return <Navigate to='/chatflows' replace />
    }

    // Check each route in order and redirect to the first accessible one
    for (const route of routesToCheck) {
        const { path, permission, display } = route

        // Check permission if specified
        const hasRequiredPermission = !permission || hasPermission(permission)

        // Check display flag if specified
        const hasRequiredDisplay = !display || hasDisplay(display)

        // If user has both required permission and display access, redirect to this route
        if (hasRequiredPermission && hasRequiredDisplay) {
            return <Navigate to={path} replace />
        }
    }

    // If no accessible routes found, redirect to unauthorized
    // This should rarely happen as most users should have at least one permission
    return <Navigate to='/unauthorized' replace />
}
