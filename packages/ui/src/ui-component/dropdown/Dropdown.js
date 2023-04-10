import { useState } from 'react'
import { useSelector } from 'react-redux'

import { Popper, FormControl, TextField, Box, Typography } from '@mui/material'
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete'
import { styled } from '@mui/material/styles'
import PropTypes from 'prop-types'

const StyledPopper = styled(Popper)({
    boxShadow: '0px 8px 10px -5px rgb(0 0 0 / 20%), 0px 16px 24px 2px rgb(0 0 0 / 14%), 0px 6px 30px 5px rgb(0 0 0 / 12%)',
    borderRadius: '10px',
    [`& .${autocompleteClasses.listbox}`]: {
        boxSizing: 'border-box',
        '& ul': {
            padding: 10,
            margin: 10
        }
    }
})

export const Dropdown = ({ name, value, options, onSelect, disabled = false }) => {
    const customization = useSelector((state) => state.customization)
    const findMatchingOptions = (options = [], value) => options.find((option) => option.name === value)
    const getDefaultOptionValue = () => ''
    let [internalValue, setInternalValue] = useState(value ?? 'choose an option')

    return (
        <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
            <Autocomplete
                id={name}
                disabled={disabled}
                size='small'
                options={options || []}
                value={findMatchingOptions(options, internalValue) || getDefaultOptionValue()}
                onChange={(e, selection) => {
                    const value = selection ? selection.name : ''
                    setInternalValue(value)
                    onSelect(value)
                }}
                PopperComponent={StyledPopper}
                renderInput={(params) => <TextField {...params} value={internalValue} />}
                renderOption={(props, option) => (
                    <Box component='li' {...props}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant='h5'>{option.label}</Typography>
                            {option.description && (
                                <Typography sx={{ color: customization.isDarkMode ? '#9e9e9e' : '' }}>{option.description}</Typography>
                            )}
                        </div>
                    </Box>
                )}
            />
        </FormControl>
    )
}

Dropdown.propTypes = {
    name: PropTypes.string,
    value: PropTypes.string,
    options: PropTypes.array,
    onSelect: PropTypes.func,
    disabled: PropTypes.bool
}
