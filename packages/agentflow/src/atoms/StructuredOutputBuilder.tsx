import { useCallback, useMemo, useState } from 'react'

import { Box, Button, Chip, IconButton, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconArrowsMaximize, IconInfoCircle, IconPlus, IconTrash } from '@tabler/icons-react'

import { ExpandTextDialog } from '@/atoms'
import type { InputParam, NodeData } from '@/core/types'

import { CodeInput } from './CodeInput'
import { useStableKeys } from './useStableKeys'

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

    const entries = useMemo(
        () => (Array.isArray(data.inputValues?.[inputParam.name]) ? (data.inputValues[inputParam.name] as StructuredOutputEntry[]) : []),
        [data.inputValues, inputParam.name]
    )

    const { keys: effectiveKeys, removeKey } = useStableKeys(entries.length, 'output')

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
            removeKey(indexToDelete)
            onDataChange?.({ inputParam, newValue: entries.filter((_, i) => i !== indexToDelete) })
        },
        [entries, inputParam, onDataChange, removeKey]
    )

    const isDeleteVisible = !inputParam.minItems || entries.length > inputParam.minItems
    const isAddDisabled = disabled || (!!inputParam.maxItems && entries.length >= inputParam.maxItems)

    // Expand dialog state for JSON Schema field
    const [expandOpen, setExpandOpen] = useState<{ index: number } | null>(null)

    return (
        <>
            {/* Section header */}
            <Box sx={{ p: 2, pb: 0 }}>
                <Typography>{inputParam.label}</Typography>
            </Box>

            {entries.map((entry, index) => (
                <Box
                    key={effectiveKeys[index]}
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
                                <Tooltip title='Enum values. Separated by comma' placement='top'>
                                    <span style={{ display: 'inline-flex', marginLeft: 6, cursor: 'pointer' }}>
                                        <IconInfoCircle size={16} style={{ opacity: 0.6 }} />
                                    </span>
                                </Tooltip>
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
                                <Tooltip title='JSON schema for the structured output' placement='top'>
                                    <span style={{ display: 'inline-flex', marginLeft: 6, cursor: 'pointer' }}>
                                        <IconInfoCircle size={16} style={{ opacity: 0.6 }} />
                                    </span>
                                </Tooltip>
                                <div style={{ flexGrow: 1 }} />
                                <IconButton
                                    size='small'
                                    sx={{ height: 25, width: 25 }}
                                    title='Expand'
                                    color='primary'
                                    disabled={disabled}
                                    onClick={() => setExpandOpen({ index })}
                                >
                                    <IconArrowsMaximize />
                                </IconButton>
                            </div>
                            <CodeInput
                                value={entry.jsonSchema ?? ''}
                                onChange={(val) => handleFieldChange(index, 'jsonSchema', val)}
                                language='json'
                                disabled={disabled}
                                height='200px'
                            />
                        </Box>
                    )}

                    {/* Description field */}
                    <Box sx={{ p: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <Typography>
                                Description
                                <span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
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

            {/* Expand dialog for JSON Schema */}
            {expandOpen && (
                <ExpandTextDialog
                    open
                    value={entries[expandOpen.index]?.jsonSchema ?? ''}
                    title='JSON Schema'
                    placeholder='{ "key": { "type": "string", "description": "..." } }'
                    disabled={disabled}
                    inputType='code'
                    language='json'
                    onConfirm={(val) => {
                        handleFieldChange(expandOpen.index, 'jsonSchema', val)
                        setExpandOpen(null)
                    }}
                    onCancel={() => setExpandOpen(null)}
                />
            )}
        </>
    )
}
