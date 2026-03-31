import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useUpdateNodeInternals } from 'reactflow'

import { Avatar, Box, ButtonBase, Dialog, DialogContent, Stack, TextField, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconCheck, IconInfoCircle, IconPencil, IconX } from '@tabler/icons-react'

import { ConditionBuilder, MessagesInput, NodeInputHandler, ScenariosInput, StructuredOutputBuilder } from '@/atoms'
import type { EditDialogProps, InputParam, NodeData } from '@/core/types'
import { buildDynamicOutputAnchors, evaluateFieldVisibility } from '@/core/utils'
import { useAgentflowContext, useConfigContext } from '@/infrastructure/store'

import { AsyncInput } from './AsyncInput'
import { ConfigInput } from './ConfigInput'
import { useAvailableVariables } from './useAvailableVariables'
import { useDynamicOutputPorts } from './useDynamicOutputPorts'

/** Array param names that should render as MessagesInput instead of generic ArrayInput. */
const MESSAGE_PARAM_NAMES = new Set(['agentMessages', 'llmMessages'])

/** Array param names that should render as StructuredOutputBuilder instead of generic ArrayInput. */
const STRUCTURED_OUTPUT_PARAM_NAMES = new Set(['agentStructuredOutput', 'llmStructuredOutput'])

export interface EditNodeDialogProps {
    show: boolean
    dialogProps: EditDialogProps
    onCancel: () => void
}

function computeArrayItemParameters(params: InputParam[], inputs: Record<string, unknown>): Record<string, InputParam[][]> {
    const result: Record<string, InputParam[][]> = {}
    for (const param of params) {
        if (param.type === 'array' && param.array) {
            const raw = inputs[param.name]
            const items = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []
            result[param.name] = items.map((_, index) => evaluateFieldVisibility(param.array!, inputs, index))
        }
    }
    return result
}

/**
 * Dialog for editing node properties
 */
