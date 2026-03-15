import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Box, TextField } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export const TimePicker = ({ value, onChange, disabled = false, placeholder = '09:00' }) => {
    const theme = useTheme()
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
        <Box sx={{ mt: 1, width: '100%' }}>
            <TextField
                fullWidth
                size='small'
                type='time'
                disabled={disabled}
                value={timeValue}
                onChange={handleChange}
                placeholder={placeholder}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 60 }}
                sx={{
                    '& .MuiInputBase-root': {
                        '& fieldset': {
                            borderColor: theme.palette.grey[900] + 25
                        }
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
