import PropTypes from 'prop-types'
import { useTheme } from '@mui/material'
import { useSelector } from 'react-redux'

// Arrow pointer for tooltip
export const Arrow = ({ placement }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const isDarkMode = customization.isDarkMode
    const arrowColor = isDarkMode ? theme.palette.background.paper : 'white'

    const base = {
        position: 'absolute',
        width: 0,
        height: 0,
        borderStyle: 'solid'
    }

    const styles = {
        top: {
            ...base,
            bottom: -8,
            left: 24,
            borderWidth: '8px 8px 0 8px',
            borderColor: `${arrowColor} transparent transparent transparent`
        },
        bottom: {
            ...base,
            top: -8,
            left: 24,
            borderWidth: '0 8px 8px 8px',
            borderColor: `transparent transparent ${arrowColor} transparent`
        },
        left: {
            ...base,
            right: -8,
            top: 18,
            borderWidth: '8px 0 8px 8px',
            borderColor: `transparent transparent transparent ${arrowColor}`
        },
        right: {
            ...base,
            left: -8,
            top: 18,
            borderWidth: '8px 8px 8px 0',
            borderColor: `transparent ${arrowColor} transparent transparent`
        },
        'top-left': {
            ...base,
            bottom: -8,
            right: 24,
            borderWidth: '8px 8px 0 8px',
            borderColor: `${arrowColor} transparent transparent transparent`
        },
        'top-right': {
            ...base,
            bottom: -8,
            left: 24,
            borderWidth: '8px 8px 0 8px',
            borderColor: `${arrowColor} transparent transparent transparent`
        },
        'bottom-left': {
            ...base,
            top: -8,
            right: 24,
            borderWidth: '0 8px 8px 8px',
            borderColor: `transparent transparent ${arrowColor} transparent`
        },
        'bottom-right': {
            ...base,
            top: -8,
            left: 24,
            borderWidth: '0 8px 8px 8px',
            borderColor: `transparent transparent ${arrowColor} transparent`
        }
    }

    return <div style={styles[placement]} />
}

Arrow.propTypes = {
    placement: PropTypes.oneOf(['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).isRequired
}
