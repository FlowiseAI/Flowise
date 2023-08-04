import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, DialogActions, DialogTitle, Typography } from '@mui/material'

const ConfirmDeleteDialog = ({ show, onCancel, onConfirm, title = '', text = '' }) => {
    const portalElement = document.getElementById('portal')

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {title}
            </DialogTitle>
            <DialogContent>
                <Typography>{text}</Typography>
            </DialogContent>

            <DialogActions></DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AboutDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default AboutDialog
