import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'

import {
    Box,
    CircularProgress,
    FormControlLabel,
    IconButton,
    MenuItem,
    Select,
    Switch,
    TextField,
    Tooltip,
    TooltipProps,
    Typography
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import { styled, useTheme } from '@mui/material/styles'
import { tooltipClasses } from '@mui/material/Tooltip'
import { IconArrowsMaximize, IconRefresh, IconVariable } from '@tabler/icons-react'

import type { InputAnchor, InputParam, NodeData } from '@/core/types'
import { type OptionItem, useAsyncOptions } from '@/infrastructure/api/hooks'

import ArrayInput from './ArrayInput'

const CustomWidthTooltip = styled(({ className, ...props }: TooltipProps) => <Tooltip {...props} classes={{ popper: className }} />)({
    [`& .${tooltipClasses.tooltip}`]: {
        maxWidth: 500
    }
})

export interface NodeInputHandlerProps {
    inputAnchor?: InputAnchor
    inputParam?: InputParam
    data: NodeData
    disabled?: boolean
    isAdditionalParams?: boolean
    disablePadding?: boolean
    onDataChange?: (params: { inputParam: InputParam; newValue: unknown }) => void
    itemParameters?: InputParam[][]
}

// ─── Async sub-components ─────
interface AsyncInputProps {
    inputParam: InputParam
    value: unknown
    disabled: boolean
    onChange: (newValue: string) => void
}

function AsyncOptionsInput({ inputParam, value, disabled, onChange }: AsyncInputProps) {
    const { options, loading, error, refetch } = useAsyncOptions({
        loadMethod: inputParam.loadMethod,
        credentialNames: inputParam.credentialNames
    })

    if (error) {
        return (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant='caption' color='error' sx={{ flexGrow: 1 }}>
                    {error}
                </Typography>
                <IconButton size='small' onClick={refetch} title='Retry' aria-label='retry'>
                    <IconRefresh size={16} />
                </IconButton>
            </Box>
        )
    }

    const matchedValue = options.find((o) => o.name === value) ?? null

    return (
        <Autocomplete<OptionItem>
            size='small'
            disabled={disabled}
            options={options}
            value={matchedValue}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(o, v) => o.name === v.name}
            onChange={(_e, selection) => onChange(selection?.name ?? '')}
            loading={loading}
            noOptionsText={loading ? 'Loading…' : 'No options available'}
            sx={{ mt: 1 }}
            renderOption={(props, option) => (
                <Box component='li' {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {option.imageSrc && (
                        <Box
                            component='img'
                            src={option.imageSrc}
                            alt={option.label}
                            sx={{ width: 30, height: 30, padding: '1px', borderRadius: '50%', flexShrink: 0 }}
                        />
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant='h5'>{option.label}</Typography>
                        {option.description && <Typography variant='caption'>{option.description}</Typography>}
                    </Box>
                </Box>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                            <>
                                {matchedValue?.imageSrc && (
                                    <Box
                                        component='img'
                                        src={matchedValue.imageSrc}
                                        alt={matchedValue.label}
                                        sx={{ width: 32, height: 32, borderRadius: '50%', mr: 0.5, flexShrink: 0 }}
                                    />
                                )}
                                {params.InputProps.startAdornment}
                            </>
                        ),
                        endAdornment: (
                            <Fragment>
                                {loading ? <CircularProgress color='inherit' size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </Fragment>
                        )
                    }}
                />
            )}
        />
    )
}

function AsyncMultiOptionsInput({ inputParam, value, disabled, onChange }: AsyncInputProps) {
    const { options, loading, error, refetch } = useAsyncOptions({
        loadMethod: inputParam.loadMethod,
        credentialNames: inputParam.credentialNames
    })

    if (error) {
        return (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant='caption' color='error' sx={{ flexGrow: 1 }}>
                    {error}
                </Typography>
                <IconButton size='small' onClick={refetch} title='Retry' aria-label='retry'>
                    <IconRefresh size={16} />
                </IconButton>
            </Box>
        )
    }

    // Stored as JSON-serialized array of names, e.g. '["option1","option2"]'
    let selectedNames: string[] = []
    if (typeof value === 'string' && value.startsWith('[')) {
        try {
            selectedNames = JSON.parse(value)
        } catch {
            selectedNames = []
        }
    } else if (Array.isArray(value)) {
        selectedNames = value as string[]
    }

    const selectedOptions = options.filter((o) => selectedNames.includes(o.name))

    return (
        <Autocomplete<OptionItem, true>
            multiple
            filterSelectedOptions
            size='small'
            disabled={disabled}
            options={options}
            value={selectedOptions}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(o, v) => o.name === v.name}
            onChange={(_e, selection) => {
                const names = selection.map((s) => s.name)
                onChange(names.length > 0 ? JSON.stringify(names) : '')
            }}
            loading={loading}
            noOptionsText={loading ? 'Loading…' : 'No options available'}
            sx={{ mt: 1 }}
            renderOption={(props, option) => (
                <Box component='li' {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {option.imageSrc && (
                        <Box
                            component='img'
                            src={option.imageSrc}
                            alt={option.label}
                            sx={{ width: 30, height: 30, padding: '1px', borderRadius: '50%', flexShrink: 0 }}
                        />
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant='h5'>{option.label}</Typography>
                        {option.description && <Typography variant='caption'>{option.description}</Typography>}
                    </Box>
                </Box>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <Fragment>
                                {loading ? <CircularProgress color='inherit' size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </Fragment>
                        )
                    }}
                />
            )}
        />
    )
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
    itemParameters
}: NodeInputHandlerProps) {
    const theme = useTheme()
    const ref = useRef<HTMLDivElement>(null)
    const updateNodeInternals = useUpdateNodeInternals()

    const [position, setPosition] = useState(0)

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

    const renderInput = () => {
        if (!inputParam) return null

        const value = data.inputValues?.[inputParam.name] ?? inputParam.default ?? ''

        switch (inputParam.type) {
            case 'string':
            case 'password':
            case 'number':
                return (
                    <TextField
                        fullWidth
                        size='small'
                        disabled={disabled}
                        type={inputParam.type === 'password' ? 'password' : inputParam.type === 'number' ? 'number' : 'text'}
                        multiline={!!inputParam.rows && inputParam.rows > 1}
                        rows={inputParam.rows || undefined}
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

            case 'array':
                return (
                    <ArrayInput
                        inputParam={inputParam}
                        data={data}
                        disabled={disabled}
                        onDataChange={onDataChange}
                        itemParameters={itemParameters}
                    />
                )

            case 'asyncOptions':
                // Single-select async dropdown. Value stored as option.name string.

                return <AsyncOptionsInput inputParam={inputParam} value={value} disabled={disabled} onChange={(v) => handleDataChange(v)} />

            case 'asyncMultiOptions':
                // Multi-select async dropdown. Value stored as JSON-serialized string array.
                return (
                    <AsyncMultiOptionsInput
                        inputParam={inputParam}
                        value={value}
                        disabled={disabled}
                        onChange={(v) => handleDataChange(v)}
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
                            </Typography>
                            <div style={{ flexGrow: 1 }} />
                            {inputParam?.acceptVariable && inputParam?.type === 'string' && (
                                <Tooltip title='Type {{ to select variables'>
                                    <IconVariable size={20} style={{ color: 'teal' }} />
                                </Tooltip>
                            )}
                            {((inputParam?.type === 'string' && inputParam?.rows) || inputParam?.type === 'code') && (
                                <IconButton
                                    size='small'
                                    sx={{
                                        height: 25,
                                        width: 25,
                                        ml: 0.5
                                    }}
                                    title='Expand'
                                    color='primary'
                                >
                                    <IconArrowsMaximize />
                                </IconButton>
                            )}
                        </div>
                        {renderInput()}
                    </Box>
                </>
            )}
        </div>
    )
}

export default NodeInputHandler
