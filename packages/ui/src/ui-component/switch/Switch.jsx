import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { FormControl, Switch, Typography } from '@mui/material'

export const SwitchInput = ({ label, value, onChange, disabled = false }) => {
    const [myValue, setMyValue] = useState(value !== undefined ? !!value : false)

    useEffect(() => {
        setMyValue(value)
    }, [value])

    return (
        <>
            <FormControl
                sx={{ mt: 1, width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                size='small'
            >
                {label && <Typography>{label}</Typography>}
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
    label: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    onChange: PropTypes.func,
    disabled: PropTypes.bool
}
