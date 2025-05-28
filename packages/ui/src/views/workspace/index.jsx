import moment from 'moment/moment'
import * as PropTypes from 'prop-types'
import { Fragment, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

// material-ui
import {
    Box,
    Button,
    Chip,
    Drawer,
    IconButton,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Dialog,
    DialogContent,
    CircularProgress
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import ErrorBoundary from '@/ErrorBoundary'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { PermissionIconButton, StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import MainCard from '@/ui-component/cards/MainCard'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'
import AddEditWorkspaceDialog from './AddEditWorkspaceDialog'

// API
import userApi from '@/api/user'
import workspaceApi from '@/api/workspace'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// icons
import workspaces_emptySVG from '@/assets/images/workspaces_empty.svg'
import { IconEdit, IconEye, IconEyeOff, IconPlus, IconTrash, IconTrashOff, IconUsers, IconX } from '@tabler/icons-react'

// Utils
import { truncateString } from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'

// Store
import { store } from '@/store'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { useError } from '@/store/context/ErrorContext'
import { workspaceSwitchSuccess } from '@/store/reducers/authSlice'
import { Link } from 'react-router-dom'

function ShowWorkspaceRow(props) {
    const customization = useSelector((state) => state.customization)
    const currentUser = useSelector((state) => state.auth.user)
    const [open, setOpen] = useState(false)
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
    const [workspaceUsers, setWorkspaceUsers] = useState([])

    const theme = useTheme()

    const getAllUsersByWorkspaceIdApi = useApi(userApi.getAllUsersByWorkspaceId)

    const handleViewWorkspaceUsers = (workspaceId) => {
        setOpen(!open)
        setSelectedWorkspaceId(workspaceId)
    }

    useEffect(() => {
        if (getAllUsersByWorkspaceIdApi.data) {
            setWorkspaceUsers(getAllUsersByWorkspaceIdApi.data)
        }
    }, [getAllUsersByWorkspaceIdApi.data])

    useEffect(() => {
        if (open && selectedWorkspaceId) {
            getAllUsersByWorkspaceIdApi.request(selectedWorkspaceId)
        } else {
            setOpen(false)
            setSelectedWorkspaceId('')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    return (
        <Fragment key={props.rowKey}>
            <StyledTableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <StyledTableCell component='th' scope='row'>
                    {props.workspace.name}
                    {currentUser.activeWorkspaceId === props.workspace.id && (
                        <Chip
                            sx={{
                                ml: 2,
                                my: 'auto',
                                width: 'max-content',
                                background: theme.palette.teal.main,
                                color: 'white'
                            }}
                            label={'Active'}
                        />
                    )}
                </StyledTableCell>
                <StyledTableCell style={{ wordWrap: 'break-word', flexWrap: 'wrap', width: '30%' }}>
                    {truncateString(props.workspace?.description || '', 200)}
                </StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>
                    {props.workspace.userCount}{' '}
                    {props.workspace.userCount > 0 && (
                        <IconButton
                            aria-label='expand row'
                            size='small'
                            color='inherit'
                            onClick={() => handleViewWorkspaceUsers(props.workspace.id)}
                        >
                            {props.workspace.userCount > 0 && open ? <IconEyeOff /> : <IconEye />}
                        </IconButton>
                    )}
                </StyledTableCell>
                <StyledTableCell>{moment(props.workspace.updatedDate).format('MMMM Do YYYY, hh:mm A')}</StyledTableCell>
                <StyledTableCell>
                    {props.workspace.name !== 'Default Workspace' && (
                        <PermissionIconButton
                            permissionId={'workspace:update'}
                            title='Edit'
                            color='primary'
                            onClick={() => props.onEditClick(props.workspace)}
                        >
                            <IconEdit />
                        </PermissionIconButton>
                    )}
                    <Link to={`/workspace-users/${props.workspace.id}`}>
                        <IconButton title='Workspace Users' color='primary'>
                            <IconUsers />
                        </IconButton>
                    </Link>
                    {props.workspace.name !== 'Default Workspace' &&
                        (props.workspace.userCount > 1 || props.workspace.isOrgDefault === true ? (
                            <IconButton title='Delete' disabled={true} color='error' onClick={() => props.onDeleteClick(props.workspace)}>
                                <IconTrashOff />
                            </IconButton>
                        ) : (
                            <PermissionIconButton
                                permissionId={'workspace:delete'}
                                title='Delete'
                                color='error'
                                onClick={() => props.onDeleteClick(props.workspace)}
                            >
                                <IconTrash />
                            </PermissionIconButton>
                        ))}
                </StyledTableCell>
            </StyledTableRow>
            <Drawer anchor='right' open={open} onClose={() => setOpen(false)} sx={{ minWidth: 320 }}>
                <Box sx={{ p: 4, height: 'auto', width: 650 }}>
                    <Typography sx={{ textAlign: 'left', mb: 2 }} variant='h2'>
                        Users
                    </Typography>
                    <TableContainer
                        style={{ display: 'flex', flexDirection: 'row' }}
                        sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                        component={Paper}
                    >
                        <Table aria-label='workspace users table'>
                            <TableHead
                                sx={{
                                    backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                                    height: 56
                                }}
                            >
                                <TableRow>
                                    <StyledTableCell sx={{ width: '60%' }}>User</StyledTableCell>
                                    <StyledTableCell sx={{ width: '40%' }}>Role</StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {workspaceUsers &&
                                    workspaceUsers.length > 0 &&
                                    workspaceUsers.map((item, index) => (
                                        <TableRow key={index}>
                                            <StyledTableCell>{item.user.name || item.user.email}</StyledTableCell>
                                            <StyledTableCell>
                                                {item.isOrgOwner ? (
                                                    <Chip label='ORGANIZATION OWNER' size={'small'} />
                                                ) : item.role.name === 'personal workspace' ? (
                                                    <Chip label='PERSONAL WORKSPACE' size={'small'} />
                                                ) : (
                                                    item.role.name
                                                )}
                                            </StyledTableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Drawer>
        </Fragment>
    )
}

ShowWorkspaceRow.propTypes = {
    rowKey: PropTypes.any,
    workspace: PropTypes.any,
    onEditClick: PropTypes.func,
    onDeleteClick: PropTypes.func,
    onViewUsersClick: PropTypes.func,
    open: PropTypes.bool,
    theme: PropTypes.any
}

// ==============================|| Workspaces ||============================== //

const Workspaces = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    const { confirm } = useConfirm()
    const currentUser = useSelector((state) => state.auth.user)
    const customization = useSelector((state) => state.customization)

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [search, setSearch] = useState('')
    const dispatch = useDispatch()
    const { error, setError } = useError()
    const [isLoading, setLoading] = useState(true)
    const [workspaces, setWorkspaces] = useState([])
    const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false)
    const [workspaceDialogProps, setWorkspaceDialogProps] = useState({})
    const [isSwitching, setIsSwitching] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const getAllWorkspacesApi = useApi(workspaceApi.getAllWorkspacesByOrganizationId)
    const switchWorkspaceApi = useApi(workspaceApi.switchWorkspace)

    const showWorkspaceUsers = (selectedWorkspace) => {
        navigate(`/workspace-users/${selectedWorkspace.id}`)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    const addNew = () => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            data: {}
        }
        setWorkspaceDialogProps(dialogProp)
        setShowWorkspaceDialog(true)
    }

    const edit = (workspace) => {
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: workspace
        }
        setWorkspaceDialogProps(dialogProp)
        setShowWorkspaceDialog(true)
    }

    const deleteWorkspace = async (workspace) => {
        const confirmPayload = {
            title: `Delete Workspace ${workspace.name}`,
            description: `This is irreversible and will remove all associated data inside the workspace. Are you sure you want to delete?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            setIsDeleting(true)
            try {
                const deleteWorkspaceId = workspace.id
                const deleteResp = await workspaceApi.deleteWorkspace(deleteWorkspaceId)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: 'Workspace deleted',
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
                    onConfirm(deleteWorkspaceId, true)
                }
            } catch (error) {
                console.error('Failed to delete workspace:', error)
                enqueueSnackbar({
                    message: `Failed to delete workspace: ${
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
                setIsDeleting(false)
            }
        }
    }

    const onConfirm = (specificWorkspaceId, isDeleteWorkspace) => {
        setShowWorkspaceDialog(false)
        getAllWorkspacesApi.request(currentUser.activeOrganizationId)

        const assignedWorkspaces = currentUser.assignedWorkspaces
        if (assignedWorkspaces.length === 0 || workspaces.length === 0) {
            return
        }

        // if the deleted workspace is the active workspace, switch to first available workspace
        if (isDeleteWorkspace && currentUser.activeWorkspaceId === specificWorkspaceId) {
            setIsSwitching(true)
            const workspaceId = workspaces[0].id
            switchWorkspaceApi.request(workspaceId)
        } else if (!isDeleteWorkspace && specificWorkspaceId) {
            setIsSwitching(true)
            switchWorkspaceApi.request(specificWorkspaceId)
        }
    }

    function filterWorkspaces(data) {
        return data.name.toLowerCase().indexOf(search.toLowerCase()) > -1
    }

    useEffect(() => {
        if (switchWorkspaceApi.data) {
            setIsSwitching(false)

            // Create a promise that resolves when the state is updated
            const waitForStateUpdate = new Promise((resolve) => {
                const unsubscribe = store.subscribe(() => {
                    const state = store.getState()
                    if (state.auth.user.activeWorkspaceId === switchWorkspaceApi.data.activeWorkspaceId) {
                        unsubscribe()
                        resolve()
                    }
                })
            })

            // Dispatch and wait for state update before navigating
            store.dispatch(workspaceSwitchSuccess(switchWorkspaceApi.data))
            waitForStateUpdate.then(() => {
                navigate('/', { replace: true })
                navigate(0)
            })
        }
    }, [switchWorkspaceApi.data, navigate])

    useEffect(() => {
        if (getAllWorkspacesApi.data) {
            setWorkspaces(getAllWorkspacesApi.data)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllWorkspacesApi.data])

    useEffect(() => {
        setLoading(getAllWorkspacesApi.loading)
    }, [getAllWorkspacesApi.loading])

    useEffect(() => {
        if (getAllWorkspacesApi.error) {
            setError(getAllWorkspacesApi.error)
        }
    }, [getAllWorkspacesApi.error, setError])

    useEffect(() => {
        getAllWorkspacesApi.request(currentUser.activeOrganizationId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            isBackButton={false}
                            isEditButton={false}
                            onSearchChange={onSearchChange}
                            search={true}
                            title='Workspaces'
                            searchPlaceholder='Search Workspaces'
                        >
                            <StyledPermissionButton
                                permissionId={'workspace:create'}
                                variant='contained'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={addNew}
                                startIcon={<IconPlus />}
                            >
                                Add New
                            </StyledPermissionButton>
                        </ViewHeader>
                        {!isLoading && workspaces.length <= 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={workspaces_emptySVG}
                                        alt='workspaces_emptySVG'
                                    />
                                </Box>
                                <div>No Workspaces Yet</div>
                            </Stack>
                        ) : (
                            <TableContainer
                                sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                component={Paper}
                            >
                                <Table sx={{ minWidth: 650 }}>
                                    <TableHead
                                        sx={{
                                            backgroundColor: customization.isDarkMode
                                                ? theme.palette.common.black
                                                : theme.palette.grey[100],
                                            height: 56
                                        }}
                                    >
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Description</TableCell>
                                            <TableCell>Users</TableCell>
                                            <TableCell>Last Updated</TableCell>
                                            <TableCell> </TableCell>
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
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                </StyledTableRow>
                                            </>
                                        ) : (
                                            <>
                                                {workspaces.filter(filterWorkspaces).map((ds, index) => (
                                                    <ShowWorkspaceRow
                                                        key={index}
                                                        workspace={ds}
                                                        rowKey={index}
                                                        onEditClick={edit}
                                                        onDeleteClick={deleteWorkspace}
                                                        onViewUsersClick={showWorkspaceUsers}
                                                    />
                                                ))}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Stack>
                )}
            </MainCard>
            {showWorkspaceDialog && (
                <AddEditWorkspaceDialog
                    show={showWorkspaceDialog}
                    dialogProps={workspaceDialogProps}
                    onCancel={() => setShowWorkspaceDialog(false)}
                    onConfirm={onConfirm}
                ></AddEditWorkspaceDialog>
            )}
            <ConfirmDialog />
            <Dialog open={isSwitching} PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none' } }}>
                <DialogContent>
                    <Stack spacing={2} alignItems='center'>
                        <CircularProgress />
                        <Typography variant='body1' style={{ color: 'white' }}>
                            Switching workspace...
                        </Typography>
                    </Stack>
                </DialogContent>
            </Dialog>
            <Dialog open={isDeleting} PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none' } }}>
                <DialogContent>
                    <Stack spacing={2} alignItems='center'>
                        <CircularProgress />
                        <Typography variant='body1' style={{ color: 'white' }}>
                            Deleting workspace...
                        </Typography>
                    </Stack>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default Workspaces
