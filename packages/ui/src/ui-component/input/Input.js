import { useState } from 'react'
import PropTypes from 'prop-types'
import { FormControl, OutlinedInput } from '@mui/material'

export const Input = ({ inputParam, value, onChange }) => {
    const [myValue, setMyValue] = useState(value ?? '')
    return (
        <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
            <OutlinedInput
                id={inputParam.name}
                size='small'
                type={inputParam.type === 'string' ? 'text' : inputParam.type}
                placeholder={inputParam.placeholder}
                multiline={!!inputParam.rows}
                maxRows={inputParam.rows || 0}
                minRows={inputParam.rows || 0}
                value={myValue}
                name={inputParam.name}
                onChange={(e) => {
                    setMyValue(e.target.value)
                    onChange(e.target.value)
                }}
            />
        </FormControl>
    )
}

Input.propTypes = {
    inputParam: PropTypes.object,
    value: PropTypes.string,
    onChange: PropTypes.func
}
