import React, { useState } from 'react'
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
  createTheme,
  ThemeProvider
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'
import { useSelector } from 'react-redux'
import PopupAddMember from './PopupAddMember'
import PopupAddGroup from './PopupAddGroup'
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
  const [userGroups, setUserGroups] = useState([
    {
      id: 1,
      name: 'Group 1',
      members: [
        { id: 1, username: 'user1', role: 'admin', email: 'user1@example.com' },
        { id: 2, username: 'user2', role: 'member', email: 'user2@example.com' }
      ],
      adminId: 1
    },
    {
      id: 2,
      name: 'Group 2',
      members: [
        { id: 3, username: 'user3', role: 'admin', email: 'user3@example.com' },
        { id: 4, username: 'user4', role: 'member', email: 'user4@example.com' }
      ],
      adminId: 2
    }
  ])
  const [selectedGroup, setSelectedGroup] = useState(userGroups[1])
  const [dialogOpenAddUser, setDialogOpenAddUser] = useState(false)
  const [dialogOpenAddGroup, setDialogOpenAddGroup] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [groupToDelete, setGroupToDelete] = useState(null)
  // const user = useSelector((state) => state.user)
  const isMasterAdmin = true
  const isGroupAdmin = false

  const getAllUsersGroupedByGroupname = useApi(userApi.getAllUsersGroupedByGroupname)

  const getUsersByGroup = useApi(userApi.getUsersByGroup)

  const getAllGroupUsers = useApi(userApi.getAllGroupUsers)

  const handleAddUser = () => {
    setDialogOpenAddUser(true)
  }

  const handleAddGroup = () => {
    setDialogOpenAddGroup(true)
  }

  const handleDialogClose = () => {
    if (dialogOpenAddGroup) setDialogOpenAddGroup(false)
    if (dialogOpenAddUser) setDialogOpenAddUser(false)
  }

  const handleConfirmDialogClose = () => {
    setConfirmDialogOpen(false)
    setUserToDelete(null)
    setGroupToDelete(null)
  }

  const handleRemoveUser = (groupId, userId) => {
    setUserGroups((prevGroups) =>
      prevGroups.map((group) =>
        group.id === groupId ? { ...group, members: group.members.filter((member) => member.id !== userId) } : group
      )
    )
    handleConfirmDialogClose()
  }

  const handleDeleteClick = (groupId, userId, type) => {
    if (type === 'remove_group') {
      setUserGroups((prevGroups) => prevGroups.filter((group) => group.id !== groupId))
      return
    }

    if (type === 'remove_user') {
      setUserGroups((prevGroups) => prevGroups.filter((group) => group.id !== groupId))
      setUserToDelete({ groupId, userId })

      return
    }
    setConfirmDialogOpen(true)
  }

  useEffect(() => {
    const resUserByGroups = getAllUsersGroupedByGroupname.request()
    console.log('🚀 ~ useEffect ~ resUserByGroups:', resUserByGroups)
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <Container>
        <Typography variant='h4' gutterBottom>
          Admin Account Management
        </Typography>
        <Grid container spacing={3}>
          {isMasterAdmin && (
            <Grid item xs={12} md={4}>
              <Paper elevation={3}>
                <Typography variant='h6' gutterBottom>
                  Groups
                </Typography>
                <List>
                  {userGroups.map((group) => (
                    <ListItem key={group.id} onClick={() => setSelectedGroup(group)}>
                      <ListItemText primary={group.name} />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge='end'
                          aria-label='delete'
                          onClick={() => handleDeleteClick(group.id, group.adminId, 'remove_group')}
                          className='text-red-500'
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
                <Button variant='contained' color='primary' startIcon={<Add />} onClick={handleAddGroup}>
                  Add Group
                </Button>
              </Paper>
            </Grid>
          )}
          <Grid item xs={12} md={isMasterAdmin ? 8 : 12}>
            <Typography variant='h6' gutterBottom>
              Members of {selectedGroup.name}:
            </Typography>
            <Paper elevation={3}>
              <List>
                {selectedGroup.members.map((member) => (
                  <ListItem key={member.id}>
                    <ListItemText primary={`${member.username}`} secondary={`Role: ${member.role}, Email: ${member.email}`} />
                    {(isMasterAdmin || isGroupAdmin) && (
                      <ListItemSecondaryAction>
                        <IconButton
                          edge='end'
                          aria-label='delete'
                          onClick={() => handleDeleteClick(selectedGroup.id, member.id, 'remove_user')}
                          className='text-red-500'
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))}
              </List>
              {(isMasterAdmin || isGroupAdmin) && (
                <Button variant='contained' color='primary' startIcon={<Add />} onClick={handleAddUser}>
                  Add Member
                </Button>
              )}
            </Paper>
          </Grid>
        </Grid>
        <PopupAddGroup open={dialogOpenAddGroup} onClose={handleDialogClose} />
        <PopupAddMember open={dialogOpenAddUser} onClose={handleDialogClose} />
        <Dialog
          open={confirmDialogOpen}
          onClose={handleConfirmDialogClose}
          aria-labelledby='confirm-dialog-title'
          aria-describedby='confirm-dialog-description'
        >
          <DialogTitle id='confirm-dialog-title'>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText id='confirm-dialog-description'>Bạn có chắc chắn xóa này không?</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmDialogClose} color='primary'>
              Hủy
            </Button>
            <Button
              onClick={() => handleRemoveUser(userToDelete.groupId, userToDelete.userId)}
              color='secondary'
              className='bg-red-500 text-white hover:bg-red-300'
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
