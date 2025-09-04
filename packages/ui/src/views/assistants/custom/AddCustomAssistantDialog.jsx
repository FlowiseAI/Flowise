import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import {
    HIDE_CANVAS_DIALOG,
    SHOW_CANVAS_DIALOG,
    enqueueSnackbar as enqueueSnackbarAction,
    closeSnackbar as closeSnackbarAction
} from '@/store/actions'
import { v4 as uuidv4 } from 'uuid'

// Material
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, Typography, OutlinedInput } from '@mui/material'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// Icons
import { IconX, IconFiles } from '@tabler/icons-react'

// API
import assistantsApi from '@/api/assistants'

// utils
import useNotifier from '@/utils/useNotifier'

const AddCustomAssistantDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [customAssistantName, setCustomAssistantName] = useState('')
    const [category, setCategory] = useState('')
    const [description, setDescription] = useState('')
    const [isReadyToSave, setIsReadyToSave] = useState(false)

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        setIsReadyToSave(customAssistantName.trim().length > 0)
    }, [customAssistantName])

    const createCustomAssistant = async () => {
        try {
            const obj = {
                details: JSON.stringify({
                    name: customAssistantName,
                    category,
                    description
                }),
                credential: uuidv4(),
                type: 'CUSTOM'
            }

            const createResp = await assistantsApi.createNewAssistant(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'New Custom Assistant created.',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                onConfirm(createResp.data.id)
            }
        } catch (err) {
            enqueueSnackbar({
                message: `Failed to add new Custom Assistant: ${
                    typeof err.response?.data === 'object'
                        ? err.response.data.message
                        : err.response?.data || err.message
                }`,
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
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='sm'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle style={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <IconFiles style={{ marginRight: '10px' }} />
                    {dialogProps.title}
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Name */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>Name<span style={{ color: 'red' }}>&nbsp;*</span></Typography>
                    </div>
                    <OutlinedInput
                        size='small'
                        type='text'
                        fullWidth
                        value={customAssistantName}
                        onChange={(e) => setCustomAssistantName(e.target.value)}
                        autoFocus
                    />

                    {/* Category */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>Category</Typography>
                    </div>
                    <OutlinedInput
                        size='small'
                        type='text'
                        fullWidth
                        value={category}
                        placeholder='Add Category'
                        onChange={(e) => setCategory(e.target.value)}
                    />

                    {/* Description */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>Description</Typography>
                    </div>
                    <OutlinedInput
                        size='small'
                        type='text'
                        fullWidth
                        placeholder='Add description'
                        multiline
                        minRows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <StyledButton disabled={!isReadyToSave} variant='contained' onClick={createCustomAssistant}>
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AddCustomAssistantDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default AddCustomAssistantDialog
