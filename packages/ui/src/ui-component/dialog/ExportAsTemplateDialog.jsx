import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'
import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

// material-ui
import { Box, Typography } from '@mui/material'

// components
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

// store
import {
    closeSnackbar as closeSnackbarAction,
    enqueueSnackbar as enqueueSnackbarAction,
    HIDE_CANVAS_DIALOG,
    SHOW_CANVAS_DIALOG
} from '@/store/actions'
import useNotifier from '@/utils/useNotifier'
import Chip from '@mui/material/Chip'
import { IconX } from '@tabler/icons-react'

// API
import marketplacesApi from '@/api/marketplaces'
import useApi from '@/hooks/useApi'

// Project imports

const ExportAsTemplateDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()
    const [name, setName] = useState('')
    const [flowType, setFlowType] = useState('')
    const [description, setDescription] = useState('')
    const [badge, setBadge] = useState('')
    const [usecases, setUsecases] = useState([])
    const [usecaseInput, setUsecaseInput] = useState('')

    const saveCustomTemplateApi = useApi(marketplacesApi.saveAsCustomTemplate)

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    useNotifier()

    useEffect(() => {
        if (dialogProps.chatflow) {
            setName(dialogProps.chatflow.name)
            setFlowType(dialogProps.chatflow.type === 'MULTIAGENT' ? 'Agentflow' : 'Chatflow')
        }

        if (dialogProps.tool) {
            setName(dialogProps.tool.name)
            setDescription(dialogProps.tool.description)
            setFlowType('Tool')
        }

        return () => {
            setName('')
            setDescription('')
            setBadge('')
            setUsecases([])
            setFlowType('')
            setUsecaseInput('')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const handleUsecaseInputChange = (event) => {
        setUsecaseInput(event.target.value)
    }

    const handleUsecaseInputKeyDown = (event) => {
        if (event.key === 'Enter' && usecaseInput.trim()) {
            event.preventDefault()
            if (!usecases.includes(usecaseInput)) {
                setUsecases([...usecases, usecaseInput])
                setUsecaseInput('')
            }
        }
    }

    const handleUsecaseDelete = (toDelete) => {
        setUsecases(usecases.filter((category) => category !== toDelete))
    }

    const onConfirm = () => {
        if (name.trim() === '') {
            enqueueSnackbar({
                message: 'Template Name is mandatory!',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            return
        }

        const template = {
            name,
            description,
            badge: badge ? badge.toUpperCase() : undefined,
            usecases,
            type: flowType
        }
        if (dialogProps.chatflow) {
            template.chatflowId = dialogProps.chatflow.id
        }
        if (dialogProps.tool) {
            template.tool = {
                iconSrc: dialogProps.tool.iconSrc,
                schema: dialogProps.tool.schema,
                func: dialogProps.tool.func
            }
        }
        saveCustomTemplateApi.request(template)
    }

    useEffect(() => {
        if (saveCustomTemplateApi.data) {
            enqueueSnackbar({
                message: 'Saved as template successfully!',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'success',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveCustomTemplateApi.data])

    useEffect(() => {
        if (saveCustomTemplateApi.error) {
            enqueueSnackbar({
                message: 'Failed to save as template!',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveCustomTemplateApi.error])

    const component = show ? (
        <Dialog onClose={onCancel} open={show}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dialogProps.title || 'Export As Template'}</DialogTitle>
                </DialogHeader>
                <Box sx={{ pb: 0.5 }}>
                    <Typography sx={{ mb: 1 }}>
                        Name<span style={{ color: 'red' }}>&nbsp;*</span>
                    </Typography>
                    <Input
                        id='name'
                        value={name}
                        name='name'
                        size='sm'
                        onChange={(e) => {
                            setName(e.target.value)
                        }}
                    />
                </Box>
                <Box sx={{ pb: 0.5 }}>
                    <Typography sx={{ mb: 1 }}>Description</Typography>
                    <Input
                        id='description'
                        multiline={true}
                        minRows={3}
                        value={description}
                        name='description'
                        size='sm'
                        onChange={(e) => {
                            setDescription(e.target.value)
                        }}
                    />
                </Box>
                <Box sx={{ pb: 0.5 }}>
                    <Typography sx={{ mb: 1 }}>Badge</Typography>
                    <Input
                        id='badge'
                        value={badge}
                        name='badge'
                        size='sm'
                        onChange={(e) => {
                            setBadge(e.target.value)
                        }}
                    />
                </Box>
                <Box sx={{ pb: 0.5 }}>
                    <Typography sx={{ mb: 1 }}>Usecases</Typography>
                    {usecases.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                            {usecases.map((uc, index) => (
                                <Chip
                                    key={index}
                                    label={uc}
                                    onDelete={() => handleUsecaseDelete(uc)}
                                    style={{ marginRight: 5, marginBottom: 5 }}
                                />
                            ))}
                        </div>
                    )}
                    <Input value={usecaseInput} onChange={handleUsecaseInputChange} onKeyDown={handleUsecaseInputKeyDown} size='sm' />
                    <Typography variant='body2' sx={{ fontStyle: 'italic', mt: 1 }} color='text.secondary'>
                        Type a usecase and press enter to add it to the list. You can add as many items as you want.
                    </Typography>
                </Box>
                <DialogFooter>
                    <Button onClick={onCancel} size='sm' variant='ghost'>
                        {dialogProps.cancelButtonName || 'Cancel'}
                    </Button>
                    <Button disabled={dialogProps.disabled} onClick={onConfirm} size='sm'>
                        {dialogProps.confirmButtonName || 'Save Template'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ExportAsTemplateDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default ExportAsTemplateDialog
