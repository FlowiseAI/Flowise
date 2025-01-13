import { createPortal } from 'react-dom'
import { useState } from 'react'
import PropTypes from 'prop-types'

import { Dialog, DialogActions, DialogContent, Typography, DialogTitle } from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Input } from '@/ui-component/input/Input'

const LoginDialog = ({ show, dialogProps, onConfirm, disableBtn = false, onClose = null }) => {
  const portalElement = document.getElementById('portal')
  const usernameInput = {
    label: 'Username',
    name: 'username',
    type: 'string',
    placeholder: 'john doe'
  }
  const passwordInput = {
    label: 'Password',
    name: 'password',
    type: 'password'
  }
  const [usernameVal, setUsernameVal] = useState('')
  const [passwordVal, setPasswordVal] = useState('')

  const component = show ? (
    <Dialog
      onKeyUp={(e) => {
        if (e.key === 'Enter') {
          onConfirm(usernameVal, passwordVal)
        }
      }}
      open={show}
      onClose={onClose}
      fullWidth
      maxWidth='xs'
      aria-labelledby='alert-dialog-title'
      aria-describedby='alert-dialog-description'
    >
      <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
        {dialogProps.title}
      </DialogTitle>
      <DialogContent>
        <Typography>Username</Typography>
        <Input inputParam={usernameInput} onChange={(newValue) => setUsernameVal(newValue)} value={usernameVal} showDialog={false} />
        <div style={{ marginTop: 20 }}></div>
        <Typography>Password</Typography>
        <Input inputParam={passwordInput} onChange={(newValue) => setPasswordVal(newValue)} value={passwordVal} />
      </DialogContent>
      <DialogActions>
        {onClose && (
          <StyledButton className='bg-transparent text-red-400 hover:bg-transparent' variant='text' onClick={onClose}>
            Close
          </StyledButton>
        )}
        <StyledButton disabled={disableBtn || false} variant='contained' onClick={() => onConfirm(usernameVal, passwordVal)}>
          {dialogProps.confirmButtonName}
        </StyledButton>
      </DialogActions>
    </Dialog>
  ) : null

  return createPortal(component, portalElement)
}

LoginDialog.propTypes = {
  show: PropTypes.bool,
  dialogProps: PropTypes.object,
  onConfirm: PropTypes.func,
  onClose: PropTypes.func,
  disableBtn: PropTypes.bool
}

export default LoginDialog
