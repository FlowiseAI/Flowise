import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { Box, TextField } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export const TimePicker = ({ value, onChange, disabled = false, placeholder = '09:00' }) => {
    const theme = useTheme()
    const isDark = useSelector((state) => state.customization?.isDarkMode)
    const [timeValue, setTimeValue] = useState(value || '')

    useEffect(() => {
        setTimeValue(value || '')
    }, [value])

    const handleChange = (e) => {
        const newValue = e.target.value
        setTimeValue(newValue)
        onChange(newValue)
    }

    return (
        <Box className={isDark ? 'picker-dark' : ''} sx={{ mt: 1, width: '100%' }}>
            <TextField
                fullWidth
                size='small'
                type='time'
                disabled={disabled}
                value={timeValue}
                onChange={handleChange}
                placeholder={placeholder}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                    step: 60,
                    onClick: (e) => {
                        if (!disabled) e.currentTarget.showPicker?.()
                    }
                }}
                sx={{
                    '& .MuiInputBase-root': {
                        cursor: disabled ? 'default' : 'pointer',
                        '& fieldset': {
                            borderColor: theme.palette.grey[900] + 25
                        }
                    },
                    '& input': {
                        cursor: disabled ? 'default' : 'pointer'
                    }
                }}
            />
        </Box>
    )
}

TimePicker.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    placeholder: PropTypes.string
}
