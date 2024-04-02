import { useState } from 'react'
import PropTypes from 'prop-types'
import { FormControlLabel, Checkbox } from '@mui/material'

export const CheckboxInput = ({ value, label, onChange, disabled = false }) => {
    const [myValue, setMyValue] = useState(value)

    return (
        <>
            <FormControlLabel
                sx={{ mt: 1, width: '100%' }}
                size='small'
                control={
                    <Checkbox
                        disabled={disabled}
                        checked={myValue}
                        onChange={(event) => {
                            setMyValue(event.target.checked)
                            onChange(event.target.checked)
                        }}
                    />
                }
                label={label}
            />
        </>
    )
}

CheckboxInput.propTypes = {
    value: PropTypes.bool,
    label: PropTypes.string,
    onChange: PropTypes.func,
    disabled: PropTypes.bool
}
