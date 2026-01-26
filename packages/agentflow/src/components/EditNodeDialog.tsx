import React, { useState, useEffect, useRef, useContext } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useUpdateNodeInternals } from 'reactflow'
import { Stack, Box, Typography, TextField, Dialog, DialogContent, ButtonBase, Avatar, Button, DialogActions } from '@mui/material'
import { IconPencil, IconX, IconCheck } from '@tabler/icons-react'
import { useTheme } from '@mui/material/styles'
import { flowContext } from '../AgentflowProvider'
import { SHOW_CANVAS_DIALOG, HIDE_CANVAS_DIALOG, RootState } from '../store'

interface EditNodeDialogProps {
    show: boolean
    dialogProps: {
        data?: any
        inputParams?: any[]
    }
    onCancel: () => void
}

const EditNodeDialog: React.FC<EditNodeDialogProps> = ({ show, dialogProps, onCancel }) => {
    const dispatch = useDispatch()
    const theme = useTheme()
    const customization = useSelector((state: RootState) => state.customization)
    const nodeNameRef = useRef<HTMLInputElement>(null)
    const { reactFlowInstance } = useContext(flowContext)
    const updateNodeInternals = useUpdateNodeInternals()

    const [inputParams, setInputParams] = useState<any[]>([])
    const [data, setData] = useState<any>({})
    const [isEditingNodeName, setEditingNodeName] = useState(false)
    const [nodeName, setNodeName] = useState('')

    const onNodeLabelChange = () => {
        if (!nodeNameRef.current) return

        reactFlowInstance.setNodes((nds: any[]) =>
            nds.map((node) => {
                if (node.id === data.id) {
                    node.data = {
                        ...node.data,
                        label: nodeNameRef.current!.value
                    }
                    setData(node.data)
                    setNodeName(nodeNameRef.current!.value)
                }
                return node
            })
        )
        updateNodeInternals(data.id)
        setEditingNodeName(false)
    }

    useEffect(() => {
        if (dialogProps.inputParams) {
            setInputParams(dialogProps.inputParams)
        }
        if (dialogProps.data) {
            setData(dialogProps.data)
            if (dialogProps.data.label) setNodeName(dialogProps.data.label)
        }

        return () => {
            setInputParams([])
            setData({})
        }
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch(SHOW_CANVAS_DIALOG())
        else dispatch(HIDE_CANVAS_DIALOG())
        return () => {
            dispatch(HIDE_CANVAS_DIALOG())
        }
    }, [show, dispatch])

    if (!show) return null

    return (
        <Dialog onClose={onCancel} open={show} fullWidth maxWidth='sm'>
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
                                                width: 32,
                                                height: 32,
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
                                            <IconPencil stroke={1.5} size={16} />
                                        </Avatar>
                                    </ButtonBase>
                                )}
                            </Stack>
                        ) : (
                            <Stack flexDirection='row' sx={{ mb: 2 }}>
                                <TextField size='small' fullWidth inputRef={nodeNameRef} defaultValue={nodeName} sx={{ ml: 2 }} autoFocus />
                                <ButtonBase title='Save Name' sx={{ borderRadius: '50%' }}>
                                    <Avatar
                                        variant='rounded'
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            ml: 1,
                                            background: theme.palette.success.light,
                                            color: theme.palette.success.dark,
                                            '&:hover': {
                                                background: theme.palette.success.dark,
                                                color: 'white'
                                            }
                                        }}
                                        onClick={onNodeLabelChange}
                                    >
                                        <IconCheck stroke={1.5} size={16} />
                                    </Avatar>
                                </ButtonBase>
                                <ButtonBase title='Cancel' sx={{ borderRadius: '50%' }}>
                                    <Avatar
                                        variant='rounded'
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            ml: 1,
                                            background: theme.palette.error.light,
                                            color: theme.palette.error.dark,
                                            '&:hover': {
                                                background: theme.palette.error.dark,
                                                color: 'white'
                                            }
                                        }}
                                        onClick={() => setEditingNodeName(false)}
                                    >
                                        <IconX stroke={1.5} size={16} />
                                    </Avatar>
                                </ButtonBase>
                            </Stack>
                        )}

                        <Box sx={{ mt: 2 }}>
                            <Typography variant='body2' color='text.secondary'>
                                {data.description || 'No description available'}
                            </Typography>
                        </Box>

                        {/* Simplified parameter display - full implementation would need NodeInputHandler */}
                        {inputParams.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant='subtitle2' sx={{ mb: 1 }}>
                                    Parameters:
                                </Typography>
                                {inputParams.map((param: any, index: number) => (
                                    <Box key={index} sx={{ mb: 2 }}>
                                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
                                            {param.label || param.name}
                                        </Typography>
                                        <TextField
                                            size='small'
                                            fullWidth
                                            multiline={param.type === 'string' || param.type === 'code'}
                                            minRows={param.type === 'code' ? 4 : 1}
                                            value={data.inputs?.[param.name] ?? param.default ?? ''}
                                            onChange={(e) => {
                                                reactFlowInstance.setNodes((nds: any[]) =>
                                                    nds.map((node) => {
                                                        if (node.id === data.id) {
                                                            node.data = {
                                                                ...node.data,
                                                                inputs: {
                                                                    ...node.data.inputs,
                                                                    [param.name]: e.target.value
                                                                }
                                                            }
                                                            setData(node.data)
                                                        }
                                                        return node
                                                    })
                                                )
                                            }}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}

export default EditNodeDialog
