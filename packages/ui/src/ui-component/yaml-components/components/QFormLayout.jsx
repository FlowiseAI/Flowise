import PropTypes from 'prop-types'

const QFormLayout = ({ children }) => {
    return <div style={{ width: '100%' }}>{children}</div>
}

QFormLayout.propTypes = {
    children: PropTypes.node
}

export default QFormLayout
