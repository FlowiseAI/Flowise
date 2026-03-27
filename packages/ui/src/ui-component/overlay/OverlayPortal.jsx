import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'

// Portal component to render overlay above everything
export const OverlayPortal = ({ children }) => {
    return createPortal(children, document.body)
}

OverlayPortal.propTypes = {
    children: PropTypes.node.isRequired
}