function EditNodeDialogComponent({ show, dialogProps, onCancel }: EditNodeDialogProps) {
    const theme = useTheme()
    const { isDarkMode } = useConfigContext()
    const { state: _state, updateNodeData } = useAgentflowContext()
    const nodeNameRef = useRef<HTMLInputElement>(null)
    const updateNodeInternals = useUpdateNodeInternals()

    const [inputParams, setInputParams] = useState<InputParam[]>([])
    const [data, setData] = useState<NodeData | null>(null)
    const [isEditingNodeName, setEditingNodeName] = useState(false)
    const [nodeName, setNodeName] = useState('')
    const [arrayItemParameters, setArrayItemParameters] = useState<Record<string, InputParam[][]>>({})

    const isConditionNode = data?.name === 'conditionAgentflow'
    const isConditionAgentNode = data?.name === 'conditionAgentAgentflow'
    const hasDynamicPorts = isConditionNode || isConditionAgentNode
    // conditionAgentflow has an Else port; conditionAgentAgentflow does not
    const includeElse = !isConditionAgentNode
    const { cleanupOrphanedEdges } = useDynamicOutputPorts(data?.id ?? '', hasDynamicPorts, includeElse)
    const variableItems = useAvailableVariables(data?.id ?? '')

    // Ref to read current data
    const dataRef = useRef(data)
    dataRef.current = data

    const onNodeLabelChange = () => {
        if (!data || !nodeNameRef.current) return

        const newLabel = nodeNameRef.current.value
        updateNodeData(data.id, { label: newLabel })
        setData({ ...data, label: newLabel })
        updateNodeInternals(data.id)
    }

    const onConfigChange = useCallback(
        (configKey: string, configValues: Record<string, unknown>, arrayContext?: { parentParamName: string; arrayIndex: number }) => {
            const current = dataRef.current
            if (!current) return

            let updatedInputValues: Record<string, unknown>

            if (arrayContext) {
                // Array-based config: write into the nested array item
                const currentArray = [...((current.inputs?.[arrayContext.parentParamName] as Record<string, unknown>[]) ?? [])]
                const updatedItem = { ...(currentArray[arrayContext.arrayIndex] ?? {}), [configKey]: configValues }
                currentArray[arrayContext.arrayIndex] = updatedItem
                updatedInputValues = { ...current.inputs, [arrayContext.parentParamName]: currentArray }
            } else {
                // Top-level config
                updatedInputValues = { ...current.inputs, [configKey]: configValues }
            }

            updateNodeData(current.id, { inputs: updatedInputValues })
            setData({ ...current, inputs: updatedInputValues })
        },
        [updateNodeData]
    )

    const onCustomDataChange = ({ inputParam, newValue }: { inputParam: InputParam; newValue: unknown }) => {
        if (!data) return

        const updatedInputValues = {
            ...data.inputs,
            [inputParam.name]: newValue
        }

        const updatedParams = evaluateFieldVisibility(inputParams, updatedInputValues)
        setInputParams(updatedParams)
        setArrayItemParameters(computeArrayItemParameters(inputParams, updatedInputValues))

        // When conditions/scenarios array changes, merge inputs, outputAnchors,
        // and cleaned edges into a single updateNodeData call so that onFlowChange
        // fires once with the complete updated state.
        if (isConditionNode && inputParam.name === 'conditions' && Array.isArray(newValue)) {
            const outputAnchors = buildDynamicOutputAnchors(data.id, newValue.length, 'Condition', true)
            const cleanedEdges = cleanupOrphanedEdges(newValue.length)
            updateNodeData(data.id, { inputs: updatedInputValues, outputAnchors }, cleanedEdges)
            setData({ ...data, inputs: updatedInputValues, outputAnchors })
            return
        }

        if (isConditionAgentNode && inputParam.name === 'conditionAgentScenarios' && Array.isArray(newValue)) {
            // ConditionAgent outputs match scenario count exactly (no separate Else port)
            const outputAnchors = buildDynamicOutputAnchors(data.id, newValue.length, 'Scenario', false)
            const cleanedEdges = cleanupOrphanedEdges(newValue.length)
            updateNodeData(data.id, { inputs: updatedInputValues, outputAnchors }, cleanedEdges)
            setData({ ...data, inputs: updatedInputValues, outputAnchors })
            return
        }

        updateNodeData(data.id, { inputs: updatedInputValues })
        setData({ ...data, inputs: updatedInputValues })
    }

    useEffect(() => {
        if (dialogProps.inputParams) {
            const initialValues = dialogProps.data?.inputs || {}
            const evaluatedParams = evaluateFieldVisibility(dialogProps.inputParams, initialValues)
            setInputParams(evaluatedParams)
            setArrayItemParameters(computeArrayItemParameters(dialogProps.inputParams, initialValues))
        }
        if (dialogProps.data) {
            setData(dialogProps.data)
            if (dialogProps.data.label) setNodeName(dialogProps.data.label)
        }
    }, [dialogProps])

    // Reset state when dialog closes so the next node opens with clean state
    useEffect(() => {
        if (!show) {
            setData(null)
            setInputParams([])
            setArrayItemParameters({})
            setNodeName('')
            setEditingNodeName(false)
        }
    }, [show])

    if (!show) return null

    return (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='edit-node-dialog-title'
            aria-describedby='edit-node-dialog-description'
        >
            <DialogContent>
                {data && data.name && (
                    <Box sx={{ width: '100%' }}>
                        {!isEditingNodeName ? (
                            <Stack flexDirection='row' sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Typography
                                    sx={{
                                        ml: 2,
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap'
                                    }}
                                    variant='h4'
                                >
                                    {nodeName}
                                </Typography>

                                {data?.id && (
                                    <ButtonBase title='Edit Name' sx={{ borderRadius: '50%' }}>
                                        <Avatar
                                            variant='rounded'
                                            sx={{
                                                width: 30,
                                                height: 30,
                                                transition: 'all .2s ease-in-out',
                                                ml: 1,
                                                background: theme.palette.secondary.light,
                                                color: theme.palette.secondary.dark,
                                                '&:hover': {
                                                    background: theme.palette.secondary.dark,
                                                    color: theme.palette.secondary.light
                                                }
                                            }}
                                            onClick={() => setEditingNodeName(true)}
                                        >
                                            <IconPencil stroke={1.5} size='1rem' />
                                        </Avatar>
                                    </ButtonBase>
                                )}
                            </Stack>
                        ) : (
                            <Stack flexDirection='row' sx={{ width: '100%' }}>
                                <TextField
                                    size='small'
                                    sx={{
                                        width: '100%',
                                        ml: 2
                                    }}
                                    inputRef={nodeNameRef}
                                    defaultValue={nodeName}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && nodeNameRef.current) {
                                            setNodeName(nodeNameRef.current.value)
                                            onNodeLabelChange()
                                            setEditingNodeName(false)
                                        } else if (e.key === 'Escape') {
                                            setEditingNodeName(false)
                                        }
                                    }}
                                />
                                <ButtonBase title='Save Name' sx={{ borderRadius: '50%' }}>
                                    <Avatar
                                        variant='rounded'
                                        sx={{
                                            width: 30,
                                            height: 30,
                                            transition: 'all .2s ease-in-out',
                                            background: theme.palette.success.light,
                                            color: theme.palette.success.dark,
                                            ml: 1,
                                            '&:hover': {
                                                background: theme.palette.success.dark,
                                                color: theme.palette.success.light
                                            }
                                        }}
                                        onClick={() => {
                                            if (nodeNameRef.current) {
                                                setNodeName(nodeNameRef.current.value)
                                                onNodeLabelChange()
                                                setEditingNodeName(false)
                                            }
                                        }}
                                    >
                                        <IconCheck stroke={1.5} size='1rem' />
                                    </Avatar>
                                </ButtonBase>
                                <ButtonBase title='Cancel' sx={{ borderRadius: '50%' }}>
                                    <Avatar
                                        variant='rounded'
                                        sx={{
                                            width: 30,
                                            height: 30,
                                            transition: 'all .2s ease-in-out',
                                            background: theme.palette.error.light,
                                            color: theme.palette.error.dark,
                                            ml: 1,
                                            '&:hover': {
                                                background: theme.palette.error.dark,
                                                color: theme.palette.error.light
                                            }
                                        }}
                                        onClick={() => setEditingNodeName(false)}
                                    >
                                        <IconX stroke={1.5} size='1rem' />
                                    </Avatar>
                                </ButtonBase>
                            </Stack>
                        )}
                    </Box>
                )}

                {data?.hint && (
                    <Stack
                        direction='row'
                        alignItems='center'
                        sx={{
                            ml: 2,
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                            borderRadius: '8px',
                            mr: 2,
                            px: 1.5,
                            py: 1,
                            mt: 1,
                            mb: 1,
                            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`
                        }}
                    >
                        <IconInfoCircle size='1rem' stroke={1.5} color={theme.palette.info.main} style={{ marginRight: '6px' }} />
                        <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{
                                fontStyle: 'italic',
                                lineHeight: 1.2
                            }}
                        >
                            {data.hint}
                        </Typography>
                    </Stack>
                )}

                {data &&
                    inputParams
                        .filter((inputParam) => inputParam.display !== false)
                        .map((inputParam, index) => {
                            // Render ConditionBuilder for condition node's conditions array
                            if (isConditionNode && inputParam.type === 'array' && inputParam.name === 'conditions') {
                                return (
                                    <ConditionBuilder
                                        key={index}
                                        inputParam={inputParam}
                                        data={data}
                                        disabled={dialogProps.disabled}
                                        onDataChange={onCustomDataChange}
                                        itemParameters={arrayItemParameters[inputParam.name]}
                                    />
                                )
                            }

                            // Render ScenariosInput for condition agent's scenarios array
                            if (isConditionAgentNode && inputParam.type === 'array' && inputParam.name === 'conditionAgentScenarios') {
                                return (
                                    <ScenariosInput
                                        key={index}
                                        inputParam={inputParam}
                                        data={data}
                                        disabled={dialogProps.disabled}
                                        onDataChange={onCustomDataChange}
                                    />
                                )
                            }

                            // Render MessagesInput for Agent/LLM message arrays
                            if (inputParam.type === 'array' && MESSAGE_PARAM_NAMES.has(inputParam.name)) {
                                return (
                                    <MessagesInput
                                        key={index}
                                        inputParam={inputParam}
                                        data={data}
                                        disabled={dialogProps.disabled}
                                        onDataChange={onCustomDataChange}
                                    />
                                )
                            }

                            // Render StructuredOutputBuilder for Agent/LLM structured output arrays
                            if (inputParam.type === 'array' && STRUCTURED_OUTPUT_PARAM_NAMES.has(inputParam.name)) {
                                return (
                                    <StructuredOutputBuilder
                                        key={index}
                                        inputParam={inputParam}
                                        data={data}
                                        disabled={dialogProps.disabled}
                                        onDataChange={onCustomDataChange}
                                    />
                                )
                            }

                            return (
                                <NodeInputHandler
                                    disabled={dialogProps.disabled}
                                    key={index}
                                    inputParam={inputParam}
                                    data={data}
                                    isAdditionalParams={true}
                                    onDataChange={onCustomDataChange}
                                    itemParameters={inputParam.type === 'array' ? arrayItemParameters[inputParam.name] : undefined}
                                    AsyncInputComponent={AsyncInput}
                                    ConfigInputComponent={ConfigInput}
                                    onConfigChange={onConfigChange}
                                    variableItems={inputParam.acceptVariable ? variableItems : undefined}
                                />
                            )
                        })}
            </DialogContent>
        </Dialog>
    )
}

export const EditNodeDialog = memo(EditNodeDialogComponent)
export default EditNodeDialog
