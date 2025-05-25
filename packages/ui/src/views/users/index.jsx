import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import moment from 'moment'
import * as PropTypes from 'prop-types'

// material-ui
import {
    Button,
    Box,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    useTheme,
    Chip,
    Drawer,
    Typography,
    CircularProgress
} from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import EditUserDialog from '@/views/users/EditUserDialog'
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'
import InviteUsersDialog from '@/ui-component/dialog/InviteUsersDialog'
import { PermissionIconButton, StyledPermissionButton } from '@/ui-component/button/RBACButtons'

// API
import userApi from '@/api/user'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// utils
import useNotifier from '@/utils/useNotifier'

// Icons
import { IconTrash, IconEdit, IconX, IconPlus, IconUser, IconEyeOff, IconEye, IconUserStar } from '@tabler/icons-react'
import users_emptySVG from '@/assets/images/users_empty.svg'

// store
import { useError } from '@/store/context/ErrorContext'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

function ShowUserRow(props) {
    const customization = useSelector((state) => state.customization)

    const [open, setOpen] = useState(false)
    const [userRoles, setUserRoles] = useState([])

    const theme = useTheme()

    const getWorkspacesByUserId = useApi(userApi.getWorkspacesByOrganizationIdUserId)

    const handleViewUserRoles = (userId, organizationId) => {
        setOpen(!open)
        getWorkspacesByUserId.request(organizationId, userId)
    }

    useEffect(() => {
        if (getWorkspacesByUserId.data) {
            setUserRoles(getWorkspacesByUserId.data)
        }
    }, [getWorkspacesByUserId.data])

    useEffect(() => {
        if (!open) {
            setOpen(false)
            setUserRoles([])
        }
    }, [open])

    const currentUser = useSelector((state) => state.auth.user)

    return (
        <React.Fragment>
            <StyledTableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <StyledTableCell component='th' scope='row'>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center'
                        }}
                    >
                        <div
                            style={{
                                width: 25,
                                height: 25,
                                marginRight: 10,
                                borderRadius: '50%'
                            }}
                        >
                            {props?.row?.isOrgOwner ? (
                                <IconUserStar
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        objectFit: 'contain'
                                    }}
                                />
                            ) : (
                                <IconUser
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        objectFit: 'contain'
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </StyledTableCell>
                <StyledTableCell>
                    {props.row.user.name ?? ''}
                    {props.row.user.email && (
                        <>
                            <br />
                            {props.row.user.email}
                        </>
                    )}

                    {props.row.isOrgOwner && (
                        <>
                            {' '}
                            <br />
                            <Chip size='small' label={'ORGANIZATION OWNER'} />{' '}
                        </>
                    )}
                </StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>
                    {props.row.roleCount}
                    <PermissionIconButton
                        permissionId={'users:manage'}
                        aria-label='expand row'
                        size='small'
                        color='inherit'
                        onClick={() => handleViewUserRoles(props.row.userId, props.row.organizationId)}
                    >
                        {props.row.roleCount > 0 && open ? <IconEyeOff /> : <IconEye />}
                    </PermissionIconButton>
                </StyledTableCell>
                <StyledTableCell>
                    {'ACTIVE' === props.row.status.toUpperCase() && <Chip color={'success'} label={props.row.status.toUpperCase()} />}
                    {'INVITED' === props.row.status.toUpperCase() && <Chip color={'warning'} label={props.row.status.toUpperCase()} />}
                    {'INACTIVE' === props.row.status.toUpperCase() && <Chip color={'error'} label={props.row.status.toUpperCase()} />}
                </StyledTableCell>
                <StyledTableCell>{!props.row.lastLogin ? 'Never' : moment(props.row.lastLogin).format('DD/MM/YYYY HH:mm')}</StyledTableCell>
                <StyledTableCell>
                    {props.row.status.toUpperCase() === 'INVITED' && (
                        <PermissionIconButton
                            permissionId={'workspace:add-user,users:manage'}
                            title='Edit'
                            color='primary'
                            onClick={() => props.onEditClick(props.row)}
                        >
                            <IconEdit />
                        </PermissionIconButton>
                    )}
                    {!props.row.isOrgOwner &&
                        props.row.userId !== currentUser.id &&
                        (props.deletingUserId === props.row.user.id ? (
                            <CircularProgress size={24} color='error' />
                        ) : (
                            <PermissionIconButton
                                permissionId={'workspace:unlink-user,users:manage'}
                                title='Delete'
                                color='error'
                                onClick={() => props.onDeleteClick(props.row.user)}
                            >
                                <IconTrash />
                            </PermissionIconButton>
                        ))}
                </StyledTableCell>
            </StyledTableRow>
            <Drawer anchor='right' open={open} onClose={() => setOpen(false)} sx={{ minWidth: 320 }}>
                <Box sx={{ p: 4, height: 'auto', width: 650 }}>
                    <Typography sx={{ textAlign: 'left', mb: 2 }} variant='h2'>
                        Assigned Roles
                    </Typography>
                    <TableContainer
                        style={{ display: 'flex', flexDirection: 'row' }}
                        sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                        component={Paper}
                    >
                        <Table aria-label='assigned roles table'>
                            <TableHead
                                sx={{
                                    backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                                    height: 56
                                }}
                            >
                                <TableRow>
                                    <StyledTableCell sx={{ width: '50%' }}>Role</StyledTableCell>
                                    <StyledTableCell sx={{ width: '50%' }}>Workspace</StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {userRoles.map((item, index) => (
                                    <TableRow key={index}>
                                        <StyledTableCell>{item.role.name}</StyledTableCell>
                                        <StyledTableCell>
                                            {item.workspace.name}
                                            {/* {assignment.active && <Chip color={'secondary'} label={'Active'} />} */}
                                        </StyledTableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Drawer>
        </React.Fragment>
    )
}

ShowUserRow.propTypes = {
    row: PropTypes.any,
    onDeleteClick: PropTypes.func,
    onEditClick: PropTypes.func,
    open: PropTypes.bool,
    theme: PropTypes.any,
    deletingUserId: PropTypes.string
}

// ==============================|| Users ||============================== //

const Users = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    useNotifier()
    const { error, setError } = useError()
    const currentUser = useSelector((state) => state.auth.user)

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)
    const [showInviteDialog, setShowInviteDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [inviteDialogProps, setInviteDialogProps] = useState({})
    const [users, setUsers] = useState([])
    const [search, setSearch] = useState('')
    const [deletingUserId, setDeletingUserId] = useState(null)

    const { confirm } = useConfirm()

    const getAllUsersByOrganizationIdApi = useApi(userApi.getAllUsersByOrganizationId)

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterUsers(data) {
        return (
            data.user.name?.toLowerCase().indexOf(search.toLowerCase()) > -1 ||
            data.user.email.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
    }

    const addNew = () => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Send Invite',
            data: null
        }
        setInviteDialogProps(dialogProp)
        setShowInviteDialog(true)
    }

    const edit = (user) => {
        if (user.status.toUpperCase() === 'INVITED') {
            editInvite(user)
        } else {
            editUser(user)
        }
    }

    const editInvite = (user) => {
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Update Invite',
            data: user
        }
        setInviteDialogProps(dialogProp)
        setShowInviteDialog(true)
    }

    const editUser = (user) => {
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: user
        }
        setInviteDialogProps(dialogProp)
        setShowEditDialog(true)
    }

    const deleteUser = async (user) => {
        const confirmPayload = {
            title: `Delete`,
            description: `Remove ${user.name ?? user.email} from organization?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                setDeletingUserId(user.id)
                const deleteResp = await userApi.deleteOrganizationUser(currentUser.activeOrganizationId, user.id)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: 'User removed from organization successfully',
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
                }
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to delete User: ${
                        typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                    }`,
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
        setShowInviteDialog(false)
        setShowEditDialog(false)
        getAllUsersByOrganizationIdApi.request(currentUser.activeOrganizationId)
    }

    useEffect(() => {
        getAllUsersByOrganizationIdApi.request(currentUser.activeOrganizationId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllUsersByOrganizationIdApi.loading)
    }, [getAllUsersByOrganizationIdApi.loading])

    useEffect(() => {
        if (getAllUsersByOrganizationIdApi.error) {
            setError(getAllUsersByOrganizationIdApi.error)
        }
    }, [getAllUsersByOrganizationIdApi.error, setError])

    useEffect(() => {
        if (getAllUsersByOrganizationIdApi.data) {
            const users = getAllUsersByOrganizationIdApi.data || []
            const orgAdmin = users.find((user) => user.isOrgOwner === true)
            if (orgAdmin) {
                users.splice(users.indexOf(orgAdmin), 1)
                users.unshift(orgAdmin)
            }
            setUsers(users)
        }
    }, [getAllUsersByOrganizationIdApi.data])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader onSearchChange={onSearchChange} search={true} searchPlaceholder='Search Users' title='User Management'>
                            <StyledPermissionButton
                                permissionId={'workspace:add-user,users:manage'}
                                variant='contained'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={addNew}
                                startIcon={<IconPlus />}
                                id='btn_createUser'
                            >
                                Invite User
                            </StyledPermissionButton>
                        </ViewHeader>
                        {!isLoading && users.length === 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={users_emptySVG}
                                        alt='users_emptySVG'
                                    />
                                </Box>
                                <div>No Users Yet</div>
                            </Stack>
                        ) : (
                            <>
                                <Stack flexDirection='row'>
                                    <Box sx={{ py: 2, height: 'auto', width: '100%' }}>
                                        <TableContainer
                                            style={{ display: 'flex', flexDirection: 'row' }}
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
                                                        <StyledTableCell>&nbsp;</StyledTableCell>
                                                        <StyledTableCell>Email/Name</StyledTableCell>
                                                        <StyledTableCell>Assigned Roles</StyledTableCell>
                                                        <StyledTableCell>Status</StyledTableCell>
                                                        <StyledTableCell>Last Login</StyledTableCell>
                                                        <StyledTableCell> </StyledTableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {isLoading ? (
                                                        <>
                                                            <StyledTableRow>
                                                                <StyledTableCell>
                                                                    <Skeleton variant='text' />
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Skeleton variant='text' />
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Skeleton variant='text' />
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Skeleton variant='text' />
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Skeleton variant='text' />
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Skeleton variant='text' />
                                                                </StyledTableCell>
                                                            </StyledTableRow>
                                                            <StyledTableRow>
                                                                <StyledTableCell>
                                                                    <Skeleton variant='text' />
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Skeleton variant='text' />
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Skeleton variant='text' />
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Skeleton variant='text' />
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Skeleton variant='text' />
                                                                </StyledTableCell>
                                                            </StyledTableRow>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {users.filter(filterUsers).map((item, index) => (
                                                                <ShowUserRow
                                                                    key={index}
                                                                    row={item}
                                                                    onDeleteClick={deleteUser}
                                                                    onEditClick={edit}
                                                                    deletingUserId={deletingUserId}
                                                                />
                                                            ))}
                                                        </>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                </Stack>
                            </>
                        )}
                    </Stack>
                )}
            </MainCard>
            {showInviteDialog && (
                <InviteUsersDialog
                    show={showInviteDialog}
                    dialogProps={inviteDialogProps}
                    onCancel={() => setShowInviteDialog(false)}
                    onConfirm={onConfirm}
                ></InviteUsersDialog>
            )}
            {showEditDialog && (
                <EditUserDialog
                    show={showEditDialog}
                    dialogProps={inviteDialogProps}
                    onCancel={() => setShowEditDialog(false)}
                    onConfirm={onConfirm}
                    setError={setError}
                ></EditUserDialog>
            )}
            <ConfirmDialog />
        </>
    )
}

export default Users
