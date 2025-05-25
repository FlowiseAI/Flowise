import React from 'react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import * as PropTypes from 'prop-types'

// material-ui
import { styled } from '@mui/material/styles'
import { tableCellClasses } from '@mui/material/TableCell'
import {
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
    Typography,
    Button,
    Drawer
} from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { PermissionIconButton, StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import CreateEditRoleDialog from '@/views/roles/CreateEditRoleDialog'

// API
import authApi from '@/api/auth'
import roleApi from '@/api/role'
import userApi from '@/api/user'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// utils
import useNotifier from '@/utils/useNotifier'

// Icons
import { IconEdit, IconPlus, IconEye, IconEyeOff, IconX, IconTrash } from '@tabler/icons-react'
import roles_emptySVG from '@/assets/images/roles_empty.svg'

import { useError } from '@/store/context/ErrorContext'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,

    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900]
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
        height: 48
    }
}))

const StyledTableRow = styled(TableRow)(() => ({
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

function ViewPermissionsDrawer(props) {
    const theme = useTheme()
    const [permissions, setPermissions] = useState({})
    const [selectedPermissions, setSelectedPermissions] = useState({})

    const { setError } = useError()

    const getAllPermissionsApi = useApi(authApi.getAllPermissions)

    useEffect(() => {
        if (props.open) {
            getAllPermissionsApi.request()
        }
        return () => {
            setSelectedPermissions({})
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.open])

    useEffect(() => {
        if (getAllPermissionsApi.error) {
            setError(getAllPermissionsApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllPermissionsApi.error])

    useEffect(() => {
        if (getAllPermissionsApi.data) {
            const permissions = getAllPermissionsApi.data
            setPermissions(permissions)
            const rolePermissions = JSON.parse(props.role.permissions)
            if (rolePermissions && rolePermissions.length > 0) {
                Object.keys(permissions).forEach((category) => {
                    Object.keys(permissions[category]).forEach((key) => {
                        rolePermissions.forEach((perm) => {
                            if (perm === permissions[category][key].key) {
                                if (!selectedPermissions[category]) {
                                    selectedPermissions[category] = {}
                                }
                                selectedPermissions[category][perm] = true
                            }
                        })
                    })
                })
                setSelectedPermissions(selectedPermissions)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllPermissionsApi.data])

    return (
        <Drawer anchor='right' open={props.open} onClose={() => props.setOpen(false)} sx={{ minWidth: 320 }}>
            <Box sx={{ p: 4, height: 'auto', width: 650 }}>
                <Typography sx={{ textAlign: 'left', mb: 1 }} variant='h2'>
                    {props.role.name}
                </Typography>
                {props.role.description && (
                    <Typography sx={{ textAlign: 'left', mb: 4 }} variant='body1'>
                        {props.role.description}
                    </Typography>
                )}
                <Box sx={{ overflowY: 'auto' }}>
                    <Typography sx={{ mb: 1 }} variant='h3'>
                        Permissions
                    </Typography>
                    <Box>
                        {permissions &&
                            Object.keys(permissions).map((category) => (
                                <Box
                                    key={category}
                                    sx={{ mb: 2, border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2, padding: 2 }}
                                >
                                    <Box sx={{ mb: 2, borderBottom: 1, borderColor: theme.palette.grey[900] + 25 }}>
                                        <Typography sx={{ mb: 2 }} variant='h4'>
                                            {category
                                                .replace(/([A-Z])/g, ' $1')
                                                .trim()
                                                .toUpperCase()}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 2 }}>
                                        {permissions[category].map((permission, index) => (
                                            <div
                                                key={permission.key}
                                                className={`permission-item ${index % 2 === 0 ? 'left-column' : 'right-column'}`}
                                            >
                                                <label>
                                                    <input
                                                        type='checkbox'
                                                        checked={selectedPermissions[category]?.[permission.key] || false}
                                                        disabled
                                                    />
                                                    {permission.value}
                                                </label>
                                            </div>
                                        ))}
                                    </Box>
                                </Box>
                            ))}
                    </Box>
                </Box>
            </Box>
        </Drawer>
    )
}
ViewPermissionsDrawer.propTypes = {
    open: PropTypes.bool,
    setOpen: PropTypes.func,
    role: PropTypes.any
}

function ShowRoleRow(props) {
    const [openAssignedUsersDrawer, setOpenAssignedUsersDrawer] = useState(false)
    const [openViewPermissionsDrawer, setOpenViewPermissionsDrawer] = useState(false)
    const [selectedRoleId, setSelectedRoleId] = useState('')
    const [assignedUsers, setAssignedUsers] = useState([])

    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const getAllUsersByRoleIdApi = useApi(userApi.getUserByRoleId)

    const handleViewAssignedUsers = (roleId) => {
        setOpenAssignedUsersDrawer(true)
        setSelectedRoleId(roleId)
    }

    useEffect(() => {
        if (getAllUsersByRoleIdApi.data) {
            setAssignedUsers(getAllUsersByRoleIdApi.data)
        }
    }, [getAllUsersByRoleIdApi.data])

    useEffect(() => {
        if (open && selectedRoleId) {
            getAllUsersByRoleIdApi.request(selectedRoleId)
        } else {
            setOpenAssignedUsersDrawer(false)
            setSelectedRoleId('')
            setAssignedUsers([])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openAssignedUsersDrawer])

    return (
        <>
            <StyledTableRow hover key={props.key} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <StyledTableCell>{props.role.name}</StyledTableCell>
                <StyledTableCell>{props.role.description}</StyledTableCell>
                <StyledTableCell sx={{ width: '50%' }}>
                    <Stack sx={{ flexDirection: 'row' }}>
                        <Typography
                            variant='subtitle2'
                            color='textPrimary'
                            sx={{
                                width: '80%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: '2',
                                WebkitBoxOrient: 'vertical'
                            }}
                        >
                            {JSON.parse(props.role.permissions).map((d, key) => (
                                <React.Fragment key={key}>
                                    {d}
                                    {', '}
                                </React.Fragment>
                            ))}
                        </Typography>
                        <PermissionIconButton
                            permissionId={'roles:manage'}
                            title='View'
                            color='primary'
                            onClick={() => setOpenViewPermissionsDrawer(!openViewPermissionsDrawer)}
                        >
                            <IconEye />
                        </PermissionIconButton>
                    </Stack>
                </StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>
                    {props.role.userCount}
                    {props.role.userCount > 0 && (
                        <PermissionIconButton
                            permissionId={'roles:manage'}
                            aria-label='expand row'
                            size='small'
                            color='inherit'
                            onClick={() => handleViewAssignedUsers(props.role.id)}
                        >
                            {props.role.userCount > 0 && openAssignedUsersDrawer ? <IconEyeOff /> : <IconEye />}
                        </PermissionIconButton>
                    )}
                </StyledTableCell>
                <StyledTableCell>
                    <PermissionIconButton
                        permissionId={'roles:manage'}
                        title='Edit'
                        color='primary'
                        onClick={() => props.onEditClick(props.role)}
                    >
                        <IconEdit />
                    </PermissionIconButton>
                    <PermissionIconButton
                        permissionId={'roles:manage'}
                        disabled={props.role.userCount > 0}
                        color='error'
                        title={props.role.userCount > 0 ? 'Remove users with the role from Workspace first' : 'Delete'}
                        onClick={() => props.onDeleteClick(props.role)}
                    >
                        <IconTrash />
                    </PermissionIconButton>
                </StyledTableCell>
            </StyledTableRow>
            <Drawer anchor='right' open={openAssignedUsersDrawer} onClose={() => setOpenAssignedUsersDrawer(false)} sx={{ minWidth: 320 }}>
                <Box sx={{ p: 4, height: 'auto', width: 650 }}>
                    <Typography sx={{ textAlign: 'left', mb: 2 }} variant='h2'>
                        Assigned Users
                    </Typography>
                    <TableContainer
                        style={{ display: 'flex', flexDirection: 'row' }}
                        sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                        component={Paper}
                    >
                        <Table aria-label='assigned users table'>
                            <TableHead
                                sx={{
                                    backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                                    height: 56
                                }}
                            >
                                <TableRow>
                                    <StyledTableCell sx={{ width: '50%' }}>User</StyledTableCell>
                                    <StyledTableCell sx={{ width: '50%' }}>Workspace</StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {assignedUsers.map((item, index) => (
                                    <TableRow key={index}>
                                        <StyledTableCell>{item.user.name || item.user.email}</StyledTableCell>
                                        <StyledTableCell>{item.workspace.name}</StyledTableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Drawer>
            <ViewPermissionsDrawer open={openViewPermissionsDrawer} setOpen={setOpenViewPermissionsDrawer} role={props.role} />
        </>
    )
}

ShowRoleRow.propTypes = {
    key: PropTypes.any,
    role: PropTypes.any,
    onViewClick: PropTypes.func,
    onEditClick: PropTypes.func,
    onDeleteClick: PropTypes.func,
    open: PropTypes.bool,
    theme: PropTypes.any
}

// ==============================|| Roles ||============================== //

const Roles = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    useNotifier()
    const { error, setError } = useError()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)

    const [showCreateEditDialog, setShowCreateEditDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})

    const { confirm } = useConfirm()
    const currentUser = useSelector((state) => state.auth.user)

    const getAllRolesByOrganizationIdApi = useApi(roleApi.getAllRolesByOrganizationId)

    const [roles, setRoles] = useState([])
    const [search, setSearch] = useState('')

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterUsers(data) {
        return (
            (data.name && data.name.toLowerCase().indexOf(search.toLowerCase()) > -1) ||
            (data.description && data.description.toLowerCase().indexOf(search.toLowerCase()) > -1)
        )
    }

    const addNew = () => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Invite',
            data: {}
        }
        setDialogProps(dialogProp)
        setShowCreateEditDialog(true)
    }

    const edit = (role) => {
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Invite',
            data: {
                ...role
            }
        }
        setDialogProps(dialogProp)
        setShowCreateEditDialog(true)
    }

    const view = (role) => {
        const dialogProp = {
            type: 'VIEW',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Invite',
            data: {
                ...role
            }
        }
        setDialogProps(dialogProp)
        setShowCreateEditDialog(true)
    }

    const deleteRole = async (role) => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete Role ${role.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deleteResp = await roleApi.deleteRole(role.id, currentUser.activeOrganizationId)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: 'Role deleted',
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
                    message: `Failed to delete Role: ${
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
        }
    }

    const onConfirm = () => {
        setShowCreateEditDialog(false)
        getAllRolesByOrganizationIdApi.request(currentUser.activeOrganizationId)
    }

    useEffect(() => {
        getAllRolesByOrganizationIdApi.request(currentUser.activeOrganizationId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllRolesByOrganizationIdApi.loading)
    }, [getAllRolesByOrganizationIdApi.loading])

    useEffect(() => {
        if (getAllRolesByOrganizationIdApi.error) {
            setError(getAllRolesByOrganizationIdApi.error)
        }
    }, [getAllRolesByOrganizationIdApi.error, setError])

    useEffect(() => {
        if (getAllRolesByOrganizationIdApi.data) {
            setRoles(getAllRolesByOrganizationIdApi.data)
        }
    }, [getAllRolesByOrganizationIdApi.data])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader onSearchChange={onSearchChange} search={true} searchPlaceholder='Search Roles' title='Roles'>
                            <StyledPermissionButton
                                permissionId={'roles:manage'}
                                variant='contained'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={addNew}
                                startIcon={<IconPlus />}
                                id='btn_createUser'
                            >
                                Add Role
                            </StyledPermissionButton>
                        </ViewHeader>
                        {!isLoading && roles.length === 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={roles_emptySVG}
                                        alt='roles_emptySVG'
                                    />
                                </Box>
                                <div>No Roles Yet</div>
                            </Stack>
                        ) : (
                            <>
                                <Stack flexDirection='row'>
                                    <Box sx={{ p: 2, height: 'auto', width: '100%' }}>
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
                                                        <StyledTableCell>Name</StyledTableCell>
                                                        <StyledTableCell>Description</StyledTableCell>
                                                        <StyledTableCell>Permissions</StyledTableCell>
                                                        <StyledTableCell>Assigned Users</StyledTableCell>
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
                                                            </StyledTableRow>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {roles.filter(filterUsers).map((role, index) => (
                                                                <ShowRoleRow
                                                                    role={role}
                                                                    key={index}
                                                                    onEditClick={edit}
                                                                    onViewClick={view}
                                                                    onDeleteClick={deleteRole}
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
            {showCreateEditDialog && (
                <CreateEditRoleDialog
                    show={showCreateEditDialog}
                    dialogProps={dialogProps}
                    onCancel={() => setShowCreateEditDialog(false)}
                    onConfirm={onConfirm}
                    setError={setError}
                ></CreateEditRoleDialog>
            )}
            <ConfirmDialog />
        </>
    )
}

export default Roles
