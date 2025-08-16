import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import { Button, Dialog, DialogActions, DialogContent, OutlinedInput, DialogTitle, Typography } from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'

const SaveChatflowDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const [chatflowName, setChatflowName] = useState('')
    const [tags, setTags] = useState('')
    const [description, setDescription] = useState('')
    const [isReadyToSave, setIsReadyToSave] = useState(false)

    useEffect(() => {
        if (chatflowName) setIsReadyToSave(true)
        else setIsReadyToSave(false)
    }, [chatflowName])

    const handleConfirm = () => {
        onConfirm({
            name: chatflowName,
            tags,
            description
        })
    }

    const component = show ? (
        <Dialog
            open={show}
            fullWidth
            maxWidth='xs'
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
            disableRestoreFocus
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                {/* Chatflow Name */}
                <OutlinedInput
                    autoFocus
                    id='chatflow-name'
                    type='text'
                    fullWidth
                    placeholder='My New Chatflow'
                    value={chatflowName}
                    onChange={(e) => setChatflowName(e.target.value)}
                    onKeyDown={(e) => {
                        if (isReadyToSave && e.key === 'Enter') handleConfirm()
                    }}
                />
                
                {/* Tags */}
                <OutlinedInput
                    id='chatflow-tags'
                    type='text'
                    fullWidth
                    placeholder='Add tag'
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                />

                {/* Description */}
                <OutlinedInput
                    id='chatflow-description'
                    type='text'
                    fullWidth
                    placeholder='Add description'
                    multiline
                    minRows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{dialogProps.cancelButtonName}</Button>
                <StyledButton disabled={!isReadyToSave} variant='contained' onClick={handleConfirm}>
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

SaveChatflowDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default SaveChatflowDialog
