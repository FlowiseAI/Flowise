import { useSelector } from 'react-redux'
import { useConfig } from '@/store/context/ConfigContext'

export const useAuth = () => {
    const { isOpenSource } = useConfig()
    const permissions = useSelector((state) => state.auth.permissions)
    const features = useSelector((state) => state.auth.features)
    const isGlobal = useSelector((state) => state.auth.isGlobal)
    const currentUser = useSelector((state) => state.auth.user)

    const hasPermission = (permissionId) => {
        if (isOpenSource || isGlobal) {
            return true
        }
        if (!permissionId) return false
        const permissionIds = permissionId.split(',')
        if (permissions && permissions.length) {
            return permissionIds.some((permissionId) => permissions.includes(permissionId))
        }
        return false
    }

    const hasAssignedWorkspace = (workspaceId) => {
        if (isOpenSource || isGlobal) {
            return true
        }
        const activeWorkspaceId = currentUser?.activeWorkspaceId || ''
        if (workspaceId === activeWorkspaceId) {
            return true
        }
        return false
    }

    const hasDisplay = (display) => {
        if (!display) {
            return true
        }

        // if it has display flag, but user has no features, then it should not be displayed
        if (!features || Array.isArray(features) || Object.keys(features).length === 0) {
            return false
        }

        // check if the display flag is in the features
        if (Object.hasOwnProperty.call(features, display)) {
            const flag = features[display] === 'true' || features[display] === true
            return flag
        }

        return false
    }

    return { hasPermission, hasAssignedWorkspace, hasDisplay }
}
