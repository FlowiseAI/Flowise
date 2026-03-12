import { useCallback, useEffect, useMemo, useRef } from 'react'

import { Box, Button, Chip, IconButton, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconPlus, IconTrash } from '@tabler/icons-react'

import type { InputParam, NodeData } from '@/core/types'

import { NodeInputHandler } from './NodeInputHandler'

export interface ConditionBuilderProps {
    inputParam: InputParam
    data: NodeData
    disabled?: boolean
    onDataChange?: (params: { inputParam: InputParam; newValue: unknown }) => void
    itemParameters?: InputParam[][]
}

/**
 * Specialized array input for condition nodes.
 * Renders each condition with a label (Condition 0, Condition 1, ...) and an Else indicator.
 * isEmpty/notEmpty operations hide the Value 2 field via the existing field visibility system.
 */
export function ConditionBuilder({
    inputParam,
    data,
    disabled = false,
    onDataChange,
    itemParameters: itemParametersProp
}: ConditionBuilderProps) {
    const theme = useTheme()
    const idCounterRef = useRef(0)
    const itemKeysRef = useRef<string[]>([])

    const arrayItems = useMemo(
        () => (Array.isArray(data.inputValues?.[inputParam.name]) ? (data.inputValues[inputParam.name] as Record<string, unknown>[]) : []),
        [data.inputValues, inputParam.name]
    )

    // Grow keys array when new items appear (e.g. on mount or external data changes)
    useEffect(() => {
        while (itemKeysRef.current.length < arrayItems.length) {
            itemKeysRef.current.push(`condition-${idCounterRef.current++}`)
        }
    }, [arrayItems.length])

    const itemParameters = useMemo<InputParam[][]>(
        () => itemParametersProp ?? arrayItems.map(() => inputParam.array || []),
        [itemParametersProp, arrayItems, inputParam.array]
    )

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
                    switch (field.type) {
                        case 'number':
                            newItem[field.name] = 0
                            break
                        case 'boolean':
                            newItem[field.name] = false
                            break
                        default:
                            newItem[field.name] = ''
                    }
                }
            }
        }
        onDataChange?.({ inputParam, newValue: [...arrayItems, newItem] })
    }, [arrayItems, inputParam, onDataChange])

    const handleDeleteItem = useCallback(
        (indexToDelete: number) => {
            itemKeysRef.current.splice(indexToDelete, 1)
            onDataChange?.({ inputParam, newValue: arrayItems.filter((_, i) => i !== indexToDelete) })
        },
        [arrayItems, inputParam, onDataChange]
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
        <>
            {arrayItems.map((itemValues, index) => {
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

                        <Chip label={`Condition ${index}`} size='small' sx={{ position: 'absolute', right: 55, top: 16 }} />

                        {itemParameters[index]
                            ?.filter((param) => param.display !== false)
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
                    Executes when no conditions match
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
                Add Condition
            </Button>
        </>
    )
}

export default ConditionBuilder
