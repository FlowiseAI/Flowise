import { Box, FormControl, Popper, TextField, Typography } from '@mui/material'
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete'
import { styled, useTheme } from '@mui/material/styles'

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

export interface DropdownOption {
    label: string
    name: string
    description?: string
    imageSrc?: string
}

export interface DropdownProps {
    name?: string
    value: string
    options: DropdownOption[]
    onSelect: (value: string) => void
    disabled?: boolean
    loading?: boolean
    freeSolo?: boolean
    disableClearable?: boolean
}

/**
 * Autocomplete-based dropdown with search, image, and description support.
 * Mirrors the original Flowise Dropdown component.
 */
export function Dropdown({
    name,
    value,
    options = [],
    onSelect,
    disabled = false,
    loading = false,
    freeSolo = false,
    disableClearable = false
}: DropdownProps) {
    const theme = useTheme()

    const resolvedValue = value ?? 'choose an option'
    const findMatchingOption = (val: string) => options.find((option) => option.name === val) ?? null

    return (
        <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
            <Autocomplete
                id={name}
                disabled={disabled}
                freeSolo={freeSolo}
                disableClearable={disableClearable}
                size='small'
                loading={loading}
                options={options}
                value={findMatchingOption(resolvedValue)}
                getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                isOptionEqualToValue={(option, val) => option.name === val.name}
                onChange={(_e, selection) => {
                    const newValue = selection && typeof selection !== 'string' ? selection.name : ''
                    onSelect(newValue)
                }}
                PopperComponent={StyledPopper}
                renderInput={(params) => {
                    const matchingOption = findMatchingOption(resolvedValue)
                    return (
                        <TextField
                            {...params}
                            sx={{
                                height: '100%',
                                '& .MuiInputBase-root': {
                                    height: '100%',
                                    '& fieldset': {
                                        borderColor: theme.palette.divider
                                    }
                                }
                            }}
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: matchingOption?.imageSrc ? (
                                    <Box
                                        component='img'
                                        src={matchingOption.imageSrc}
                                        alt={matchingOption.label || 'Selected Option'}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%'
                                        }}
                                    />
                                ) : null
                            }}
                        />
                    )
                }}
                renderOption={(props, option) => (
                    <Box component='li' {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {option.imageSrc && (
                            <img
                                src={option.imageSrc}
                                alt={option.label}
                                style={{
                                    width: 30,
                                    height: 30,
                                    padding: 1,
                                    borderRadius: '50%'
                                }}
                            />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant='h5'>{option.label}</Typography>
                            {option.description && (
                                <Typography sx={{ color: theme.palette.text.secondary }}>{option.description}</Typography>
                            )}
                        </div>
                    </Box>
                )}
                sx={{ height: '100%' }}
            />
        </FormControl>
    )
}
