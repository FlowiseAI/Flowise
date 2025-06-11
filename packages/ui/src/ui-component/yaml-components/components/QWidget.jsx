import { Box } from '@mui/material'
import PropTypes from 'prop-types'

const QWidget = (props) => {
    const { children, style, className, onClick, layout } = props
    const isRow = layout === 'QHBoxLayout'
    return (
        <Box
            className={className}
            sx={{
                display: 'flex',
                flexDirection: isRow ? 'row' : 'column',
                padding: '8px',
                ...style
            }}
            onClick={onClick}
        >
            {children.map((child, index) => {
                return (
                    <div style={{ marginRight: isRow ? '12px' : '0px' }} key={`child_${index}`}>
                        {child}
                    </div>
                )
            })}
        </Box>
    )
}

QWidget.propTypes = {
    children: PropTypes.node,
    style: PropTypes.object,
    className: PropTypes.string,
    onClick: PropTypes.func,
    layout: PropTypes.string
}

export default QWidget
