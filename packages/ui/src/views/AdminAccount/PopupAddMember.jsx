import React, { useState } from 'react'
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, TextField, Grid } from '@mui/material'
import PropTypes from 'prop-types'
import { createTheme, ThemeProvider } from '@mui/material/styles'

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
    fontFamily: 'Roboto, Arial, sans-serif',
    h6: {
      fontWeight: 600
    },
    body1: {
      fontSize: '1rem'
    }
  },
  spacing: 8
})

const PopupAddMember = ({ open, onClose }) => {
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '' })

  const handleChange = (e) => {
    const { name, value } = e.target
    setNewUser((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    // Add user to group logic here
    // Example: await addUserToGroup(selectedGroup.id, newUser)
    onClose()
  }

  return (
    <ThemeProvider theme={theme}>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
        <DialogTitle>Add New Member</DialogTitle>
        <DialogContent>
          <DialogContentText>Please enter the details of the new member.</DialogContentText>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                margin='dense'
                name='username'
                label='Username'
                type='text'
                fullWidth
                variant='standard'
                value={newUser.username}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin='dense'
                name='password'
                label='Password'
                type='password'
                fullWidth
                variant='standard'
                value={newUser.password}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin='dense'
                name='email'
                label='Email Address'
                type='email'
                fullWidth
                variant='standard'
                value={newUser.email}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color='secondary'>
            Hủy
          </Button>
          <Button onClick={handleSubmit} color='primary'>
            Thêm
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  )
}

PopupAddMember.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}

export default PopupAddMember
