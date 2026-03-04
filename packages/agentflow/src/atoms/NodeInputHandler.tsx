import { useCallback, useEffect, useRef, useState } from 'react'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'

import { Box, FormControlLabel, IconButton, MenuItem, Select, Switch, TextField, Tooltip, TooltipProps, Typography } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import { tooltipClasses } from '@mui/material/Tooltip'
import { IconArrowsMaximize, IconVariable } from '@tabler/icons-react'

import type { InputAnchor, InputParam, NodeData } from '@/core/types'

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
}

/**
 * Simplified input handler for agentflow nodes
 * Handles basic input types: string, number, password, boolean, options
 */
export function NodeInputHandler({
    inputAnchor,
    inputParam,
    data,
    disabled = false,
    isAdditionalParams = false,
    disablePadding = false,
    onDataChange
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
