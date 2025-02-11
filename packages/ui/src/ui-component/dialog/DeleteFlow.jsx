import { createPortal } from 'react-dom'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'
import PropTypes from 'prop-types'

const DeleteFlow = ({ show, dialogProps, onCancel, onConfirm, isLoadingRename }) => {
  const portalElement = document.getElementById('portal')

  const component = (
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
        <span>{dialogProps.description || ''}</span>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{dialogProps.cancelButtonName || 'Hủy'}</Button>
        <StyledButton disabled={isLoadingRename} variant='contained' onClick={onConfirm}>
          {dialogProps.confirmButtonName || 'Ok'}
        </StyledButton>
      </DialogActions>
    </Dialog>
  )

  return createPortal(component, portalElement)
}

createPortal.propTypes = {
  show: PropTypes.bool,
  dialogProps: PropTypes.object,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func,
  isLoadingRename: PropTypes.bool
}

export default DeleteFlow
