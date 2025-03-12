import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { Button, Dialog, DialogContent, DialogTitle } from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'

const DeleteConfirmDialog = ({ show, dialogProps, onCancel, onDelete, onDeleteBoth }) => {
    const portalElement = typeof document !== 'undefined' ? document.getElementById('portal') : null

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='xs'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                <span>{dialogProps.description}</span>
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
                    <StyledButton sx={{ mb: 1 }} color='orange' variant='contained' onClick={onDelete}>
                        Delete only from AnswerAI
                    </StyledButton>
                    <StyledButton sx={{ mb: 1 }} color='error' variant='contained' onClick={onDeleteBoth}>
                        Delete from both OpenAI and AnswerAI
                    </StyledButton>
                    <Button onClick={onCancel}>{dialogProps.cancelButtonName}</Button>
                </div>
            </DialogContent>
        </Dialog>
    ) : null

    return portalElement ? createPortal(component, portalElement) : null
}

DeleteConfirmDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onDeleteBoth: PropTypes.func,
    onDelete: PropTypes.func,
    onCancel: PropTypes.func
}

export default DeleteConfirmDialog
