import { useCallback, useMemo } from 'react'

import { Box, Button, Chip, IconButton, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconPlus, IconTrash } from '@tabler/icons-react'

import type { InputParam, NodeData } from '@/core/types'

import { NodeInputHandler } from './NodeInputHandler'
import { TooltipWithParser } from './TooltipWithParser'
import { useStableKeys } from './useStableKeys'

export interface ScenariosInputProps {
    inputParam: InputParam
    data: NodeData
    disabled?: boolean
    onDataChange?: (params: { inputParam: InputParam; newValue: unknown }) => void
}

/**
 * Array input for ConditionAgent scenario strings.
 * Each entry creates a dynamic output anchor (e.g., Scenario 0, Scenario 1).
 * The UI also includes a visual indicator for the implicit "Else" case, which executes when no scenarios match.
 * Simpler than ConditionBuilder — each item has a single string field.
 */
export function ScenariosInput({ inputParam, data, disabled = false, onDataChange }: ScenariosInputProps) {
    const theme = useTheme()

    const arrayItems = useMemo(
        () => (Array.isArray(data.inputValues?.[inputParam.name]) ? (data.inputValues[inputParam.name] as Record<string, unknown>[]) : []),
        [data.inputValues, inputParam.name]
    )

    const { keys: effectiveKeys, removeKey } = useStableKeys(arrayItems.length, 'scenario')

    const handleItemInputChange = useCallback(
        (itemIndex: number, changedParam: InputParam, newValue: unknown) => {
            const updatedArrayItems = [...arrayItems]
            const updatedItem = { ...updatedArrayItems[itemIndex] }
            updatedItem[changedParam.name] = newValue
            updatedArrayItems[itemIndex] = updatedItem
            onDataChange?.({ inputParam, newValue: updatedArrayItems })
        },
        [arrayItems, inputParam, onDataChange]
    )

    const handleAddItem = useCallback(() => {
        const newItem: Record<string, unknown> = {}
        if (inputParam.array) {
            for (const field of inputParam.array) {
                if (field.default != null) {
                    newItem[field.name] = field.default
                } else {
                    newItem[field.name] = ''
                }
            }
        }
        onDataChange?.({ inputParam, newValue: [...arrayItems, newItem] })
    }, [arrayItems, inputParam, onDataChange])

    const handleDeleteItem = useCallback(
        (indexToDelete: number) => {
            removeKey(indexToDelete)
            onDataChange?.({ inputParam, newValue: arrayItems.filter((_, i) => i !== indexToDelete) })
        },
        [arrayItems, inputParam, onDataChange, removeKey]
    )

    const itemHandlers = useMemo(
        () =>
            arrayItems.map((_, index) => ({ inputParam: changedParam, newValue }: { inputParam: InputParam; newValue: unknown }) => {
                handleItemInputChange(index, changedParam, newValue)
            }),
        [arrayItems, handleItemInputChange]
    )

    const canDeleteItem = !inputParam.minItems || arrayItems.length > inputParam.minItems

    return (
        <Box sx={{ p: 2 }}>
            <Typography>
                {inputParam.label}
                {!inputParam.optional && <span style={{ color: theme.palette.error.main }}>&nbsp;*</span>}
                {inputParam.description && <TooltipWithParser title={inputParam.description} />}
            </Typography>

            {arrayItems.map((itemValues, index) => {
                const itemData: NodeData = {
                    ...data,
                    inputValues: itemValues
                }

                return (
                    <Box
                        key={effectiveKeys[index]}
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

                        <Chip label={`Scenario ${index}`} size='small' sx={{ position: 'absolute', right: 55, top: 16 }} />

                        {(inputParam.array || [])
                            .filter((param) => param.display !== false)
                            .map((param) => (
                                <NodeInputHandler
                                    key={param.name}
                                    inputParam={param}
                                    data={itemData}
                                    disabled={disabled}
                                    isAdditionalParams={true}
                                    disablePadding={false}
                                    onDataChange={itemHandlers[index]}
                                />
                            ))}
                    </Box>
                )
            })}

            {/* Else indicator */}
            <Box
                sx={{
                    p: 2,
                    mt: 2,
                    mb: 1,
                    border: 1,
                    borderColor: theme.palette.grey[300],
                    borderRadius: 2,
                    backgroundColor: theme.palette.action.hover
                }}
            >
                <Typography variant='body2' color='text.secondary' fontWeight={500}>
                    Else
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                    Executes when no scenarios match
                </Typography>
            </Box>

            <Button
                fullWidth
                size='small'
                variant='outlined'
                disabled={disabled}
                sx={{ borderRadius: '16px', mt: 2 }}
                startIcon={<IconPlus />}
                onClick={handleAddItem}
            >
                Add Scenario
            </Button>
        </Box>
    )
}

export default ScenariosInput
