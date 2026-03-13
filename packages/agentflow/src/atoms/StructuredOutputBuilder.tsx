import { useCallback, useEffect, useMemo, useRef } from 'react'

import { Box, Button, Chip, IconButton, MenuItem, Select, TextField, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconPlus, IconTrash } from '@tabler/icons-react'

import type { InputParam, NodeData } from '@/core/types'

const OUTPUT_TYPES = [
    { label: 'String', value: 'string' },
    { label: 'String Array', value: 'stringArray' },
    { label: 'Number', value: 'number' },
    { label: 'Boolean', value: 'boolean' },
    { label: 'Enum', value: 'enum' },
    { label: 'JSON Array', value: 'jsonArray' }
] as const

type OutputType = (typeof OUTPUT_TYPES)[number]['value']

export interface StructuredOutputEntry {
    key: string
    type: OutputType
    enumValues?: string
    jsonSchema?: string
    description?: string
}

export interface StructuredOutputBuilderProps {
    inputParam: InputParam
    data: NodeData
    disabled?: boolean
    onDataChange?: (params: { inputParam: InputParam; newValue: unknown }) => void
}

/**
 * Specialized array input for structured output schemas (Agent + LLM nodes).
 * Each entry has a key text field, a type dropdown, optional conditional fields
 * (enum values, JSON schema), and a description field.
 */
export function StructuredOutputBuilder({ inputParam, data, disabled = false, onDataChange }: StructuredOutputBuilderProps) {
    const theme = useTheme()
    const idCounterRef = useRef(0)
    const itemKeysRef = useRef<string[]>([])

    const entries = useMemo(
        () => (Array.isArray(data.inputValues?.[inputParam.name]) ? (data.inputValues[inputParam.name] as StructuredOutputEntry[]) : []),
        [data.inputValues, inputParam.name]
    )

    // Grow keys array when new items appear (e.g. on mount or external data changes)
    useEffect(() => {
        while (itemKeysRef.current.length < entries.length) {
            itemKeysRef.current.push(`output-${idCounterRef.current++}`)
        }
    }, [entries.length])

    const handleFieldChange = useCallback(
        (index: number, field: string, value: string) => {
            const updated = [...entries]
            const updatedEntry = { ...updated[index], [field]: value }

            // Clear conditional fields when type changes
            if (field === 'type') {
                if (value !== 'enum') updatedEntry.enumValues = ''
                if (value !== 'jsonArray') updatedEntry.jsonSchema = ''
            }

            updated[index] = updatedEntry
            onDataChange?.({ inputParam, newValue: updated })
        },
        [entries, inputParam, onDataChange]
    )

    const handleAddEntry = useCallback(() => {
        const newEntry: StructuredOutputEntry = { key: '', type: 'string', description: '' }
        onDataChange?.({ inputParam, newValue: [...entries, newEntry] })
    }, [entries, inputParam, onDataChange])

    const handleDeleteEntry = useCallback(
        (indexToDelete: number) => {
            itemKeysRef.current.splice(indexToDelete, 1)
            onDataChange?.({ inputParam, newValue: entries.filter((_, i) => i !== indexToDelete) })
        },
        [entries, inputParam, onDataChange]
    )

    const isDeleteVisible = !inputParam.minItems || entries.length > inputParam.minItems
    const isAddDisabled = disabled || (!!inputParam.maxItems && entries.length >= inputParam.maxItems)

    return (
        <>
            {/* Section header */}
            <Box sx={{ p: 2, pb: 0 }}>
                <Typography>{inputParam.label}</Typography>
            </Box>

            {entries.map((entry, index) => (
                <Box
                    key={itemKeysRef.current[index]}
                    sx={{
                        p: 2,
                        mt: 2,
                        mb: 1,
                        border: 1,
                        borderColor: theme.palette.grey[900] + 25,
                        borderRadius: 2,
                        position: 'relative'
                    }}
                >
                    {/* Delete button */}
                    {isDeleteVisible && (
                        <IconButton
                            title='Delete'
                            disabled={disabled}
                            onClick={() => handleDeleteEntry(index)}
                            sx={{
                                position: 'absolute',
                                height: '35px',
                                width: '35px',
                                right: 10,
                                top: 10,
                                '&:hover': { color: 'red' }
                            }}
                        >
                            <IconTrash />
                        </IconButton>
                    )}

                    {/* Index chip */}
                    <Chip label={`${index}`} size='small' sx={{ position: 'absolute', right: isDeleteVisible ? 45 : 10, top: 16 }} />

                    {/* Key field */}
                    <Box sx={{ p: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <Typography>
                                Key
                                <span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                        </div>
                        <TextField
                            fullWidth
                            size='small'
                            value={entry.key}
                            disabled={disabled}
                            onChange={(e) => handleFieldChange(index, 'key', e.target.value)}
                            sx={{ mt: 1 }}
                            data-testid={`key-input-${index}`}
                        />
                    </Box>

                    {/* Type field */}
                    <Box sx={{ p: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <Typography>
                                Type
                                <span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                        </div>
                        <Select
                            fullWidth
                            size='small'
                            value={entry.type}
                            disabled={disabled}
                            onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                            sx={{ mt: 1 }}
                            data-testid={`type-select-${index}`}
                        >
                            {OUTPUT_TYPES.map((t) => (
                                <MenuItem key={t.value} value={t.value}>
                                    {t.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>

                    {/* Enum Values — conditional on type === 'enum' */}
                    {entry.type === 'enum' && (
                        <Box sx={{ p: 2 }}>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <Typography>Enum Values</Typography>
                            </div>
                            <TextField
                                fullWidth
                                size='small'
                                value={entry.enumValues ?? ''}
                                disabled={disabled}
                                onChange={(e) => handleFieldChange(index, 'enumValues', e.target.value)}
                                placeholder='value1, value2, value3'
                                sx={{ mt: 1 }}
                                data-testid={`enum-values-${index}`}
                            />
                        </Box>
                    )}

                    {/* JSON Schema — conditional on type === 'jsonArray' */}
                    {entry.type === 'jsonArray' && (
                        <Box sx={{ p: 2 }}>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                <Typography>JSON Schema</Typography>
                            </div>
                            <TextField
                                fullWidth
                                multiline
                                minRows={4}
                                size='small'
                                value={entry.jsonSchema ?? ''}
                                disabled={disabled}
                                onChange={(e) => handleFieldChange(index, 'jsonSchema', e.target.value)}
                                placeholder='{ "key": { "type": "string", "description": "..." } }'
                                sx={{ mt: 1 }}
                                data-testid={`json-schema-${index}`}
                            />
                        </Box>
                    )}

                    {/* Description field */}
                    <Box sx={{ p: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <Typography>Description</Typography>
                        </div>
                        <TextField
                            fullWidth
                            size='small'
                            value={entry.description ?? ''}
                            disabled={disabled}
                            onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                            placeholder='Description of the key'
                            sx={{ mt: 1 }}
                            data-testid={`description-input-${index}`}
                        />
                    </Box>
                </Box>
            ))}

            {/* Add button */}
            <Button
                fullWidth
                size='small'
                variant='outlined'
                disabled={isAddDisabled}
                sx={{ borderRadius: '16px', mt: 2 }}
                startIcon={<IconPlus />}
                onClick={handleAddEntry}
            >
                Add {inputParam.label}
            </Button>
        </>
    )
}
