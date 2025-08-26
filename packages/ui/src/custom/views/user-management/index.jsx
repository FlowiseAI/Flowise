/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import moment from 'moment'

// material-ui
import { styled } from '@mui/material/styles'
import { tableCellClasses } from '@mui/material/TableCell'
import {
    Button,
    Box,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    useTheme,
    Chip,
    IconButton,
    CircularProgress
} from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import AddEditUserDialog from './AddEditUserDialog'

// API
import userManagementApi from '@/custom/api/user-management'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// utils
import useNotifier from '@/utils/useNotifier'

// Icons
import { IconTrash, IconEdit, IconX, IconPlus, IconUser } from '@tabler/icons-react'

// store
import { useError } from '@/store/context/ErrorContext'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,

    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900]
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
        height: 64
    }
}))

const StyledTableRow = styled(TableRow)(() => ({
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

const ShowUserRow = ({ row, onEditClick, onDeleteClick, deletingUserId }) => {
    const theme = useTheme()

    const getStatusChip = (status) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
                return <Chip color='success' label='ACTIVE' size='small' />
            case 'INVITED':
                return <Chip color='warning' label='INVITED' size='small' />
            case 'UNVERIFIED':
                return <Chip color='error' label='INACTIVE' size='small' />
            default:
                return <Chip color='default' label={status?.toUpperCase() || 'UNKNOWN'} size='small' />
        }
    }

    return (
        <StyledTableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
            <StyledTableCell component='th' scope='row'>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <IconUser
                        style={{
                            width: 32,
                            height: 32,
                            marginRight: 10,
                            color: theme.palette.primary.main
                        }}
                    />
                    <div>
                        <div style={{ fontWeight: 'bold' }}>{row.name}</div>
                        <div style={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>{row.email}</div>
                    </div>
                </div>
            </StyledTableCell>
            <StyledTableCell>{getStatusChip(row.status)}</StyledTableCell>
            <StyledTableCell>{row.createdDate ? moment(row.createdDate).format('YYYY-MM-DD HH:mm') : '-'}</StyledTableCell>
            <StyledTableCell>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconButton title='Edit' color='primary' onClick={() => onEditClick(row)} size='small'>
                        <IconEdit />
                    </IconButton>
                    {deletingUserId === row.id ? (
                        <CircularProgress size={20} color='error' />
                    ) : (
                        <IconButton title='Delete' color='error' onClick={() => onDeleteClick(row)} size='small'>
                            <IconTrash />
                        </IconButton>
                    )}
                </div>
            </StyledTableCell>
        </StyledTableRow>
    )
}

// ==============================|| User Management ||============================== //

const UserManagement = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    useNotifier()
    const { error, setError } = useError()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [users, setUsers] = useState([])
    const [search, setSearch] = useState('')
    const [deletingUserId, setDeletingUserId] = useState(null)

    const { confirm } = useConfirm()

    const getAllUsersApi = useApi(userManagementApi.getAllUsers)

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterUsers(user) {
        return user.name?.toLowerCase().indexOf(search.toLowerCase()) > -1 || user.email?.toLowerCase().indexOf(search.toLowerCase()) > -1
    }

    const addNew = () => {
        const dialogProp = {
            type: 'ADD',
            title: 'Add New User',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Create User',
            data: null
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const editUser = (user) => {
        const dialogProp = {
            type: 'EDIT',
            title: 'Edit User',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Update User',
            data: user
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const deleteUser = async (user) => {
        const confirmPayload = {
            title: `Delete User`,
            description: `Are you sure you want to delete user "${user.name}"? This action cannot be undone.`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                setDeletingUserId(user.id)
                await userManagementApi.deleteUser(user.id)
                enqueueSnackbar({
                    message: 'User deleted successfully',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                onConfirm()
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to delete user: ${error.response?.data?.message || error.message}`,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            } finally {
                setDeletingUserId(null)
            }
        }
    }

    const onConfirm = () => {
        setShowDialog(false)
        getAllUsersApi.request()
    }

    useEffect(() => {
        getAllUsersApi.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllUsersApi.loading)
    }, [getAllUsersApi.loading])

    useEffect(() => {
        if (getAllUsersApi.error) {
            setError(getAllUsersApi.error)
        }
    }, [getAllUsersApi.error, setError])

    useEffect(() => {
        if (getAllUsersApi.data) {
            setUsers(getAllUsersApi.data)
        }
    }, [getAllUsersApi.data])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader onSearchChange={onSearchChange} search={true} searchPlaceholder='Search Users' title='사용자 관리'>
                            <Button
                                variant='contained'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={addNew}
                                startIcon={<IconPlus />}
                                id='btn_createUser'
                            >
                                사용자 추가
                            </Button>
                        </ViewHeader>
                        {!isLoading && users.length === 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <IconUser style={{ fontSize: '6rem', color: theme.palette.grey[400] }} />
                                </Box>
                                <div>등록된 사용자가 없습니다</div>
                            </Stack>
                        ) : (
                            <Box sx={{ width: '100%' }}>
                                <TableContainer
                                    sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                    component={Paper}
                                >
                                    <Table sx={{ minWidth: 650 }} aria-label='users table'>
                                        <TableHead
                                            sx={{
                                                backgroundColor: customization.isDarkMode
                                                    ? theme.palette.common.black
                                                    : theme.palette.grey[100],
                                                height: 56
                                            }}
                                        >
                                            <TableRow>
                                                <StyledTableCell>사용자</StyledTableCell>
                                                <StyledTableCell>상태</StyledTableCell>
                                                <StyledTableCell>생성일</StyledTableCell>
                                                <StyledTableCell>작업</StyledTableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {isLoading
                                                ? Array.from({ length: 4 }).map((_, index) => (
                                                      <StyledTableRow key={index}>
                                                          {Array.from({ length: 4 }).map((_, cellIndex) => (
                                                              <StyledTableCell key={cellIndex}>
                                                                  <Skeleton variant='text' />
                                                              </StyledTableCell>
                                                          ))}
                                                      </StyledTableRow>
                                                  ))
                                                : users
                                                      .filter(filterUsers)
                                                      .map((user, index) => (
                                                          <ShowUserRow
                                                              key={user.id || index}
                                                              row={user}
                                                              onEditClick={editUser}
                                                              onDeleteClick={deleteUser}
                                                              deletingUserId={deletingUserId}
                                                          />
                                                      ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}
                    </Stack>
                )}
            </MainCard>
            {showDialog && (
                <AddEditUserDialog
                    show={showDialog}
                    dialogProps={dialogProps}
                    onCancel={() => setShowDialog(false)}
                    onConfirm={onConfirm}
                />
            )}
            <ConfirmDialog />
        </>
    )
}

export default UserManagement
