import React, { useEffect, useState } from 'react'
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, TextField, Grid, MenuItem } from '@mui/material'
import PropTypes from 'prop-types'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import userApi from '@/api/user'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { IconX } from '@tabler/icons-react'

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

const PopupEditMember = ({ open, onClose, setUserGroups, setSelectedGroup, userToEdit }) => {
  const dispatch = useDispatch()
  const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
  const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

  const [editUser, setEditUser] = useState({ role: userToEdit?.role })

  const handleChange = (e) => {
    const { name, value } = e.target
    setEditUser((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    try {
      if (editUser.role === userToEdit.role) {
        return onClose()
      }
      const resRegisterUser = await userApi.updateUser(userToEdit.id, editUser)
      const resData = resRegisterUser?.data
      if (resData) {
        setUserGroups((prev) =>
          prev.map((item) =>
            item.groupname === userToEdit.groupname
              ? { ...item, users: item.users.map((user) => (user.id === resData.id ? resData : user)) }
              : item
          )
        )
        setSelectedGroup((prev) =>
          prev.groupname === userToEdit.groupname
            ? { ...prev, users: prev.users.map((user) => (user.id === resData.id ? resData : user)) }
            : prev
        )
        enqueueSnackbar({
          message: 'User đã cập nhật thành công.',
          options: {
            variant: 'success',
            action: (key) => (
              <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                <IconX />
              </Button>
            )
          }
        })
      }
      return onClose()
    } catch (error) {
      const msg = error?.response?.data?.message ? error.response.data.message : 'Update user thất bại.'
      return enqueueSnackbar({
        message: msg,
        options: {
          variant: 'error',
          action: (key) => (
            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
              <IconX />
            </Button>
          )
        }
      })
    }
  }

  useEffect(() => {
    if (userToEdit) {
      setEditUser({ role: userToEdit.role })
    }
  }, [userToEdit])

  return (
    <ThemeProvider theme={theme}>
      <Dialog
        open={open}
        onClose={() => {
          onClose()
          setEditUser({ role: '' })
        }}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>Edit Member</DialogTitle>
        <DialogContent>
          <DialogContentText>Please enter the detail of user.</DialogContentText>
          <Grid container spacing={2}>
            {editUser && (
              <Grid item xs={12}>
                <TextField
                  margin='dense'
                  name='role'
                  label='Role'
                  select
                  fullWidth
                  variant='standard'
                  value={editUser.role || ''}
                  onChange={handleChange}
                >
                  <MenuItem value='ADMIN'>Admin</MenuItem>
                  <MenuItem value='USER'>User</MenuItem>
                </TextField>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              onClose()
              setEditUser({ role: '' })
            }}
            color='secondary'
          >
            Hủy
          </Button>
          <Button onClick={handleSubmit} color='primary'>
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  )
}

PopupEditMember.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  setUserGroups: PropTypes.func.isRequired,
  setSelectedGroup: PropTypes.func.isRequired,
  userToEdit: PropTypes.object
}

export default PopupEditMember
