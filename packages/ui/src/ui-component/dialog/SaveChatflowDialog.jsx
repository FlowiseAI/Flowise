import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import { Button, Dialog, DialogActions, DialogContent, OutlinedInput, DialogTitle, FormControlLabel, Checkbox, Box } from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'

const SaveChatflowDialog = ({ show, dialogProps, onCancel, onConfirm, defaultValues = {} }) => {
    const portalElement = typeof document !== 'undefined' ? document.getElementById('portal') : null

    const [chatflowName, setChatflowName] = useState('')
    const [visibility, setVisibility] = useState(['Private', 'Browser Extension'])
    const [isReadyToSave, setIsReadyToSave] = useState(false)

    useEffect(() => {
        if (show) {
            setChatflowName(defaultValues.name || '')
            // Default to Browser Extension enabled, but respect any existing visibility settings
            const defaultVisibility = defaultValues.visibility || ['Private', 'Browser Extension']
            setVisibility(defaultVisibility)
        }
    }, [show, defaultValues])

    useEffect(() => {
        if (chatflowName) setIsReadyToSave(true)
        else setIsReadyToSave(false)
    }, [chatflowName])

    const handleBrowserExtensionChange = (event) => {
        const isChecked = event.target.checked
        if (isChecked) {
            // Add Browser Extension to visibility if not already there
            if (!visibility.includes('Browser Extension')) {
                setVisibility([...visibility, 'Browser Extension'])
            }
        } else {
            // Remove Browser Extension from visibility
            setVisibility(visibility.filter((v) => v !== 'Browser Extension'))
        }
    }

    const handleConfirm = () => {
        onConfirm(chatflowName, { visibility })
    }

    const component = show ? (
        <Dialog
            open={show}
            fullWidth
            maxWidth='xs'
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
            disableRestoreFocus // needed due to StrictMode
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                <OutlinedInput
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    sx={{ mt: 1 }}
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
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={visibility.includes('Browser Extension')}
                                onChange={handleBrowserExtensionChange}
                                size='small'
                            />
                        }
                        label='Use in Sidekick Browser Extension'
                    />
                    <TooltipWithParser
                        title='Enable this to use the chatflow in the Sidekick browser extension. This allows you to access and run your chatflow directly from your browser.'
                        style={{ marginLeft: 8 }}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{dialogProps.cancelButtonName}</Button>
                <StyledButton disabled={!isReadyToSave} variant='contained' onClick={handleConfirm}>
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return portalElement ? createPortal(component, portalElement) : null
}

SaveChatflowDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    defaultValues: PropTypes.object
}

export default SaveChatflowDialog
