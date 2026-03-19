import { ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'

import { Box, FormControlLabel, IconButton, MenuItem, Select, Switch, TextField, Tooltip, TooltipProps, Typography } from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import { styled, useTheme } from '@mui/material/styles'
import { tooltipClasses } from '@mui/material/Tooltip'
import { IconArrowsMaximize, IconInfoCircle, IconVariable } from '@tabler/icons-react'

import type { InputAnchor, InputParam, NodeData } from '@/core/types'

import ArrayInput from './ArrayInput'
import { ExpandTextDialog } from './ExpandTextDialog'
import { RichTextEditor } from './RichTextEditor.lazy'

const CustomWidthTooltip = styled(({ className, ...props }: TooltipProps) => <Tooltip {...props} classes={{ popper: className }} />)({
    [`& .${tooltipClasses.tooltip}`]: {
        maxWidth: 500
    }
})

/** Props passed to an async input component (asyncOptions / asyncMultiOptions). */
export interface AsyncInputProps {
    inputParam: InputParam
    value: unknown
    disabled: boolean
    onChange: (newValue: string) => void
    nodeName?: string
    inputValues?: Record<string, unknown>
}

/** Props passed to a config input component (loadConfig accordion). */
export interface ConfigInputComponentProps {
    data: NodeData
    inputParam: InputParam
    disabled?: boolean
    arrayIndex?: number | null
    parentArrayParam?: InputParam | null
    onConfigChange: (
        configKey: string,
        configValues: Record<string, unknown>,
        arrayContext?: { parentParamName: string; arrayIndex: number }
    ) => void
    AsyncInputComponent?: ComponentType<AsyncInputProps>
}

export interface NodeInputHandlerProps {
    inputAnchor?: InputAnchor
    inputParam?: InputParam
    data: NodeData
    disabled?: boolean
    isAdditionalParams?: boolean
    disablePadding?: boolean
    onDataChange?: (params: { inputParam: InputParam; newValue: unknown }) => void
    itemParameters?: InputParam[][]
    /** Renders asyncOptions / asyncMultiOptions fields. Lives in features/ to keep atoms free of infrastructure. */
    AsyncInputComponent?: ComponentType<AsyncInputProps>
    /** Renders loadConfig accordion beneath async dropdowns. Injected from features/ to keep atoms infrastructure-free. */
    ConfigInputComponent?: ComponentType<ConfigInputComponentProps>
    /** Callback for config value changes (from ConfigInputComponent). */
    onConfigChange?: (
        configKey: string,
        configValues: Record<string, unknown>,
        arrayContext?: { parentParamName: string; arrayIndex: number }
    ) => void
    /** For array-based configs: index of current array item. */
    arrayIndex?: number | null
    /** For array-based configs: the parent array InputParam definition. */
    parentArrayParam?: InputParam | null
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Simplified input handler for agentflow nodes
 * Handles basic input types: string, number, password, boolean, options, array, single-select, multi-select.
 */
export function NodeInputHandler({
    inputAnchor,
    inputParam,
    data,
    disabled = false,
    isAdditionalParams = false,
    disablePadding = false,
    onDataChange,
    itemParameters,
    AsyncInputComponent,
    ConfigInputComponent,
    onConfigChange,
    arrayIndex = null,
    parentArrayParam = null
}: NodeInputHandlerProps) {
    const theme = useTheme()
    const ref = useRef<HTMLDivElement>(null)
    const updateNodeInternals = useUpdateNodeInternals()

    const [position, setPosition] = useState(0)
    const [expandOpen, setExpandOpen] = useState(false)

    const handleDataChange = useCallback(
        (newValue: unknown) => {
            if (inputParam) {
                onDataChange?.({ inputParam, newValue })
            }
        },
        [inputParam, onDataChange]
    )

    useEffect(() => {
        if (ref.current && ref.current.offsetTop && ref.current.clientHeight) {
            setPosition(ref.current.offsetTop + ref.current.clientHeight / 2)
            updateNodeInternals(data.id)
        }
    }, [data.id, ref, updateNodeInternals])

    useEffect(() => {
        updateNodeInternals(data.id)
    }, [data.id, position, updateNodeInternals])

    const isExpandable = useMemo(
        () => (inputParam?.type === 'string' && !!inputParam?.rows) || inputParam?.type === 'code',
        [inputParam?.type, inputParam?.rows]
    )

    const expandValue = useMemo(() => {
        if (!inputParam) return ''
        const v = data.inputValues?.[inputParam.name] ?? inputParam.default ?? ''
        return typeof v === 'string' ? v : JSON.stringify(v)
    }, [data.inputValues, inputParam])

    const handleExpandConfirm = useCallback(
        (value: string) => {
            handleDataChange(value)
            setExpandOpen(false)
        },
        [handleDataChange]
    )

    const renderInput = () => {
        if (!inputParam) return null

        const value = data.inputValues?.[inputParam.name] ?? inputParam.default ?? ''

        switch (inputParam.type) {
            case 'string':
                if (isExpandable) {
                    return (
                        <RichTextEditor
                            value={typeof value === 'string' ? value : ''}
                            onChange={(html) => handleDataChange(html)}
                            placeholder={inputParam.placeholder}
                            disabled={disabled}
                            rows={inputParam.rows || 4}
                        />
                    )
                }
                return (
                    <TextField
                        fullWidth
                        size='small'
                        disabled={disabled}
                        placeholder={inputParam.placeholder}
                        value={value}
                        onChange={(e) => handleDataChange(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                )
            case 'password':
            case 'number':
                return (
                    <TextField
                        fullWidth
                        size='small'
                        disabled={disabled}
                        type={inputParam.type === 'password' ? 'password' : 'number'}
                        placeholder={inputParam.placeholder}
                        value={value}
                        onChange={(e) => handleDataChange(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                )

            case 'boolean':
                return (
                    <FormControlLabel
                        control={<Switch disabled={disabled} checked={!!value} onChange={(e) => handleDataChange(e.target.checked)} />}
                        label=''
                        sx={{ mt: 1 }}
                    />
                )

            case 'options':
                return (
                    <Select
                        fullWidth
                        size='small'
                        disabled={disabled}
                        value={value || ''}
                        onChange={(e) => handleDataChange(e.target.value)}
                        sx={{ mt: 1 }}
                    >
                        {inputParam.options?.map((option) => (
                            <MenuItem
                                key={typeof option === 'string' ? option : option.name}
                                value={typeof option === 'string' ? option : option.name}
                            >
                                {typeof option === 'string' ? option : option.label}
                            </MenuItem>
                        ))}
                    </Select>
                )

            case 'multiOptions': {
                // Stored as JSON-serialized array of names, e.g. '["option1","option2"]'
                const staticOptions = (inputParam.options ?? []).map((opt) => (typeof opt === 'string' ? { label: opt, name: opt } : opt))

                let selectedNames: string[] = []
                if (typeof value === 'string' && value.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(value)
                        if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
                            selectedNames = parsed
                        }
                    } catch (e) {
                        console.error('Failed to parse multiOptions value:', value, e)
                        selectedNames = []
                    }
                } else if (Array.isArray(value)) {
                    selectedNames = value.filter((item): item is string => typeof item === 'string')
                }

                const selectedOptions = staticOptions.filter((o) => selectedNames.includes(o.name))

                return (
                    <Autocomplete<{ label: string; name: string }, true>
                        multiple
                        filterSelectedOptions
                        size='small'
                        disabled={disabled}
                        options={staticOptions}
                        value={selectedOptions}
                        getOptionLabel={(o) => o.label}
                        isOptionEqualToValue={(o, v) => o.name === v.name}
                        onChange={(_e, selection) => {
                            const names = selection.map((s) => s.name)
                            handleDataChange(names.length > 0 ? JSON.stringify(names) : '')
                        }}
                        sx={{ mt: 1 }}
                        renderInput={(params) => <TextField {...params} />}
                    />
                )
            }

            case 'array':
                return (
                    <ArrayInput
                        inputParam={inputParam}
                        data={data}
                        disabled={disabled}
                        onDataChange={onDataChange}
                        itemParameters={itemParameters}
                        AsyncInputComponent={AsyncInputComponent}
                        ConfigInputComponent={ConfigInputComponent}
                        onConfigChange={onConfigChange}
                    />
                )

            case 'asyncOptions':
            case 'asyncMultiOptions':
                if (!AsyncInputComponent) return null
                return (
                    <>
                        <AsyncInputComponent
                            inputParam={inputParam}
                            value={value}
                            disabled={disabled}
                            onChange={(v) => handleDataChange(v)}
                            nodeName={data.name}
                            inputValues={data.inputValues as Record<string, unknown> | undefined}
                        />
                        {inputParam.loadConfig && ConfigInputComponent && value && onConfigChange && (
                            <ConfigInputComponent
                                data={data}
                                inputParam={inputParam}
                                disabled={disabled}
                                arrayIndex={arrayIndex}
                                parentArrayParam={parentArrayParam}
                                onConfigChange={onConfigChange}
                                AsyncInputComponent={AsyncInputComponent}
                            />
                        )}
                    </>
                )

            case 'credential':
                if (!AsyncInputComponent) return null
                return (
                    <AsyncInputComponent
                        inputParam={inputParam}
                        value={value}
                        disabled={disabled}
                        onChange={(v) => handleDataChange(v)}
                        nodeName={data.name}
                        inputValues={data.inputValues as Record<string, unknown> | undefined}
                    />
                )

            default:
                // For unsupported types, render a basic text field
                return (
                    <TextField
                        fullWidth
                        size='small'
                        disabled={disabled}
                        placeholder={inputParam.placeholder}
                        value={typeof value === 'string' ? value : JSON.stringify(value)}
                        onChange={(e) => handleDataChange(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                )
        }
    }

    return (
        <div ref={ref}>
            {inputAnchor && (
                <>
                    <CustomWidthTooltip placement='left' title={inputAnchor.type}>
                        <Handle
                            type='target'
                            position={Position.Left}
                            key={inputAnchor.id}
                            id={inputAnchor.id}
                            style={{
                                height: 10,
                                width: 10,
                                backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                                top: position
                            }}
                        />
                    </CustomWidthTooltip>
                    <Box sx={{ p: 2 }}>
                        <Typography>
                            {inputAnchor.label}
                            {!inputAnchor.optional && <span style={{ color: 'red' }}>&nbsp;*</span>}
                        </Typography>
                    </Box>
                </>
            )}

            {((inputParam && !inputParam.additionalParams) || isAdditionalParams) && (
                <>
                    {inputParam?.acceptVariable && !isAdditionalParams && (
                        <CustomWidthTooltip placement='left' title={inputParam.type}>
                            <Handle
                                type='target'
                                position={Position.Left}
                                key={inputParam.id}
                                id={inputParam.id}
                                style={{
                                    height: 10,
                                    width: 10,
                                    backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                                    top: position
                                }}
                            />
                        </CustomWidthTooltip>
                    )}
                    <Box sx={{ p: disablePadding ? 0 : 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <Typography>
                                {inputParam?.label}
                                {!inputParam?.optional && <span style={{ color: 'red' }}>&nbsp;*</span>}
                                {inputParam?.description && (
                                    <Tooltip title={inputParam.description} placement='top'>
                                        <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 6, cursor: 'pointer' }}>
                                            <IconInfoCircle size={16} style={{ opacity: 0.6 }} />
                                        </span>
                                    </Tooltip>
                                )}
                            </Typography>
                            <div style={{ flexGrow: 1 }} />
                            {inputParam?.acceptVariable && inputParam?.type === 'string' && (
                                <Tooltip title='Type {{ to select variables'>
                                    <IconVariable size={20} style={{ color: 'teal' }} />
                                </Tooltip>
                            )}
                            {isExpandable && (
                                <IconButton
                                    size='small'
                                    sx={{
                                        height: 25,
                                        width: 25,
                                        ml: 0.5
                                    }}
                                    title='Expand'
                                    color='primary'
                                    disabled={disabled}
                                    onClick={() => setExpandOpen(true)}
                                >
                                    <IconArrowsMaximize />
                                </IconButton>
                            )}
                        </div>
                        {renderInput()}
                    </Box>
                </>
            )}

            {isExpandable && (
                <ExpandTextDialog
                    open={expandOpen}
                    value={expandValue}
                    title={inputParam?.label}
                    placeholder={inputParam?.placeholder}
                    disabled={disabled}
                    inputType={inputParam?.type}
                    onConfirm={handleExpandConfirm}
                    onCancel={() => setExpandOpen(false)}
                />
            )}
        </div>
    )
}

export default NodeInputHandler
