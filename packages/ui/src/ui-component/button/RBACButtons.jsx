import * as PropTypes from 'prop-types'
import { useAuth } from '@/hooks/useAuth'
import { StyledButton, StyledToggleButton } from '@/ui-component/button/StyledButton'
import { Button, IconButton, ListItemButton, MenuItem, Tab } from '@mui/material'

export const StyledPermissionButton = ({ permissionId, display, ...props }) => {
    const { hasPermission, hasDisplay } = useAuth()

    if (!hasPermission(permissionId) || !hasDisplay(display)) {
        return null
    }

    return <StyledButton {...props} />
}

export const StyledPermissionToggleButton = ({ permissionId, display, ...props }) => {
    const { hasPermission, hasDisplay } = useAuth()

    if (!hasPermission(permissionId) || !hasDisplay(display)) {
        return null
    }

    return <StyledToggleButton {...props} />
}

export const PermissionIconButton = ({ permissionId, display, ...props }) => {
    const { hasPermission, hasDisplay } = useAuth()

    if (!hasPermission(permissionId) || !hasDisplay(display)) {
        return null
    }

    return <IconButton {...props} />
}

export const PermissionButton = ({ permissionId, display, ...props }) => {
    const { hasPermission, hasDisplay } = useAuth()

    if (!hasPermission(permissionId) || !hasDisplay(display)) {
        return null
    }

    return <Button {...props} />
}

export const PermissionTab = ({ permissionId, display, ...props }) => {
    const { hasPermission, hasDisplay } = useAuth()

    if (!hasPermission(permissionId) || !hasDisplay(display)) {
        return null
    }

    return <Tab {...props} />
}

export const PermissionMenuItem = ({ permissionId, display, ...props }) => {
    const { hasPermission, hasDisplay } = useAuth()

    if (!hasPermission(permissionId) || !hasDisplay(display)) {
        return null
    }

    return <MenuItem {...props} />
}

export const PermissionListItemButton = ({ permissionId, display, ...props }) => {
    const { hasPermission, hasDisplay } = useAuth()

    if (!hasPermission(permissionId) || !hasDisplay(display)) {
        return null
    }

    return <ListItemButton {...props} />
}

StyledPermissionButton.propTypes = { permissionId: PropTypes.string, display: PropTypes.array }
StyledPermissionToggleButton.propTypes = { permissionId: PropTypes.string, display: PropTypes.array }
PermissionIconButton.propTypes = { permissionId: PropTypes.string, display: PropTypes.array }
PermissionButton.propTypes = { permissionId: PropTypes.string, display: PropTypes.array }
PermissionTab.propTypes = { permissionId: PropTypes.string, display: PropTypes.array }
PermissionMenuItem.propTypes = { permissionId: PropTypes.string, display: PropTypes.array }
PermissionListItemButton.propTypes = { permissionId: PropTypes.string, display: PropTypes.array }
