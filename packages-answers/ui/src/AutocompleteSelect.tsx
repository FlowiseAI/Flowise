import * as React from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import Box from '@mui/material/Box'

const icon = <CheckBoxOutlineBlankIcon fontSize='small' />
const checkedIcon = <CheckBoxIcon fontSize='small' />

interface Props<T> {
    sx?: any
    label?: string
    placeholder?: string
    options: T[]
    value: T[]
    onChange?: (value: T[]) => void
    onInputChange?: (event: React.SyntheticEvent, value: string) => void
    inputValue?: string
    onFocus?: React.FocusEventHandler<HTMLDivElement>
    getOptionLabel?: (value: T) => string
    // getOptionValue?: (value: T) => string;
}
export default function AutocompleteSelect<T>({
    sx,
    label,
    options,
    value,
    onChange,
    getOptionLabel,
    // getOptionValue,
    placeholder,
    ...props
}: Props<T>) {
    const handleChange = (event: any, newValue: any) => {
        if (onChange) onChange(newValue)
    }

    return (
        <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
            <Autocomplete
                {...props}
                size='small'
                open={options?.length > 0}
                disablePortal
                sx={{
                    width: '100%',
                    ...sx,

                    '.MuiCollapse-wrapperInner': {
                        gap: 1,
                        display: 'flex',
                        flexDirection: 'column'
                    },
                    '.MuiAutocomplete-popper': { position: 'relative!important', width: '100%' }
                }}
                multiple
                id={`${label}`}
                options={options}
                getOptionLabel={getOptionLabel as any}
                value={value ?? []}
                isOptionEqualToValue={(option: any, value: any) => JSON.stringify(option) === JSON.stringify(value)}
                onChange={handleChange}
                PopperComponent={({ children, props: { anchorEl: _anchorEl = null, ...props } = {} }: any) => (
                    <Box
                        {...props}
                        sx={{
                            position: 'relative!important',
                            width: '100%!important',
                            '.MuiAutocomplete-listbox': {
                                overflow: 'auto',
                                maxHeight: 175
                            }
                        }}
                    >
                        {children}
                    </Box>
                )}
                renderTags={() => null}
                // renderTags={(tagValue, getTagProps) =>
                //   tagValue.map((option, index) => (
                //     <Chip
                //       label={getOptionLabel ? getOptionLabel(options[index]) : option}
                //       {...getTagProps({ index })}
                //       // disabled={fixedOptions.indexOf(option) !== -1}
                //     />
                //   ))
                // }
                // @ts-expect-error
                renderOption={({ key, ...itemProps }, option, { selected }) => {
                    return (
                        <li key={`${key}:${JSON.stringify(option)}`} {...itemProps}>
                            <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} size={'small'} />
                            {getOptionLabel ? getOptionLabel(option) : (option as object).toString()}
                        </li>
                    )
                }}
                renderInput={(params) => <TextField {...params} label={label} placeholder={placeholder ?? `Enter ${label}`} size='small' />}
            />
        </Box>
    )
}
