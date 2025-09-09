import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, Typography, OutlinedInput } from '@mui/material'
import { IconX, IconFiles } from '@tabler/icons-react'
import { StyledButton } from '@/ui-component/button/StyledButton'
import useNotifier from '@/utils/useNotifier'
import assistantsApi from '@/api/assistants'

const AddCustomAssistantDialog = ({ show, dialogProps, onCancel, onConfirm, updateAssistantsApi }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch({ type: 'ENQUEUE_SNACKBAR', ...args })
    const closeSnackbar = (...args) => dispatch({ type: 'CLOSE_SNACKBAR', ...args })

    const [customAssistantName, setCustomAssistantName] = useState('')
    const [category, setCategory] = useState('')
    const [description, setDescription] = useState('')
    const [isReadyToSave, setIsReadyToSave] = useState(false)

    useEffect(() => {
        if (show) {
            setCustomAssistantName(dialogProps.name ?? '')
            setCategory(dialogProps.tags ?? '')
            setDescription(dialogProps.description ?? '')
        }
    }, [show, dialogProps])

    useEffect(() => {
        setIsReadyToSave(customAssistantName.trim().length > 0)
    }, [customAssistantName])

    const saveCustomAssistant = async () => {
        try {
            const details = JSON.stringify({
                name: customAssistantName,
                category,
                description
            })

            let response
            if (dialogProps.confirmButtonName === 'Rename' && dialogProps.id) {
                // Update existing assistant
                response = await assistantsApi.updateAssistant(dialogProps.id, { details })
            } else {
                // Create new assistant
                response = await assistantsApi.createNewAssistant({
                    details,
                    credential: dialogProps.credential ?? '',
                    type: 'CUSTOM'
                })
            }

            enqueueSnackbar({
                message: dialogProps.confirmButtonName === 'Rename' ? 'Custom Assistant renamed.' : 'New Custom Assistant created.',
                options: { key: new Date().getTime(), variant: 'success' }
            })

            onConfirm?.(response.data?.id)
            updateAssistantsApi?.request('CUSTOM') // Refresh the list
        } catch (err) {
            enqueueSnackbar({
                message: `Failed: ${
                    typeof err.response?.data === 'object'
                        ? err.response.data.message
                        : err.response?.data || err.message
                }`,
                options: { key: new Date().getTime(), variant: 'error', persist: true }
            })
            onCancel?.()
        }
    }

    const component = show ? (
        <Dialog fullWidth maxWidth='sm' open={show} onClose={onCancel}>
            <DialogTitle style={{ fontSize: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <IconFiles style={{ marginRight: '10px' }} />
                    {dialogProps.title}
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography>Name<span style={{ color: 'red' }}> *</span></Typography>
                    <OutlinedInput size='small' type='text' fullWidth value={customAssistantName} onChange={(e) => setCustomAssistantName(e.target.value)} autoFocus />

                    <Typography>Category</Typography>
                    <OutlinedInput size='small' type='text' fullWidth value={category} placeholder='Add Category' onChange={(e) => setCategory(e.target.value)} />

                    <Typography>Description</Typography>
                    <OutlinedInput size='small' type='text' fullWidth placeholder='Add description' multiline minRows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <StyledButton disabled={!isReadyToSave} variant='contained' onClick={saveCustomAssistant}>
                    {dialogProps.confirmButtonName || 'Create'}
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AddCustomAssistantDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    updateAssistantsApi: PropTypes.object
}

export default AddCustomAssistantDialog
