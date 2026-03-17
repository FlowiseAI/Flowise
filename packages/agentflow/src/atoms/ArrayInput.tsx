import { type ComponentType, useCallback, useEffect, useMemo, useRef } from 'react'

import { Box, Button, Chip, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconPlus, IconTrash } from '@tabler/icons-react'

import type { InputParam, NodeData } from '@/core/types'

import { type AsyncInputProps, type ConfigInputComponentProps, NodeInputHandler } from './NodeInputHandler'

export interface ArrayInputProps {
    inputParam: InputParam
    data: NodeData
    disabled?: boolean
    onDataChange?: (params: { inputParam: InputParam; newValue: unknown }) => void
    itemParameters?: InputParam[][]
    AsyncInputComponent?: ComponentType<AsyncInputProps>
    ConfigInputComponent?: ComponentType<ConfigInputComponentProps>
    onConfigChange?: (
        configKey: string,
        configValues: Record<string, unknown>,
        arrayContext?: { parentParamName: string; arrayIndex: number }
    ) => void
}

export function ArrayInput({
    inputParam,
    data,
    disabled = false,
    onDataChange,
    itemParameters: itemParametersProp,
    AsyncInputComponent,
    ConfigInputComponent,
    onConfigChange
}: ArrayInputProps) {
    const theme = useTheme()

    // Derive array items directly from props (single source of truth)
    // Memoized to prevent unnecessary re-renders of child hooks
    const arrayItems = useMemo(
        () => (Array.isArray(data.inputValues?.[inputParam.name]) ? (data.inputValues[inputParam.name] as Record<string, unknown>[]) : []),
        [data.inputValues, inputParam.name]
    )

    // Stable keys for array items — avoids using index as React key
    const idCounterRef = useRef(0)
    const itemKeysRef = useRef<string[]>([])

    // Grow keys array when new items appear (e.g. on mount or external data changes)
    useEffect(() => {
        while (itemKeysRef.current.length < arrayItems.length) {
            itemKeysRef.current.push(`item-${idCounterRef.current++}`)
        }
    }, [arrayItems.length])

    // Use pre-computed itemParameters
    // Falls back to raw field definitions for nested arrays without show/hide conditions.
    const itemParameters = useMemo<InputParam[][]>(
        () => itemParametersProp ?? arrayItems.map(() => inputParam.array || []),
        [itemParametersProp, arrayItems, inputParam.array]
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
        // Initialize new item with type-appropriate default values
        const newItem: Record<string, unknown> = {}

        if (inputParam.array) {
            for (const field of inputParam.array) {
                if (field.default !== undefined) {
                    newItem[field.name] = field.default
                } else {
                    switch (field.type) {
                        case 'number':
                            newItem[field.name] = 0
                            break
                        case 'boolean':
                            newItem[field.name] = false
                            break
                        case 'array':
                            newItem[field.name] = []
                            break
                        default:
                            newItem[field.name] = ''
                    }
                }
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
            itemKeysRef.current.splice(indexToDelete, 1)

            // Notify parent of change (parent will update props, causing re-render)
            onDataChange?.({ inputParam, newValue: updatedArrayItems })
        },
        [arrayItems, inputParam, onDataChange]
    )

    // Pre-compute stable per-item onDataChange handlers to avoid new closures on every render
    const itemHandlers = useMemo(
        () =>
            arrayItems.map((_, index) => ({ inputParam: changedParam, newValue }: { inputParam: InputParam; newValue: unknown }) => {
                handleItemInputChange(index, changedParam, newValue)
            }),
        [arrayItems, handleItemInputChange]
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
                        key={itemKeysRef.current[index]}
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
                            .map((param, _) => (
                                <NodeInputHandler
                                    key={param.name}
                                    inputParam={param}
                                    data={itemData}
                                    disabled={disabled}
                                    isAdditionalParams={true}
                                    disablePadding={false}
                                    onDataChange={itemHandlers[index]}
                                    AsyncInputComponent={AsyncInputComponent}
                                    ConfigInputComponent={ConfigInputComponent}
                                    onConfigChange={onConfigChange}
                                    arrayIndex={index}
                                    parentArrayParam={inputParam}
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
