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

const PopupAddMember = ({ open, onClose, userGroups, selectedGroup, setUserGroups, setSelectedGroup }) => {
  const dispatch = useDispatch()

  const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
  const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', groupname: selectedGroup?.groupname })

  const handleChange = (e) => {
    const { name, value } = e.target
    setNewUser((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    try {
      if (!newUser.username || !newUser.password) {
        return enqueueSnackbar({
          message: 'Vui lòng điền đầy đủ username và password.',
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
      const resRegisterUser = await userApi.registerUser(newUser)
      const resData = resRegisterUser?.data
      if (resData) {
        setUserGroups((prev) =>
          prev.map((item) => (item.groupname === resData.groupname ? { ...item, users: [...item.users, resData] } : item))
        )
        setSelectedGroup((prev) => ({ ...prev, users: [...prev.users, resData] }))
        enqueueSnackbar({
          message: 'Đăng kí thành công.',
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
      setNewUser({ username: '', password: '', email: '', groupname: selectedGroup?.groupname })
      return onClose()
    } catch (error) {
      const msg = error?.response?.data?.message ? error.response.data.message : 'Đăng kí thất bại.'
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
    if (selectedGroup) {
      setNewUser((prev) => ({ ...prev, groupname: selectedGroup.groupname }))
    }
  }, [selectedGroup])

  return (
    <ThemeProvider theme={theme}>
      <Dialog
        open={open}
        onClose={() => {
          onClose()
          setNewUser({ username: '', password: '', email: '', groupname: selectedGroup?.groupname })
        }}
        fullWidth
        maxWidth='sm'
      >
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
            <Grid item xs={12}>
              <TextField
                select
                margin='dense'
                name='groupname'
                label='Group'
                fullWidth
                variant='standard'
                defaultValue={newUser?.groupname || ''}
                onChange={handleChange}
                disabled
              >
                {Array.isArray(userGroups) && userGroups.length > 0 ? (
                  userGroups.map((group) => (
                    <MenuItem key={group.id} value={group.groupname}>
                      {group.groupname}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No groups available</MenuItem>
                )}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              onClose()
              setNewUser({ username: '', password: '', email: '', groupname: selectedGroup?.groupname })
            }}
            color='secondary'
          >
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
  onClose: PropTypes.func.isRequired,
  userGroups: PropTypes.array.isRequired,
  selectedGroup: PropTypes.object,
  setUserGroups: PropTypes.func.isRequired,
  setSelectedGroup: PropTypes.func.isRequired
}

export default PopupAddMember
