import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

// material-ui
import { Check } from '@mui/icons-material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import {
    Dialog,
    DialogContent,
    CircularProgress,
    Button,
    Select,
    Typography,
    Stack,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    DialogActions
} from '@mui/material'
import { alpha, styled } from '@mui/material/styles'

// api
import userApi from '@/api/user'
import workspaceApi from '@/api/workspace'
import accountApi from '@/api/account.api'

// hooks
import useApi from '@/hooks/useApi'
import { useConfig } from '@/store/context/ConfigContext'

// store
import { store } from '@/store'
import { logoutSuccess, workspaceSwitchSuccess } from '@/store/reducers/authSlice'

// ==============================|| WORKSPACE SWITCHER ||============================== //

const StyledMenu = styled((props) => (
    <Menu
        elevation={0}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'right'
        }}
        {...props}
    />
))(({ theme }) => ({
    '& .MuiPaper-root': {
        borderRadius: 6,
        marginTop: theme.spacing(1),
        minWidth: 180,
        boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        '& .MuiMenu-list': {
            padding: '4px 0'
        },
        '& .MuiMenuItem-root': {
            '& .MuiSvgIcon-root': {
                fontSize: 18,
                color: theme.palette.text.secondary,
                marginRight: theme.spacing(1.5)
            },
            '&:active': {
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity)
            }
        }
    }
}))

