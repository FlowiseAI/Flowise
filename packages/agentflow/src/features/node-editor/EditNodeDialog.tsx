import { memo, useEffect, useRef, useState } from 'react'
import { useUpdateNodeInternals } from 'reactflow'

import { Avatar, Box, ButtonBase, Dialog, DialogContent, Stack, TextField, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconCheck, IconInfoCircle, IconPencil, IconX } from '@tabler/icons-react'

import { NodeInputHandler } from '@/atoms'
import type { InputParam, NodeData } from '@/core/types'
import { useAgentflowContext, useConfigContext } from '@/infrastructure/store'

export interface EditNodeDialogProps {
    show: boolean
    dialogProps: {
        inputParams?: InputParam[]
        data?: NodeData
        disabled?: boolean
    }
    onCancel: () => void
}

// TODO: Integrate with canvas node click/double-click to open this dialog for editing node properties
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

    const onNodeLabelChange = () => {
        if (!data || !nodeNameRef.current) return

        const newLabel = nodeNameRef.current.value
        updateNodeData(data.id, { label: newLabel })
        setData({ ...data, label: newLabel })
        updateNodeInternals(data.id)
    }

    const onCustomDataChange = ({ inputParam, newValue }: { inputParam: InputParam; newValue: unknown }) => {
        if (!data) return

        const updatedInputValues = {
            ...data.inputValues,
            [inputParam.name]: newValue
        }

        updateNodeData(data.id, { inputValues: updatedInputValues })
        setData({ ...data, inputValues: updatedInputValues })
    }

    useEffect(() => {
        if (dialogProps.inputParams) {
            setInputParams(dialogProps.inputParams)
        }
        if (dialogProps.data) {
            setData(dialogProps.data)
            if (dialogProps.data.label) setNodeName(dialogProps.data.label)
        }
    }, [dialogProps])

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
                        .map((inputParam, index) => (
                            <NodeInputHandler
                                disabled={dialogProps.disabled}
                                key={index}
                                inputParam={inputParam}
                                data={data}
                                isAdditionalParams={true}
                                onDataChange={onCustomDataChange}
                            />
                        ))}
            </DialogContent>
        </Dialog>
    )
}

export const EditNodeDialog = memo(EditNodeDialogComponent)
export default EditNodeDialog
