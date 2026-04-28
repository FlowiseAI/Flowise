import PropTypes from 'prop-types'
import { useAuth } from '@/hooks/useAuth'

export const Available = ({ permission, children }) => {
    const { hasPermission } = useAuth()
    if (hasPermission(permission)) {
        return children
    }
}

Available.propTypes = {
    permission: PropTypes.string,
    children: PropTypes.element
}
