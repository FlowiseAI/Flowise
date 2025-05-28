import { Navigate } from 'react-router'
import PropTypes from 'prop-types'
import { useLocation } from 'react-router-dom'
import { useConfig } from '@/store/context/ConfigContext'
import { useAuth } from '@/hooks/useAuth'
import { useSelector } from 'react-redux'

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
    const { isCloud, isOpenSource, isEnterpriseLicensed } = useConfig()
    const { hasPermission } = useAuth()
    const isGlobal = useSelector((state) => state.auth.isGlobal)
    const currentUser = useSelector((state) => state.auth.user)
    const features = useSelector((state) => state.auth.features)
    const permissions = useSelector((state) => state.auth.permissions)

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
        // Allow access to basic features (no display property)
        if (!display) return children

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

    // Fallback: Allow access if none of the above conditions match
    return children
}

RequireAuth.propTypes = {
    permission: PropTypes.string,
    display: PropTypes.string,
    children: PropTypes.element
}
