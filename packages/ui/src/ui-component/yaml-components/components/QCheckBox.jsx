import { useRef } from 'react'
import PropTypes from 'prop-types'
import { Checkbox, FormControlLabel } from '@mui/material'

const QCheckBox = (props) => {
    const { label, text, checked, onChange, currentPath, value, disabled = false } = props
    const defaultCheckedValue = useRef(value)
    return (
        <FormControlLabel
            control={
                <Checkbox
                    defaultChecked={defaultCheckedValue.current}
                    checked={checked}
                    onChange={(e) => onChange(currentPath, e.target.checked)}
                    disabled={disabled}
                />
            }
            label={text || label}
        />
    )
}

QCheckBox.propTypes = {
    value: PropTypes.bool,
    label: PropTypes.string || null,
    text: PropTypes.string || null,
    checked: PropTypes.bool,
    onChange: PropTypes.func,
    currentPath: PropTypes.string.isRequired,
    disabled: PropTypes.bool
}

export default QCheckBox
