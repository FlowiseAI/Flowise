import React, { useEffect, useMemo, useState } from 'react'
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  createTheme,
  ThemeProvider
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'
import PopupAddMember from './PopupAddMember'
import PopupAddGroup from './PopupAddGroup'
import userApi from '@/api/user'
import useApi from '@/hooks/useApi'
import { IconX } from '@tabler/icons-react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { Edit } from '@mui/icons-material'
import PopupEditMember from './PopupEditMember'

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
    h4: {
      fontWeight: 600
    },
    h6: {
      fontWeight: 500
    }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          padding: '16px',
          marginBottom: '16px'
        }
      }
    }
  }
})

const AdminAccount = () => {
  const user = useSelector((state) => state.user)
  const isUser = user?.role === 'USER'
  const isMasterAdmin = user?.role === 'MASTER_ADMIN'
  const isGroupAdmin = user?.role === 'ADMIN'
  const userGroupName = user?.groupname

  useEffect(() => {
    if (isUser || !user.id) {
      window.location.href = '/'
    }
  }, [isUser, user])

  const [userGroups, setUserGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [userToEdit, setUserToEdit] = useState(null)
  const [userToDelete, setUserToDelete] = useState(null)
  const [groupToDelete, setGroupToDelete] = useState(null)

  const [dialogOpenAddUser, setDialogOpenAddUser] = useState(false)
  const [dialogOpenAddGroup, setDialogOpenAddGroup] = useState(false)
  const [dialogOpenEditUser, setDialogOpenEditUser] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  const dispatch = useDispatch()

  const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
  const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

  const getAllGroupUsers = useApi(userApi.getAllGroupUsers)
  const { data: dataAllGroupUsers, loading: isLoadingGetAllGroupUsers } = getAllGroupUsers

  const getUsersByGroup = useApi(userApi.getUsersByGroup)
  const { data: dataGetUsersByGroup, loading: isLoadingGetUsersByGroup } = getUsersByGroup

  const dataGroupUsers = useMemo(() => dataAllGroupUsers || dataGetUsersByGroup || [], [dataAllGroupUsers, dataGetUsersByGroup])
  const isLoading = isLoadingGetAllGroupUsers || isLoadingGetUsersByGroup

  const { loading: isLoadingDeleteGroupUser } = getAllGroupUsers
  const isLoadingDeleting = isLoadingDeleteGroupUser

  const handleAddUser = () => {
    setDialogOpenAddUser(true)
  }

  const handleAddGroup = () => {
    setDialogOpenAddGroup(true)
  }

  const handleDialogClose = () => {
    if (dialogOpenAddGroup) setDialogOpenAddGroup(false)
    if (dialogOpenAddUser) setDialogOpenAddUser(false)
    if (dialogOpenEditUser) {
      setDialogOpenEditUser(false)
      setUserToEdit(null)
    }
  }

  const handleConfirmDialogClose = () => {
    setConfirmDialogOpen(false)
    setUserToDelete(null)
    setGroupToDelete(null)
  }

  const handleRemove = async () => {
    try {
      if (groupToDelete) {
        if (groupToDelete?.id) {
          await userApi.deleteGroupUser(groupToDelete?.id)
          setUserGroups((prevGroups) => prevGroups.filter((group) => group.id !== groupToDelete.id))
          if (groupToDelete.id === selectedGroup.id) {
            setSelectedGroup(userGroups.filter((group) => group.id !== groupToDelete.id)[0])
          }
        } else {
          throw new Error('Không thể xóa group.')
        }
      }

      if (userToDelete) {
        if (userToDelete?.userId) {
          await userApi.removeUser(userToDelete?.userId)
          setUserGroups((prevGroups) =>
            prevGroups.map((group) =>
              group?.id === userToDelete?.groupId
                ? { ...group, users: group.users.filter((member) => member.id !== userToDelete?.userId) }
                : group
            )
          )
          setSelectedGroup((prevGroup) =>
            prevGroup.id === userToDelete?.groupId
              ? { ...prevGroup, users: prevGroup.users.filter((member) => member.id !== userToDelete?.userId) }
              : prevGroup
          )
        } else {
          throw new Error('Không thể xóa user.')
        }
      }

      handleConfirmDialogClose()
      return enqueueSnackbar({
        message: 'Xóa thành công.',
        options: {
          variant: 'success',
          action: (key) => (
            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
              <IconX />
            </Button>
          )
        }
      })
    } catch (error) {
      const msg = error?.response?.data?.message ? error.response.data.message : 'Xóa không thành công.'
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

  const handleDeleteClick = async (groupId, userId, type) => {
    if (type === 'remove_group') {
      const fondGroupAdmin = userGroups.find((group) => group.id === groupId)
      if (fondGroupAdmin) {
        setGroupToDelete(fondGroupAdmin)
      }
    }
    if (type === 'remove_user') {
      setUserToDelete({ groupId, userId })
    }
    setConfirmDialogOpen(true)
  }

  useEffect(() => {
    if (isMasterAdmin) {
      getAllGroupUsers.request()
    }

    if (isGroupAdmin) {
      getUsersByGroup.request(userGroupName)
    }
  }, [isMasterAdmin, isGroupAdmin])

  useEffect(() => {
    if (dataGroupUsers) {
      setUserGroups(dataGroupUsers)
      setSelectedGroup(dataGroupUsers[0])
    }
  }, [dataGroupUsers])

  return (
    <ThemeProvider theme={theme}>
      <Container>
        <Typography variant='h4' gutterBottom>
          Admin Account Management
        </Typography>
        <Grid container spacing={3}>
          {isMasterAdmin && (
            <Grid item xs={12} md={4}>
              <Typography variant='h6' gutterBottom>
                Groups
              </Typography>
              {isLoading ? (
                <Grid container justifyContent='center' alignItems='center' style={{ height: '100px' }}>
                  <CircularProgress />
                </Grid>
              ) : (
                <>
                  <Paper elevation={3} style={{ maxHeight: '700px', overflowY: 'auto' }}>
                    <List>
                      {userGroups.map((group) => (
                        <ListItem
                          key={group.id}
                          onClick={() => setSelectedGroup(group)}
                          className={`cursor-pointer ${selectedGroup?.groupname === group.groupname ? 'bg-blue-100' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e3f2fd')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                        >
                          <ListItemText primary={group.groupname} />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge='end'
                              aria-label='delete'
                              onClick={() => handleDeleteClick(group.id, undefined, 'remove_group')}
                              className='text-red-500'
                            >
                              <Delete />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                  <Button variant='contained' color='primary' startIcon={<Add />} onClick={handleAddGroup}>
                    Add Group
                  </Button>
                </>
              )}
            </Grid>
          )}
          <Grid item xs={12} md={isMasterAdmin ? 8 : 12}>
            <Typography variant='h6' gutterBottom>
              Members of {selectedGroup?.groupname}:
            </Typography>
            {isLoading ? (
              <Grid container justifyContent='center' alignItems='center' style={{ height: '100px' }}>
                <CircularProgress />
              </Grid>
            ) : (
              <>
                <Paper elevation={3} style={{ maxHeight: '700px', overflowY: 'auto' }}>
                  <List>
                    {selectedGroup?.users.map((member) => (
                      <ListItem key={member.id}>
                        <ListItemText primary={`${member.username}`} secondary={`Role: ${member.role}, Email: ${member.email}`} />
                        <div className='flex items-center gap-1 w-[55px] justify-end'>
                          {(isMasterAdmin || isGroupAdmin) && member.role !== 'MASTER_ADMIN' && (
                            <IconButton
                              edge='start'
                              aria-label='edit'
                              className='text-yellow-600'
                              onClick={() => {
                                setUserToEdit(member)
                                setDialogOpenEditUser(true)
                              }}
                            >
                              <Edit />
                            </IconButton>
                          )}
                          {(isMasterAdmin || isGroupAdmin) && (
                            <IconButton
                              edge='end'
                              aria-label='delete'
                              onClick={() => handleDeleteClick(selectedGroup.id, member.id, 'remove_user')}
                              className='text-red-500'
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </div>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
                {(isMasterAdmin || isGroupAdmin) && (
                  <Button variant='contained' color='primary' startIcon={<Add />} onClick={handleAddUser}>
                    Add Member
                  </Button>
                )}
              </>
            )}
          </Grid>
        </Grid>

        <PopupAddGroup open={dialogOpenAddGroup} onClose={handleDialogClose} setUserGroups={setUserGroups} />
        {userToEdit && (
          <PopupEditMember
            open={dialogOpenEditUser}
            onClose={handleDialogClose}
            setSelectedGroup={setSelectedGroup}
            setUserGroups={setUserGroups}
            userToEdit={userToEdit}
          />
        )}
        {selectedGroup && (
          <PopupAddMember
            open={dialogOpenAddUser}
            onClose={handleDialogClose}
            userGroups={userGroups}
            selectedGroup={selectedGroup}
            setUserGroups={setUserGroups}
            setSelectedGroup={setSelectedGroup}
          />
        )}
        <Dialog
          open={confirmDialogOpen}
          onClose={handleConfirmDialogClose}
          aria-labelledby='confirm-dialog-title'
          aria-describedby='confirm-dialog-description'
        >
          <DialogTitle id='confirm-dialog-title'>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText id='confirm-dialog-description'>
              Bạn có chắc chắn muốn xóa {groupToDelete ? 'group' : 'user'} này?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmDialogClose} color='primary'>
              Cancel
            </Button>
            <Button
              onClick={handleRemove}
              color='secondary'
              className='bg-red-500 text-white hover:bg-red-300'
              disabled={isLoadingDeleting}
            >
              Ok
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  )
}

export default AdminAccount
