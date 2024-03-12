import { useState } from 'react'
import PropTypes from 'prop-types'
import { FormControl, Switch } from '@mui/material'

export const SwitchInput = ({ value, onChange, disabled = false }) => {
    const [myValue, setMyValue] = useState(!!value ?? false)

    return (
        <>
            <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
                <Switch
                    disabled={disabled}
                    checked={myValue}
                    onChange={(event) => {
                        setMyValue(event.target.checked)
                        onChange(event.target.checked)
                    }}
                />
            </FormControl>
        </>
    )
}

SwitchInput.propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    onChange: PropTypes.func,
    disabled: PropTypes.bool
}