const WorkspaceSwitcher = () => {
    const navigate = useNavigate()

    const user = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
    const features = useSelector((state) => state.auth.features)

    const { isEnterpriseLicensed } = useConfig()

    const [anchorEl, setAnchorEl] = useState(null)
    const open = Boolean(anchorEl)
    const prevOpen = useRef(open)

    const [assignedWorkspaces, setAssignedWorkspaces] = useState([])
    const [activeWorkspace, setActiveWorkspace] = useState(undefined)
    const [isSwitching, setIsSwitching] = useState(false)
    const [showWorkspaceUnavailableDialog, setShowWorkspaceUnavailableDialog] = useState(false)
    const [showErrorDialog, setShowErrorDialog] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const getWorkspacesByOrganizationIdUserIdApi = useApi(userApi.getWorkspacesByOrganizationIdUserId)
    const getWorkspacesByUserIdApi = useApi(userApi.getWorkspacesByUserId)
    const switchWorkspaceApi = useApi(workspaceApi.switchWorkspace)
    const logoutApi = useApi(accountApi.logout)

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const switchWorkspace = async (id) => {
        setAnchorEl(null)
        if (activeWorkspace !== id) {
            setIsSwitching(true)
            switchWorkspaceApi.request(id)
        }
    }

    const handleLogout = () => {
        logoutApi.request()
    }

    useEffect(() => {
        // Fetch workspaces when component mounts
        if (isAuthenticated && user) {
            const WORKSPACE_FLAG = 'feat:workspaces'
            if (Object.hasOwnProperty.call(features, WORKSPACE_FLAG)) {
                const flag = features[WORKSPACE_FLAG] === 'true' || features[WORKSPACE_FLAG] === true
                if (flag) {
                    if (isEnterpriseLicensed) {
                        getWorkspacesByOrganizationIdUserIdApi.request(user.activeOrganizationId, user.id)
                    } else {
                        getWorkspacesByUserIdApi.request(user.id)
                    }
                }
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user, features, isEnterpriseLicensed])

    useEffect(() => {
        if (getWorkspacesByOrganizationIdUserIdApi.data) {
            const formattedAssignedWorkspaces = getWorkspacesByOrganizationIdUserIdApi.data.map((item) => ({
                id: item.workspaceId,
                name: item.workspace.name
            }))

            const sortedWorkspaces = [...formattedAssignedWorkspaces].sort((a, b) => a.name.localeCompare(b.name))

            // Only check workspace availability after a short delay to allow store updates to complete
            setTimeout(() => {
                if (user && user.activeWorkspaceId && !sortedWorkspaces.find((item) => item.id === user.activeWorkspaceId)) {
                    setShowWorkspaceUnavailableDialog(true)
                }
            }, 500)

            setAssignedWorkspaces(sortWorkspaces(sortedWorkspaces))
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getWorkspacesByOrganizationIdUserIdApi.data, user.activeWorkspaceId])

    useEffect(() => {
        if (getWorkspacesByUserIdApi.data) {
            const formattedAssignedWorkspaces = getWorkspacesByUserIdApi.data.map((item) => ({
                id: item.workspaceId,
                name: item.workspace.name
            }))

            const sortedWorkspaces = [...formattedAssignedWorkspaces].sort((a, b) => a.name.localeCompare(b.name))

            // Only check workspace availability after a short delay to allow store updates to complete
            setTimeout(() => {
                if (user && user.activeWorkspaceId && !sortedWorkspaces.find((item) => item.id === user.activeWorkspaceId)) {
                    setShowWorkspaceUnavailableDialog(true)
                }
            }, 500)

            setAssignedWorkspaces(sortWorkspaces(sortedWorkspaces))
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getWorkspacesByUserIdApi.data, user.activeWorkspaceId])

    useEffect(() => {
        if (switchWorkspaceApi.data) {
            setIsSwitching(false)
            store.dispatch(workspaceSwitchSuccess(switchWorkspaceApi.data))

            // get the current path and navigate to the same after refresh
            navigate('/', { replace: true })
            navigate(0)
        }
    }, [switchWorkspaceApi.data, navigate])

    useEffect(() => {
        if (switchWorkspaceApi.error) {
            setIsSwitching(false)
            setShowWorkspaceUnavailableDialog(false)

            // Set error message and show error dialog
            setErrorMessage(switchWorkspaceApi.error.message || 'Failed to switch workspace')
            setShowErrorDialog(true)
        }
    }, [switchWorkspaceApi.error])

    useEffect(() => {
        try {
            if (logoutApi.data && logoutApi.data.message === 'logged_out') {
                store.dispatch(logoutSuccess())
                window.location.href = logoutApi.data.redirectTo
            }
        } catch (e) {
            console.error(e)
        }
    }, [logoutApi.data])

    useEffect(() => {
        setActiveWorkspace(user.activeWorkspace)

        prevOpen.current = open
    }, [open, user])

    const sortWorkspaces = (assignedWorkspaces) => {
        // Sort workspaces alphabetically by name, with special characters last
        const sortedWorkspaces = assignedWorkspaces
            ? [...assignedWorkspaces].sort((a, b) => {
                  const isSpecialA = /^[^a-zA-Z0-9]/.test(a.name)
                  const isSpecialB = /^[^a-zA-Z0-9]/.test(b.name)

                  // If one has special char and other doesn't, special char goes last
                  if (isSpecialA && !isSpecialB) return 1
                  if (!isSpecialA && isSpecialB) return -1

                  // If both are special or both are not special, sort alphabetically
                  return a.name.localeCompare(b.name, undefined, {
                      numeric: true,
                      sensitivity: 'base'
                  })
              })
            : []
        return sortedWorkspaces
    }

    return (
        <>
            {isAuthenticated &&
            user &&
            assignedWorkspaces?.length > 1 &&
            !(assignedWorkspaces.length === 1 && user.activeWorkspace === 'Default Workspace') ? (
                <>
                    <Button
                        sx={{ mr: 4 }}
                        id='workspace-switcher'
                        aria-controls={open ? 'workspace-switcher-menu' : undefined}
                        aria-haspopup='true'
                        aria-expanded={open ? 'true' : undefined}
                        disableElevation
                        onClick={handleClick}
                        endIcon={<KeyboardArrowDownIcon />}
                    >
                        {user.activeWorkspace}
                    </Button>
                    <StyledMenu
                        id='workspace-switcher-menu'
                        MenuListProps={{
                            'aria-labelledby': 'workspace-switcher'
                        }}
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleClose}
                    >
                        {assignedWorkspaces.map((item, index) => (
                            <MenuItem
                                onClick={() => {
                                    switchWorkspace(item.id)
                                }}
                                key={index}
                                disableRipple
                            >
                                {item.id === user.activeWorkspaceId ? (
                                    <>
                                        <ListItemIcon>
                                            <Check />
                                        </ListItemIcon>
                                        <ListItemText>{item.name}</ListItemText>
                                    </>
                                ) : (
                                    <ListItemText inset>{item.name}</ListItemText>
                                )}
                            </MenuItem>
                        ))}
                    </StyledMenu>
                </>
            ) : null}
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

            <Dialog
                open={showWorkspaceUnavailableDialog}
                disableEscapeKeyDown
                disableBackdropClick
                PaperProps={{
                    style: {
                        padding: '20px',
                        minWidth: '400px'
                    }
                }}
            >
                <DialogContent>
                    <Stack spacing={3}>
                        <Typography variant='h5'>Workspace Unavailable</Typography>
                        <Typography variant='body1'>
                            Your current workspace is no longer available. Please select another workspace to continue.
                        </Typography>
                        <Select
                            fullWidth
                            value=''
                            onChange={(event) => {
                                setShowWorkspaceUnavailableDialog(false)
                                switchWorkspace(event.target.value)
                            }}
                            displayEmpty
                        >
                            <MenuItem disabled value=''>
                                <em>Select Workspace</em>
                            </MenuItem>
                            {assignedWorkspaces.map((workspace, index) => (
                                <MenuItem key={index} value={workspace.id}>
                                    {workspace.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </Stack>
                </DialogContent>
                {assignedWorkspaces.length === 0 && (
                    <DialogActions>
                        <Button onClick={handleLogout} variant='contained' color='primary'>
                            Logout
                        </Button>
                    </DialogActions>
                )}
            </Dialog>

            {/* Error Dialog */}
            <Dialog
                open={showErrorDialog}
                disableEscapeKeyDown
                disableBackdropClick
                PaperProps={{
                    style: {
                        padding: '20px',
                        minWidth: '400px'
                    }
                }}
            >
                <DialogContent>
                    <Stack spacing={3}>
                        <Typography variant='h5'>Workspace Switch Error</Typography>
                        <Typography variant='body1'>{errorMessage}</Typography>
                        {isEnterpriseLicensed && (
                            <Typography variant='body2' color='text.secondary'>
                                Please contact your administrator for assistance.
                            </Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleLogout} variant='contained' color='primary'>
                        Logout
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

WorkspaceSwitcher.propTypes = {}

export default WorkspaceSwitcher
