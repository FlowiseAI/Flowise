import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

import { Dialog, DialogContent, DialogTitle, Button } from '@mui/material'
import ChatMessage from './ChatMessage'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { IconEraser } from '@tabler/icons-react'

const ChatExpandDialog = ({ show, dialogProps, isAgentCanvas, onClear, onCancel, previews, setPreviews }) => {
    const portalElement = document.getElementById('portal')
    const customization = useSelector((state) => state.customization)

    const component = show ? (
        <Dialog
            open={show}
            fullWidth
            maxWidth='md'
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
            sx={{ overflow: 'visible' }}
        >
            <DialogTitle sx={{ fontSize: '1rem', p: 1.5 }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {dialogProps.title}
                    <div style={{ flex: 1 }}></div>
                    {customization.isDarkMode && (
                        <StyledButton
                            variant='outlined'
                            color='error'
                            title='Clear Conversation'
                            onClick={onClear}
                            startIcon={<IconEraser />}
                        >
                            Clear Chat
                        </StyledButton>
                    )}
                    {!customization.isDarkMode && (
                        <Button variant='outlined' color='error' title='Clear Conversation' onClick={onClear} startIcon={<IconEraser />}>
                            Clear Chat
                        </Button>
                    )}
                </div>
            </DialogTitle>
            <DialogContent
                className='cloud-dialog-wrapper'
                sx={{ display: 'flex', justifyContent: 'flex-end', flexDirection: 'column', p: 0 }}
            >
                <ChatMessage
                    isDialog={true}
                    open={dialogProps.open}
                    isAgentCanvas={isAgentCanvas}
                    chatflowid={dialogProps.chatflowid}
                    previews={previews}
                    setPreviews={setPreviews}
                />
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ChatExpandDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    isAgentCanvas: PropTypes.bool,
    onClear: PropTypes.func,
    onCancel: PropTypes.func,
    previews: PropTypes.array,
    setPreviews: PropTypes.func
}

export default ChatExpandDialog
