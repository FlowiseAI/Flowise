import { ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'

import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Popover,
    TextField,
    Tooltip,
    TooltipProps,
    Typography
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import { styled, useTheme } from '@mui/material/styles'
import { tooltipClasses } from '@mui/material/Tooltip'
import { IconArrowsMaximize, IconVariable } from '@tabler/icons-react'

import type { InputAnchor, InputParam, NodeData } from '@/core/types'

import ArrayInput from './ArrayInput'
import { CodeInput } from './CodeInput'
import { Dropdown } from './Dropdown'
import { ExpandTextDialog } from './ExpandTextDialog'
import { JsonInput } from './JsonInput'
import { RichTextEditor } from './RichTextEditor.lazy'
import type { VariableItem } from './SelectVariable'
import { SelectVariable } from './SelectVariable'
import { SwitchInput } from './SwitchInput'
import { TooltipWithParser } from './TooltipWithParser'

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
    /** Variable items for the SelectVariable popover (injected from features layer). */
    variableItems?: VariableItem[]
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
    parentArrayParam = null,
    variableItems
}: NodeInputHandlerProps) {
    const theme = useTheme()
    const ref = useRef<HTMLDivElement>(null)
    const updateNodeInternals = useUpdateNodeInternals()

    const [position, setPosition] = useState(0)
    const [expandOpen, setExpandOpen] = useState(false)
    const [variableAnchorEl, setVariableAnchorEl] = useState<HTMLElement | null>(null)
    const [jsonDialogOpen, setJsonDialogOpen] = useState(false)

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

    const handleVariableSelect = useCallback(
        (variableString: string) => {
            if (!inputParam) return
            const current = data.inputValues?.[inputParam.name] ?? inputParam.default ?? ''
            const currentStr = typeof current === 'string' ? current : JSON.stringify(current)
            handleDataChange(currentStr + variableString)
            setVariableAnchorEl(null)
        },
        [inputParam, data.inputValues, handleDataChange]
    )

    const showVariableButton = !!(
        inputParam?.acceptVariable &&
        variableItems &&
        variableItems.length > 0 &&
        ['string', 'password', 'code'].includes(inputParam?.type ?? '')
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
                return <SwitchInput disabled={disabled} value={!!value} onChange={(checked) => handleDataChange(checked)} />

            case 'options': {
                const dropdownOptions = (inputParam.options ?? []).map((opt) => (typeof opt === 'string' ? { label: opt, name: opt } : opt))
                return (
                    <Dropdown
                        disabled={disabled}
                        name={inputParam.name}
                        options={dropdownOptions}
                        onSelect={(newValue) => handleDataChange(newValue)}
                        value={String(value || '')}
                    />
                )
            }

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

            case 'json': {
                const jsonStr = typeof value === 'string' ? value : JSON.stringify(value || {})
                if (inputParam.acceptVariable && variableItems && variableItems.length > 0) {
                    // acceptVariable: show a button that opens a dialog with JsonInput + variable support
                    return (
                        <Button
                            sx={{ borderRadius: 25, width: '100%', mb: 0, mt: 2 }}
                            variant='outlined'
                            disabled={disabled}
                            onClick={() => setJsonDialogOpen(true)}
                        >
                            {inputParam.label}
                        </Button>
                    )
                }
                // No acceptVariable: render inline JSON tree
                return <JsonInput value={jsonStr} onChange={(json) => handleDataChange(json)} disabled={disabled} />
            }

            case 'code':
                return (
                    <>
                        <CodeInput
                            value={typeof value === 'string' ? value : ''}
                            onChange={(code) => handleDataChange(code)}
                            language={inputParam.codeLanguage}
                            disabled={disabled}
                        />
                        {inputParam.codeExample && !disabled && (
                            <Button
                                size='small'
                                variant='text'
                                sx={{ mt: 0.5, textTransform: 'none' }}
                                onClick={() => handleDataChange(inputParam.codeExample)}
                            >
                                See Example
                            </Button>
                        )}
                    </>
                )

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
                            {!inputAnchor.optional && <span style={{ color: theme.palette.error.main }}>&nbsp;*</span>}
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
                                {!inputParam?.optional && <span style={{ color: theme.palette.error.main }}>&nbsp;*</span>}
                                {inputParam?.description && <TooltipWithParser title={inputParam.description} />}
                            </Typography>
                            <div style={{ flexGrow: 1 }} />
                            {showVariableButton && (
                                <Tooltip title='Select variable'>
                                    <IconButton
                                        size='small'
                                        sx={{ height: 25, width: 25 }}
                                        disabled={disabled}
                                        onClick={(e) => setVariableAnchorEl(e.currentTarget)}
                                    >
                                        <IconVariable size={20} style={{ color: theme.palette.info.main }} />
                                    </IconButton>
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
                    language={inputParam?.type === 'code' ? inputParam.codeLanguage : undefined}
                    onConfirm={handleExpandConfirm}
                    onCancel={() => setExpandOpen(false)}
                />
            )}

            {showVariableButton && inputParam?.type !== 'json' && (
                <Popover
                    open={!!variableAnchorEl}
                    anchorEl={variableAnchorEl}
                    onClose={() => setVariableAnchorEl(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{ paper: { sx: { width: 320, maxHeight: 400 } } }}
                >
                    <SelectVariable items={variableItems!} onSelect={handleVariableSelect} />
                </Popover>
            )}

            {inputParam?.type === 'json' && inputParam.acceptVariable && variableItems && variableItems.length > 0 && (
                <Dialog open={jsonDialogOpen} onClose={() => setJsonDialogOpen(false)} fullWidth maxWidth='sm'>
                    <DialogTitle>{inputParam.label}</DialogTitle>
                    <DialogContent>
                        <JsonInput
                            value={expandValue}
                            onChange={(json) => handleDataChange(json)}
                            disabled={disabled}
                            variableItems={variableItems}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}

export default NodeInputHandler
