import React, { useState } from 'react'
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, TextField, Grid } from '@mui/material'
import PropTypes from 'prop-types'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import userApi from '@/api/user'
import useApi from '@/hooks/useApi'

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

const PopupAddGroup = ({ open, onClose }) => {
  const [groupName, setGroupName] = useState('')

  const handleChange = (e) => {
    const { value } = e.target
    setGroupName(value)
  }

  const handleSubmit = async () => {
    // Add user to group logic here
    // Example: await addUserToGroup(selectedGroup.id, newUser)
    onClose()
    setGroupName('')
  }

  return (
    <ThemeProvider theme={theme}>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
        <DialogTitle>Add New Group</DialogTitle>
        <DialogContent>
          <DialogContentText>Please enter the details of the new Group.</DialogContentText>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                margin='dense'
                name='groupname'
                label='Tên group'
                type='text'
                fullWidth
                variant='standard'
                value={groupName}
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

PopupAddGroup.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}

export default PopupAddGroup
