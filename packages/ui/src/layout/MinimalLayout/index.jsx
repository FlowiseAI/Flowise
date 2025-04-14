// ==============================|| MINIMAL LAYOUT ||============================== //
import PropTypes from 'prop-types'
const MinimalLayout = ({ children }) => <>{children}</>

MinimalLayout.propTypes = {
    children: PropTypes.node.isRequired
}

export default MinimalLayout
