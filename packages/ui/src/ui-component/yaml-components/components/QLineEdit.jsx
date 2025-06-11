import { useState, useEffect } from 'react'
import { TextField } from '@mui/material'
import PropTypes from 'prop-types'

const QLineEdit = (props) => {
    const {
        value,
        onChange,
        currentPath,
        properties = {},
        label,
        type = 'text',
        required = false,
        disabled = false,
        error = false,
        helperText = '',
        style
    } = props

    const { placeholder = '' } = properties
    // 确保value始终有一个有效值
    const [controlledValue, setControlledValue] = useState(value === undefined ? '' : value)

    const handleChange = (event) => {
        const newValue = event.target.value
        setControlledValue(newValue)
    }

    useEffect(() => {
        onChange(currentPath, controlledValue)
    }, [controlledValue])

    return (
        <TextField
            value={controlledValue}
            onChange={handleChange}
            placeholder={placeholder}
            label={label}
            type={type}
            required={required}
            disabled={disabled}
            error={error}
            helperText={helperText}
            fullWidth
            size='small'
            sx={{
                '& .MuiOutlinedInput-root': {
                    borderRadius: '4px'
                },
                ...style
            }}
        />
    )
}

QLineEdit.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    currentPath: PropTypes.string.isRequired,
    placeholder: PropTypes.string,
    label: PropTypes.string,
    type: PropTypes.string,
    required: PropTypes.bool,
    disabled: PropTypes.bool,
    error: PropTypes.bool,
    helperText: PropTypes.string,
    style: PropTypes.object,
    properties: PropTypes.object
}

export default QLineEdit
