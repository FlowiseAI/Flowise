import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { Button, Dialog, DialogContent, DialogTitle } from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'

const DeleteConfirmDialog = ({ show, dialogProps, onCancel, onDelete, onDeleteBoth }) => {
    const portalElement = document.getElementById('portal')

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
                <div style={{ display: 'flex', flexDirection: 'row', marginTop: 20 }}>
                    <Button sx={{ flex: 1, mb: 1, mr: 1 }} color='error' variant='outlined' onClick={onDelete}>
                        Only Flowise
                    </Button>
                    <StyledButton sx={{ flex: 1, mb: 1, ml: 1 }} color='error' variant='contained' onClick={onDeleteBoth}>
                        OpenAI and Flowise
                    </StyledButton>
                </div>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

DeleteConfirmDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onDeleteBoth: PropTypes.func,
    onDelete: PropTypes.func,
    onCancel: PropTypes.func
}

export default DeleteConfirmDialog
