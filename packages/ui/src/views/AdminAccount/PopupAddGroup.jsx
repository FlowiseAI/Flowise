import React, { useState } from 'react'
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, TextField, Grid } from '@mui/material'
import PropTypes from 'prop-types'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import userApi from '@/api/user'
import useApi from '@/hooks/useApi'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { IconX } from '@tabler/icons-react'
import { useDispatch } from 'react-redux'

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

const PopupAddGroup = ({ open, onClose, setUserGroups }) => {
  const dispatch = useDispatch()
  const [loadingAddGroupUser, setLoadingAddGroupUser] = useState(false)
  const [groupName, setGroupName] = useState('')

  const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
  const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

  const handleChange = (e) => {
    const { value } = e.target
    setGroupName(value)
  }

  const handleSubmit = async () => {
    setLoadingAddGroupUser(true)
    try {
      const resGroupName = await userApi.addGroupUser({ groupname: groupName })
      const resData = resGroupName?.data
      setUserGroups((userGroups) => [
        ...userGroups,
        {
          ...resData,
          users: []
        }
      ])
      onClose()
      setGroupName('')
    } catch (error) {
      const msg = error?.response?.data?.message ? error.response.data.message : 'Thêm group thất bại.'
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
    } finally {
      setLoadingAddGroupUser(false)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <Dialog
        onClose={() => {
          onClose()
          setGroupName('')
        }}
        open={open}
        fullWidth
        maxWidth='sm'
      >
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
          <Button
            disabled={loadingAddGroupUser}
            onClick={() => {
              onClose()
              setGroupName('')
            }}
            color='secondary'
          >
            Hủy
          </Button>
          <Button disabled={loadingAddGroupUser} loa onClick={handleSubmit} color='primary'>
            Thêm
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  )
}

PopupAddGroup.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  setUserGroups: PropTypes.func.isRequired
}

export default PopupAddGroup
