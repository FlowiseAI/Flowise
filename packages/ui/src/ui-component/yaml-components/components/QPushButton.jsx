import PropTypes from 'prop-types'
import { Button } from '@mui/material'

const QPushButton = ({
    onClick,
    variant = 'contained',
    color = 'primary',
    disabled = false,
    size = 'medium',
    fullWidth = false,
    text = 'Submit'
}) => {
    return (
        <Button variant={variant} color={color} onClick={onClick} disabled={disabled} size={size} fullWidth={fullWidth}>
            {text}
        </Button>
    )
}

QPushButton.propTypes = {
    label: PropTypes.string || null || undefined,
    onClick: PropTypes.func,
    variant: PropTypes.oneOf(['contained', 'outlined', 'text']),
    color: PropTypes.oneOf(['primary', 'secondary', 'error', 'warning', 'info', 'success']),
    disabled: PropTypes.bool,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    fullWidth: PropTypes.bool,
    text: PropTypes.string
}

export default QPushButton
