import { createPortal } from 'react-dom'
import { useState } from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogActions, DialogContent, Typography, DialogTitle, IconButton, InputAdornment, TextField, Grid } from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { VisibilityOff, Visibility } from '@mui/icons-material'
import { ThemeProvider, createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2'
    },
    secondary: {
      main: '#dc004e'
    }
  },
  typography: {
    fontFamily: 'Roboto, sans-serif'
  },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          padding: '20px'
        }
      }
    }
  }
})

const LoginDialog = ({ show, dialogProps, onConfirm, disableBtn = false, onClose = null }) => {
  const portalElement = document.getElementById('portal')
  const [usernameVal, setUsernameVal] = useState('')
  const [passwordVal, setPasswordVal] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const component = show ? (
    <ThemeProvider theme={theme}>
      <Dialog
        onKeyUp={(e) => {
          if (e.key === 'Enter') {
            onConfirm(usernameVal, passwordVal)
          }
        }}
        open={show}
        onClose={() => {
          onClose()
          setUsernameVal('')
          setPasswordVal('')
        }}
        fullWidth
        maxWidth='xs'
        aria-labelledby='alert-dialog-title'
        aria-describedby='alert-dialog-description'
        className='gap-3 flex flex-col'
      >
        <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 'bold' }} id='alert-dialog-title'>
          {dialogProps.title}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} className='pt-2'>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Username'
                variant='outlined'
                value={usernameVal}
                onChange={(e) => setUsernameVal(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label='Password'
                variant='outlined'
                type={showPassword ? 'text' : 'password'}
                value={passwordVal}
                onChange={(e) => setPasswordVal(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          {onClose && (
            <StyledButton
              className='bg-transparent text-red-400 hover:bg-transparent'
              variant='text'
              onClick={() => {
                onClose()
                setUsernameVal('')
                setPasswordVal('')
              }}
            >
              Close
            </StyledButton>
          )}
          <StyledButton disabled={disableBtn || false} variant='contained' onClick={() => onConfirm(usernameVal, passwordVal)}>
            {dialogProps.confirmButtonName}
          </StyledButton>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
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
