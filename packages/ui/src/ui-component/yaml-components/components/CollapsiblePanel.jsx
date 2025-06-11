import PropTypes from 'prop-types'
import { Collapse } from 'antd'

const CollapsiblePanel = ({ title, children }) => {
    const items = [
        {
            key: '1',
            label: title,
            children: children
        }
    ]

    return <Collapse defaultActiveKey={['1']} items={items} style={{ width: '100%' }} />
}

CollapsiblePanel.propTypes = {
    title: PropTypes.string,
    children: PropTypes.node
}

export default CollapsiblePanel
