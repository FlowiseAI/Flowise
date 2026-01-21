import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/store/context/ConfigContext'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router'
import { useLocation } from 'react-router-dom'

/**
 * Checks if a feature flag is enabled
 * @param {Object} features - Feature flags object
 * @param {string} display - Feature flag key to check
 * @param {React.ReactElement} children - Components to render if feature is enabled
 * @returns {React.ReactElement} Children or unauthorized redirect
 */
const checkFeatureFlag = (features, display, children) => {
    // Validate features object exists and is properly formatted
    if (!features || Array.isArray(features) || Object.keys(features).length === 0) {
        return <Navigate to='/unauthorized' replace />
    }

    // Check if feature flag exists and is enabled
    if (Object.hasOwnProperty.call(features, display)) {
        const isFeatureEnabled = features[display] === 'true' || features[display] === true
        return isFeatureEnabled ? children : <Navigate to='/unauthorized' replace />
    }

    return <Navigate to='/unauthorized' replace />
}

export const RequireAuth = ({ permission, display, children }) => {
    const location = useLocation()
    const { isCloud, isOpenSource, isEnterpriseLicensed, loading } = useConfig()
    const { hasPermission } = useAuth()
    const isGlobal = useSelector((state) => state.auth.isGlobal)
    const currentUser = useSelector((state) => state.auth.user)
    const features = useSelector((state) => state.auth.features)
    const permissions = useSelector((state) => state.auth.permissions)

    // Step 0: Wait for config to load
    if (loading) {
        return null
    }

    // Step 1: Authentication Check
    // Redirect to login if user is not authenticated
    if (!currentUser) {
        return <Navigate to='/login' replace state={{ path: location.pathname }} />
    }

    // Step 2: Deployment Type Specific Logic
    // Open Source: Only show features without display property
    if (isOpenSource) {
        return !display ? children : <Navigate to='/unauthorized' replace />
    }

    // Cloud & Enterprise: Check both permissions and feature flags
    if (isCloud || isEnterpriseLicensed) {
        // Routes with display property - check feature flags
        if (display) {
            // Check if user has any permissions
            if (permissions.length === 0) {
                return <Navigate to='/unauthorized' replace state={{ path: location.pathname }} />
            }

            // Organization admins bypass permission checks
            if (isGlobal) {
                return checkFeatureFlag(features, display, children)
            }

            // Check user permissions and feature flags
            if (!permission || hasPermission(permission)) {
                return checkFeatureFlag(features, display, children)
            }

            return <Navigate to='/unauthorized' replace />
        }

        // Standard routes: check permissions (global admins bypass)
        if (permission && !hasPermission(permission) && !isGlobal) {
            return <Navigate to='/unauthorized' replace />
        }

        return children
    }

    // Fallback: If none of the platform types match, deny access
    return <Navigate to='/unauthorized' replace />
}

RequireAuth.propTypes = {
    permission: PropTypes.string,
    display: PropTypes.string,
    children: PropTypes.element
}
