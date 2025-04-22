import { Theme, useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import OutlinedInput from '@mui/material/OutlinedInput'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import Chip from '@mui/material/Chip'

const ITEM_HEIGHT = 36
const ITEM_PADDING_TOP = 8

const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250
        }
    }
}

function getStyles(option: string, value: readonly string[], theme: Theme) {
    return {
        fontWeight: value.indexOf(option) === -1 ? theme.typography.fontWeightRegular : theme.typography.fontWeightMedium
    }
}

export default function MultiSelect({
    sx,
    label,
    value,
    options,
    onChange
}: {
    sx?: any
    label: string
    options: any[]
    value: string[]
    onChange: any
}) {
    const theme = useTheme()

    const handleChange = (event: SelectChangeEvent<typeof value>) => {
        const { target } = event
        onChange(
            // On autofill we get a stringified value.
            typeof target?.value === 'string' ? target?.value.split(',') : target?.value
        )
    }

    return (
        <div>
            <FormControl sx={{ width: '100%', ...sx }}>
                <InputLabel id='demo-multiple-chip-label'>{label}</InputLabel>
                <Select
                    labelId='demo-multiple-chip-label'
                    id='demo-multiple-chip'
                    multiple
                    value={value}
                    onChange={handleChange}
                    sx={{ minHeight: 65 }}
                    input={<OutlinedInput id='select-multiple-chip' label='Chip' />}
                    renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value: any) => (
                                <Chip key={`${label}_${value}`} label={value} />
                            ))}
                        </Box>
                    )}
                    MenuProps={MenuProps}
                >
                    {options.map((option) => (
                        <MenuItem key={`${label}_${option}`} value={option} style={getStyles(option, value, theme)}>
                            {option}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </div>
    )
}
