import { useImperativeHandle, forwardRef } from 'react'
import PropTypes from 'prop-types'
import { Radio, FormControlLabel } from '@mui/material'

const QRadioButton = forwardRef(({ label, text, disabled = false }, ref) => {
    useImperativeHandle(ref, () => ({}))

    return <FormControlLabel control={<Radio value={label || text} disabled={disabled} />} label={label} />
})

QRadioButton.propTypes = {
    label: PropTypes.string,
    checked: PropTypes.bool,
    onChange: PropTypes.func,
    currentPath: PropTypes.string.isRequired,
    value: PropTypes.any,
    disabled: PropTypes.bool,
    text: PropTypes.string,
    properties: PropTypes.object
}

QRadioButton.displayName = 'QRadioButton'

export default QRadioButton
