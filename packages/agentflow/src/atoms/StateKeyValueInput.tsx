import { useCallback, useMemo } from 'react'

import { Box, Button, IconButton, TextField, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconPlus, IconTrash } from '@tabler/icons-react'

import type { StateUpdate } from '@/core/types'

import type { SuggestionItem } from './SuggestionDropdown'
import { useStableKeys } from './useStableKeys'
import { VariableInput } from './VariableInput'

export interface StateKeyValueInputProps {
    value: StateUpdate[]
    onChange: (value: StateUpdate[]) => void
    disabled?: boolean
    /** Available variables for autocomplete in the value field */
    suggestionItems?: SuggestionItem[]
}

/**
 * Key-value pair editor for flow state updates.
 * Keys are plain text; values support variable syntax via VariableInput.
 */
export function StateKeyValueInput({ value, onChange, disabled = false, suggestionItems }: StateKeyValueInputProps) {
    const theme = useTheme()

    const entries = useMemo(() => (Array.isArray(value) ? value : []), [value])
    const { keys: stableKeys, removeKey } = useStableKeys(entries.length, 'state-kv')

    const handleKeyChange = useCallback(
        (index: number, newKey: string) => {
            const updated = entries.map((entry, i) => (i === index ? { ...entry, key: newKey } : entry))
            onChange(updated)
        },
        [entries, onChange]
    )

    const handleValueChange = useCallback(
        (index: number, newValue: string) => {
            const updated = entries.map((entry, i) => (i === index ? { ...entry, value: newValue } : entry))
            onChange(updated)
        },
        [entries, onChange]
    )

    const handleAdd = useCallback(() => {
        onChange([...entries, { key: '', value: '' }])
    }, [entries, onChange])

    const handleRemove = useCallback(
        (index: number) => {
            removeKey(index)
            onChange(entries.filter((_, i) => i !== index))
        },
        [entries, onChange, removeKey]
    )

    return (
        <Box data-testid='state-key-value-input'>
            {entries.map((entry, index) => (
                <Box
                    key={stableKeys[index]}
                    sx={{
                        p: 2,
                        mt: 1,
                        mb: 1,
                        border: 1,
                        borderColor: theme.palette.grey[300],
                        borderRadius: 2,
                        position: 'relative'
                    }}
                >
                    <IconButton
                        title='Remove'
                        onClick={() => handleRemove(index)}
                        disabled={disabled}
                        sx={{
                            position: 'absolute',
                            height: 30,
                            width: 30,
                            right: 8,
                            top: 8,
                            '&:hover': { color: theme.palette.error.main }
                        }}
                    >
                        <IconTrash size={18} />
                    </IconButton>

                    <Typography variant='body2' fontWeight={500} sx={{ mb: 0.5 }}>
                        Key
                    </Typography>
                    <TextField
                        fullWidth
                        size='small'
                        disabled={disabled}
                        placeholder='State key name'
                        value={entry.key}
                        onChange={(e) => handleKeyChange(index, e.target.value)}
                    />

                    <Typography variant='body2' fontWeight={500} sx={{ mt: 1.5, mb: 0.5 }}>
                        Value
                    </Typography>
                    <VariableInput
                        value={entry.value}
                        onChange={(v) => handleValueChange(index, v)}
                        placeholder='Value (supports {{variables}})'
                        disabled={disabled}
                        suggestionItems={suggestionItems}
                    />
                </Box>
            ))}

            <Button
                fullWidth
                size='small'
                variant='outlined'
                disabled={disabled}
                sx={{ borderRadius: '16px', mt: 1 }}
                startIcon={<IconPlus />}
                onClick={handleAdd}
            >
                Add State Update
            </Button>
        </Box>
    )
}
