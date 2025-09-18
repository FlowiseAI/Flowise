import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'

// material-ui
import {
    IconButton,
    Checkbox,
    Skeleton,
    Box,
    TableRow,
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableBody,
    Button,
    Stack,
    Chip
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ErrorBoundary from '@/ErrorBoundary'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { PermissionButton, StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import InviteUsersDialog from '@/ui-component/dialog/InviteUsersDialog'
import EditWorkspaceUserRoleDialog from '@/views/workspace/EditWorkspaceUserRoleDialog'

// API
import userApi from '@/api/user'
import workspaceApi from '@/api/workspace'

// Hooks
import useApi from '@/hooks/useApi'
import useNotifier from '@/utils/useNotifier'
import useConfirm from '@/hooks/useConfirm'

// icons
import empty_datasetSVG from '@/assets/images/empty_datasets.svg'
import { IconEdit, IconX, IconUnlink, IconUserPlus } from '@tabler/icons-react'

// store
import { useError } from '@/store/context/ErrorContext'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

const WorkspaceDetails = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const currentUser = useSelector((state) => state.auth.user)
    const navigate = useNavigate()

    const dispatch = useDispatch()
    useNotifier()
    const { error, setError } = useError()

    const [search, setSearch] = useState('')
    const [workspace, setWorkspace] = useState({})
    const [workspaceUsers, setWorkspaceUsers] = useState([])
    const [isLoading, setLoading] = useState(true)
    const [usersSelected, setUsersSelected] = useState([])

    const [showAddUserDialog, setShowAddUserDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [showWorkspaceUserRoleDialog, setShowWorkspaceUserRoleDialog] = useState(false)
    const [workspaceUserRoleDialogProps, setWorkspaceUserRoleDialogProps] = useState({})

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const { confirm } = useConfirm()

    const getAllUsersByWorkspaceIdApi = useApi(userApi.getAllUsersByWorkspaceId)
    const getWorkspaceByIdApi = useApi(workspaceApi.getWorkspaceById)

    const URLpath = document.location.pathname.toString().split('/')
    const workspaceId = URLpath[URLpath.length - 1] === 'workspace-users' ? '' : URLpath[URLpath.length - 1]

    const onUsersSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = (workspaceUsers || [])
                .filter((n) => !n.isOrgOwner)
                .map((n) => ({
                    userId: n.userId,
                    name: n.user.name,
                    email: n.user.email
                }))
            setUsersSelected(newSelected)
            return
        }
        setUsersSelected([])
    }

    const handleUserSelect = (event, user) => {
        const selectedIndex = usersSelected.findIndex((item) => item.userId === user.userId)
        let newSelected = []

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(usersSelected, {
                userId: user.userId,
                name: user.user.name,
                email: user.user.email
            })
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(usersSelected.slice(1))
        } else if (selectedIndex === usersSelected.length - 1) {
            newSelected = newSelected.concat(usersSelected.slice(0, -1))
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(usersSelected.slice(0, selectedIndex), usersSelected.slice(selectedIndex + 1))
        }
        setUsersSelected(newSelected)
    }

    const isUserSelected = (userId) => usersSelected.findIndex((item) => item.userId === userId) !== -1

    const addUser = () => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Send Invite',
            data: workspace
        }
        setDialogProps(dialogProp)
        setShowAddUserDialog(true)
    }

    const onEditClick = (user) => {
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
            data: {
                ...user,
                isWorkspaceUser: true
            },
            disableWorkspaceSelection: true
        }
        setDialogProps(dialogProp)
        setShowAddUserDialog(true)
    }

    const editUser = (user) => {
        const userObj = {
            ...user,
            assignedRoles: [
                {
                    role: user.role,
                    active: true
                }
            ],
            workspaceId: workspaceId
        }
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Update Role',
            data: userObj
        }
        setWorkspaceUserRoleDialogProps(dialogProp)
        setShowWorkspaceUserRoleDialog(true)
    }

    const unlinkUser = async () => {
        const userList = usersSelected.map((user) => (user.name ? `${user.name} (${user.email})` : user.email)).join(', ')

        const confirmPayload = {
            title: `Remove Users`,
            description: `Remove the following users from the workspace?\n${userList}`,
            confirmButtonName: 'Remove',
            cancelButtonName: 'Cancel'
        }

        const orgOwner = workspaceUsers.find(
            (user) => usersSelected.some((selected) => selected.userId === user.id) && user.isOrgOwner === true
        )
        if (orgOwner) {
            enqueueSnackbar({
                message: `Organization owner cannot be removed from workspace.`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            return
        }

        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deletePromises = usersSelected.map((user) => userApi.deleteWorkspaceUser(workspaceId, user.userId))
                await Promise.all(deletePromises)

                enqueueSnackbar({
                    message: `${usersSelected.length} User(s) removed from workspace.`,
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

                // Check if current user is being removed
                if (usersSelected.some((user) => user.userId === currentUser.id)) {
                    navigate('/', { replace: true })
                    navigate(0)
                    return
                }

                onConfirm()
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to unlink users: ${
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
            }
            setUsersSelected([])
        }
    }

    const onConfirm = () => {
        setShowAddUserDialog(false)
        setShowWorkspaceUserRoleDialog(false)
        getAllUsersByWorkspaceIdApi.request(workspaceId)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterUsers(data) {
        return (
            data.user.name?.toLowerCase().indexOf(search.toLowerCase()) > -1 ||
            data.user.email?.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
    }

    useEffect(() => {
        getWorkspaceByIdApi.request(workspaceId)
        getAllUsersByWorkspaceIdApi.request(workspaceId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getWorkspaceByIdApi.data) {
            setWorkspace(getWorkspaceByIdApi.data)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getWorkspaceByIdApi.data])

    useEffect(() => {
        if (getAllUsersByWorkspaceIdApi.data) {
            const workSpaceUsers = getAllUsersByWorkspaceIdApi.data || []
            const orgAdmin = workSpaceUsers.find((item) => item.isOrgOwner)
            if (orgAdmin) {
                workSpaceUsers.splice(workSpaceUsers.indexOf(orgAdmin), 1)
                workSpaceUsers.unshift(orgAdmin)
            }
            setWorkspaceUsers(workSpaceUsers)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllUsersByWorkspaceIdApi.data])

    useEffect(() => {
        if (getAllUsersByWorkspaceIdApi.error) {
            setError(getAllUsersByWorkspaceIdApi.error)
        }
    }, [getAllUsersByWorkspaceIdApi.error, setError])

    useEffect(() => {
        setLoading(getAllUsersByWorkspaceIdApi.loading)
    }, [getAllUsersByWorkspaceIdApi.loading])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            isBackButton={true}
                            isEditButton={false}
                            onBack={() => window.history.back()}
                            search={workspaceUsers.length > 0}
                            onSearchChange={onSearchChange}
                            searchPlaceholder={'Search Users'}
                            title={(workspace?.name || '') + ': Workspace Users'}
                            description={'Manage workspace users and permissions.'}
                        >
                            {workspaceUsers.length > 0 && (
                                <>
                                    <PermissionButton
                                        permissionId={'workspace:unlink-user'}
                                        sx={{ borderRadius: 2, height: '100%' }}
                                        variant='outlined'
                                        disabled={usersSelected.length === 0}
                                        onClick={unlinkUser}
                                        color='error'
                                        startIcon={<IconUnlink />}
                                    >
                                        Remove Users
                                    </PermissionButton>
                                    <StyledPermissionButton
                                        permissionId={'workspace:add-user'}
                                        variant='contained'
                                        sx={{ borderRadius: 2, height: '100%' }}
                                        onClick={addUser}
                                        startIcon={<IconUserPlus />}
                                    >
                                        Add User
                                    </StyledPermissionButton>
                                </>
                            )}
                        </ViewHeader>
                        {!isLoading && workspaceUsers?.length <= 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={empty_datasetSVG}
                                        alt='empty_datasetSVG'
                                    />
                                </Box>
                                <div>No Assigned Users Yet</div>
                                <StyledPermissionButton
                                    permissionId={'workspace:add-user'}
                                    variant='contained'
                                    sx={{ borderRadius: 2, height: '100%', mt: 2, color: 'white' }}
                                    startIcon={<IconUserPlus />}
                                    onClick={addUser}
                                >
                                    Add User
                                </StyledPermissionButton>
                            </Stack>
                        ) : (
                            <>
                                <TableContainer
                                    sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                    component={Paper}
                                >
                                    <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                                        <TableHead
                                            sx={{
                                                backgroundColor: customization.isDarkMode
                                                    ? theme.palette.common.black
                                                    : theme.palette.grey[100],
                                                height: 56
                                            }}
                                        >
                                            <TableRow>
                                                <StyledTableCell padding='checkbox'>
                                                    <Checkbox
                                                        color='primary'
                                                        checked={usersSelected.length === (workspaceUsers || []).length - 1}
                                                        onChange={onUsersSelectAllClick}
                                                        inputProps={{
                                                            'aria-label': 'select all'
                                                        }}
                                                    />
                                                </StyledTableCell>
                                                <StyledTableCell>Email/Name</StyledTableCell>
                                                <StyledTableCell>Role</StyledTableCell>
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
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                    </StyledTableRow>
                                                </>
                                            ) : (
                                                <>
                                                    {(workspaceUsers || []).filter(filterUsers).map((item, index) => (
                                                        <StyledTableRow
                                                            hover
                                                            key={index}
                                                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                        >
                                                            <StyledTableCell padding='checkbox'>
                                                                {item.isOrgOwner ? null : (
                                                                    <Checkbox
                                                                        color='primary'
                                                                        checked={isUserSelected(item.userId)}
                                                                        onChange={(event) => handleUserSelect(event, item)}
                                                                        inputProps={{
                                                                            'aria-labelledby': item.userId
                                                                        }}
                                                                    />
                                                                )}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {item.user.name && (
                                                                    <>
                                                                        {item.user.name}
                                                                        <br />
                                                                    </>
                                                                )}
                                                                {item.user.email}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {item.isOrgOwner ? (
                                                                    <Chip size='small' label={'ORGANIZATION OWNER'} />
                                                                ) : (
                                                                    item.role.name
                                                                )}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {item.isOrgOwner ? (
                                                                    <></>
                                                                ) : (
                                                                    <>
                                                                        {'ACTIVE' === item.status.toUpperCase() && (
                                                                            <Chip color={'success'} label={item.status.toUpperCase()} />
                                                                        )}
                                                                        {'INVITED' === item.status.toUpperCase() && (
                                                                            <Chip color={'warning'} label={item.status.toUpperCase()} />
                                                                        )}
                                                                        {'INACTIVE' === item.status.toUpperCase() && (
                                                                            <Chip color={'error'} label={item.status.toUpperCase()} />
                                                                        )}
                                                                    </>
                                                                )}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {!item.lastLogin
                                                                    ? 'Never'
                                                                    : moment(item.lastLogin).format('DD/MM/YYYY HH:mm')}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {!item.isOrgOwner && item.status.toUpperCase() === 'INVITED' && (
                                                                    <IconButton
                                                                        title='Edit'
                                                                        color='primary'
                                                                        onClick={() => onEditClick(item)}
                                                                    >
                                                                        <IconEdit />
                                                                    </IconButton>
                                                                )}
                                                                {!item.isOrgOwner && item.status.toUpperCase() === 'ACTIVE' && (
                                                                    <IconButton
                                                                        title='Change Role'
                                                                        color='primary'
                                                                        onClick={() => onEditClick(item)}
                                                                    >
                                                                        <IconEdit />
                                                                    </IconButton>
                                                                )}
                                                            </StyledTableCell>
                                                        </StyledTableRow>
                                                    ))}
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        )}
                    </Stack>
                )}
            </MainCard>
            {showAddUserDialog && (
                <InviteUsersDialog
                    show={showAddUserDialog}
                    dialogProps={dialogProps}
                    onCancel={() => setShowAddUserDialog(false)}
                    onConfirm={onConfirm}
                ></InviteUsersDialog>
            )}
            {showWorkspaceUserRoleDialog && (
                <EditWorkspaceUserRoleDialog
                    show={showWorkspaceUserRoleDialog}
                    dialogProps={workspaceUserRoleDialogProps}
                    onCancel={() => setShowWorkspaceUserRoleDialog(false)}
                    onConfirm={onConfirm}
                />
            )}
            <ConfirmDialog />
        </>
    )
}

export default WorkspaceDetails
