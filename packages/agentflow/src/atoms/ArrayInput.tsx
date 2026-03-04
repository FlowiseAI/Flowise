import { useCallback, useMemo } from 'react'

import { Box, Button, Chip, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconPlus, IconTrash } from '@tabler/icons-react'

import type { InputParam, NodeData } from '@/core/types'
import { evaluateFieldVisibility } from '@/core/utils/fieldVisibility'

import { NodeInputHandler } from './NodeInputHandler'

export interface ArrayInputProps {
    inputParam: InputParam
    data: NodeData
    disabled?: boolean
    onDataChange?: (params: { inputParam: InputParam; newValue: unknown }) => void
}

/**
 * Array input component for managing lists of structured data
 *
 * @param inputParam - Array field definition with structure
 * @param data - Node data containing inputValues
 * @param onDataChange - Callback invoked when array is modified
 * @param disabled - Whether the input is disabled
 */
export function ArrayInput({ inputParam, data, disabled = false, onDataChange }: ArrayInputProps) {
    const theme = useTheme()

    // Derive array items directly from props (single source of truth)
    // Memoized to prevent unnecessary re-renders of child hooks
    const arrayItems = useMemo(
        () => (Array.isArray(data.inputValues?.[inputParam.name]) ? (data.inputValues[inputParam.name] as Record<string, unknown>[]) : []),
        [data.inputValues, inputParam.name]
    )

    // Derive item parameters for each array item
    const itemParameters = useMemo(
        () => arrayItems.map((itemValues, index) => evaluateFieldVisibility(inputParam.array || [], itemValues, index)),
        [arrayItems, inputParam.array]
    )

    // Handle changes to individual fields within array items
    const handleItemInputChange = useCallback(
        (itemIndex: number, changedParam: InputParam, newValue: unknown) => {
            const updatedArrayItems = [...arrayItems]
            const updatedItem = { ...updatedArrayItems[itemIndex] }

            // Update the specific field
            updatedItem[changedParam.name] = newValue
            updatedArrayItems[itemIndex] = updatedItem

            // Notify parent of change (parent will update props, causing re-render)
            onDataChange?.({ inputParam, newValue: updatedArrayItems })
        },
        [arrayItems, inputParam, onDataChange]
    )

    // Add new array item
    const handleAddItem = useCallback(() => {
        // Initialize new item with default values
        const newItem: Record<string, unknown> = {}

        if (inputParam.array) {
            for (const field of inputParam.array) {
                newItem[field.name] = field.default ?? ''
            }
        }

        const updatedArrayItems = [...arrayItems, newItem]

        // Notify parent of change (parent will update props, causing re-render)
        onDataChange?.({ inputParam, newValue: updatedArrayItems })
    }, [arrayItems, inputParam, onDataChange])

    // Delete array item
    const handleDeleteItem = useCallback(
        (indexToDelete: number) => {
            const updatedArrayItems = arrayItems.filter((_, i) => i !== indexToDelete)

            // Notify parent of change (parent will update props, causing re-render)
            onDataChange?.({ inputParam, newValue: updatedArrayItems })
        },
        [arrayItems, inputParam, onDataChange]
    )

    // Check if item can be deleted based on minItems constraint
    const canDeleteItem = !inputParam.minItems || arrayItems.length > inputParam.minItems

    return (
        <>
            {/* Render each array item */}
            {arrayItems.map((itemValues, index) => {
                // Create item-specific data context for nested NodeInputHandler
                const itemData: NodeData = {
                    ...data,
                    inputValues: itemValues
                }

                return (
                    <Box
                        key={index}
                        sx={{
                            p: 2,
                            mt: 2,
                            mb: 1,
                            border: 1,
                            borderColor: theme.palette.grey[300],
                            borderRadius: 2,
                            position: 'relative'
                        }}
                    >
                        {/* Delete button */}
                        <IconButton
                            title='Delete'
                            onClick={() => handleDeleteItem(index)}
                            disabled={disabled || !canDeleteItem}
                            sx={{
                                position: 'absolute',
                                height: 35,
                                width: 35,
                                right: 10,
                                top: 10,
                                '&:hover': { color: theme.palette.error.main },
                                ...(!canDeleteItem && {
                                    opacity: 0.3,
                                    cursor: 'not-allowed'
                                })
                            }}
                        >
                            <IconTrash />
                        </IconButton>

                        {/* Index chip */}
                        <Chip label={`${index}`} size='small' sx={{ position: 'absolute', right: 55, top: 16 }} />

                        {/* Render input fields for array item */}
                        {itemParameters[index]
                            ?.filter((param) => param.display !== false)
                            .map((param, paramIndex) => (
                                <NodeInputHandler
                                    key={paramIndex}
                                    inputParam={param}
                                    data={itemData}
                                    disabled={disabled}
                                    isAdditionalParams={true}
                                    disablePadding={false}
                                    onDataChange={({ inputParam: changedParam, newValue }) => {
                                        handleItemInputChange(index, changedParam, newValue)
                                    }}
                                />
                            ))}
                    </Box>
                )
            })}

            {/* Add item button */}
            <Button
                fullWidth
                size='small'
                variant='outlined'
                disabled={disabled}
                sx={{ borderRadius: '16px', mt: 2 }}
                startIcon={<IconPlus />}
                onClick={handleAddItem}
            >
                Add {inputParam.label}
            </Button>
        </>
    )
}

export default ArrayInput
