import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

// material-ui
import {
    Breadcrumbs,
    Menu,
    MenuItem,
    Dialog,
    DialogContent,
    CircularProgress,
    Typography,
    Stack,
    Chip,
    ListItemText,
    ListItemIcon,
    Select
} from '@mui/material'
import { Check } from '@mui/icons-material'
import { alpha, styled, emphasize } from '@mui/material/styles'

import { IconChevronDown } from '@tabler/icons-react'

// api
import userApi from '@/api/user'
import workspaceApi from '@/api/workspace'

// hooks
import useApi from '@/hooks/useApi'

// store
import { store } from '@/store'
import { workspaceSwitchSuccess } from '@/store/reducers/authSlice'

// ==============================|| OrgWorkspaceBreadcrumbs ||============================== //

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

const StyledBreadcrumb = styled(Chip)(({ theme, isDarkMode }) => {
    const backgroundColor = isDarkMode ? theme.palette.grey[800] : theme.palette.grey[100]
    return {
        backgroundColor,
        height: theme.spacing(3),
        color: theme.palette.text.primary,
        fontWeight: theme.typography.fontWeightRegular,
        '&:hover, &:focus': {
            backgroundColor: emphasize(backgroundColor, 0.06)
        },
        '&:active': {
            boxShadow: theme.shadows[1],
            backgroundColor: emphasize(backgroundColor, 0.12)
        }
    }
})

const OrgWorkspaceBreadcrumbs = () => {
    const navigate = useNavigate()

    const user = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
    const customization = useSelector((state) => state.customization)

    const [orgAnchorEl, setOrgAnchorEl] = useState(null)
    const [workspaceAnchorEl, setWorkspaceAnchorEl] = useState(null)
    const orgMenuOpen = Boolean(orgAnchorEl)
    const workspaceMenuOpen = Boolean(workspaceAnchorEl)

    const [assignedOrganizations, setAssignedOrganizations] = useState([])
    const [activeOrganizationId, setActiveOrganizationId] = useState(undefined)
    const [assignedWorkspaces, setAssignedWorkspaces] = useState([])
    const [activeWorkspaceId, setActiveWorkspaceId] = useState(undefined)
    const [isWorkspaceSwitching, setIsWorkspaceSwitching] = useState(false)
    const [isOrganizationSwitching, setIsOrganizationSwitching] = useState(false)
    const [showWorkspaceUnavailableDialog, setShowWorkspaceUnavailableDialog] = useState(false)

    const getOrganizationsByUserIdApi = useApi(userApi.getOrganizationsByUserId)
    const getWorkspacesByUserIdApi = useApi(userApi.getWorkspacesByUserId)
    const switchWorkspaceApi = useApi(workspaceApi.switchWorkspace)

    const handleOrgClick = (event) => {
        setOrgAnchorEl(event.currentTarget)
    }

    const handleWorkspaceClick = (event) => {
        setWorkspaceAnchorEl(event.currentTarget)
    }

    const handleOrgClose = () => {
        setOrgAnchorEl(null)
    }

    const handleWorkspaceClose = () => {
        setWorkspaceAnchorEl(null)
    }

    const handleOrgSwitch = async (orgId) => {
        setOrgAnchorEl(null)
        if (activeOrganizationId !== orgId) {
            setIsOrganizationSwitching(true)
            setActiveOrganizationId(orgId)
            // Fetch workspaces for the new organization
            getWorkspacesByUserIdApi.request(user.id)
        }
    }

    const handleUnavailableOrgSwitch = async (orgId) => {
        setOrgAnchorEl(null)
        setActiveOrganizationId(orgId)
        // Fetch workspaces for the new organization
        try {
            const response = await userApi.getWorkspacesByUserId(user.id)
            const workspaces = response.data
            const filteredAssignedWorkspaces = workspaces.filter((item) => item.workspace.organizationId === orgId)
            const formattedAssignedWorkspaces = filteredAssignedWorkspaces.map((item) => ({
                id: item.workspaceId,
                name: item.workspace.name
            }))

            const sortedWorkspaces = [...formattedAssignedWorkspaces].sort((a, b) => a.name.localeCompare(b.name))

            setAssignedWorkspaces(sortedWorkspaces)
        } catch (error) {
            console.error('Error fetching workspaces:', error)
        }
    }

    const switchWorkspace = async (id) => {
        setWorkspaceAnchorEl(null)
        if (activeWorkspaceId !== id) {
            setIsWorkspaceSwitching(true)
            switchWorkspaceApi.request(id)
        }
    }

    useEffect(() => {
        // Fetch workspaces when component mounts
        if (isAuthenticated && user) {
            getOrganizationsByUserIdApi.request(user.id)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user])

    useEffect(() => {
        if (getWorkspacesByUserIdApi.data) {
            const filteredAssignedWorkspaces = getWorkspacesByUserIdApi.data.filter(
                (item) => item.workspace.organizationId === activeOrganizationId
            )
            const formattedAssignedWorkspaces = filteredAssignedWorkspaces.map((item) => ({
                id: item.workspaceId,
                name: item.workspace.name
            }))

            const sortedWorkspaces = [...formattedAssignedWorkspaces].sort((a, b) => a.name.localeCompare(b.name))

            // Only check workspace availability if we're not in the process of switching organizations
            if (!isOrganizationSwitching) {
                setTimeout(() => {
                    if (user && user.activeWorkspaceId && !sortedWorkspaces.find((item) => item.id === user.activeWorkspaceId)) {
                        setShowWorkspaceUnavailableDialog(true)
                    }
                }, 500)
            }

            setAssignedWorkspaces(sortedWorkspaces)

            if (isOrganizationSwitching && sortedWorkspaces.length > 0) {
                // After organization switch, switch to the first workspace in the list
                switchWorkspaceApi.request(sortedWorkspaces[0].id)
            } else {
                setIsOrganizationSwitching(false)
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getWorkspacesByUserIdApi.data])

    useEffect(() => {
        if (getWorkspacesByUserIdApi.error) {
            setIsWorkspaceSwitching(false)
        }
    }, [getWorkspacesByUserIdApi.error])

    useEffect(() => {
        if (getOrganizationsByUserIdApi.data) {
            const formattedAssignedOrgs = getOrganizationsByUserIdApi.data.map((organization) => ({
                id: organization.organizationId,
                name: `${organization.user.name || organization.user.email}'s Organization`
            }))

            const sortedOrgs = [...formattedAssignedOrgs].sort((a, b) => a.name.localeCompare(b.name))
            // Only check workspace availability after a short delay to allow store updates to complete
            setTimeout(() => {
                if (user && user.activeOrganizationId && !sortedOrgs.find((item) => item.id === user.activeOrganizationId)) {
                    setActiveOrganizationId(undefined)
                    setShowWorkspaceUnavailableDialog(true)
                }
            }, 500)

            setAssignedOrganizations(sortedOrgs)

            getWorkspacesByUserIdApi.request(user.id)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getOrganizationsByUserIdApi.data])

    useEffect(() => {
        if (getOrganizationsByUserIdApi.error) {
            setIsOrganizationSwitching(false)
        }
    }, [getOrganizationsByUserIdApi.error])

    useEffect(() => {
        if (switchWorkspaceApi.data) {
            setIsWorkspaceSwitching(false)
            setIsOrganizationSwitching(false)
            store.dispatch(workspaceSwitchSuccess(switchWorkspaceApi.data))

            // get the current path and navigate to the same after refresh
            navigate('/', { replace: true })
            navigate(0)
        }
    }, [switchWorkspaceApi.data, navigate])

    useEffect(() => {
        if (switchWorkspaceApi.error) {
            setIsWorkspaceSwitching(false)
            setIsOrganizationSwitching(false)
        }
    }, [switchWorkspaceApi.error])

    useEffect(() => {
        setActiveOrganizationId(user.activeOrganizationId)
        setActiveWorkspaceId(user.activeWorkspaceId)
    }, [user])

    return (
        <>
            {isAuthenticated && user ? (
                <>
                    <StyledMenu anchorEl={orgAnchorEl} open={orgMenuOpen} onClose={handleOrgClose}>
                        {assignedOrganizations.map((org) => (
                            <MenuItem key={org.id} onClick={() => handleOrgSwitch(org.id)} selected={org.id === activeOrganizationId}>
                                <ListItemText>{org.name}</ListItemText>
                                {org.id === activeOrganizationId && (
                                    <ListItemIcon sx={{ minWidth: 'auto' }}>
                                        <Check />
                                    </ListItemIcon>
                                )}
                            </MenuItem>
                        ))}
                    </StyledMenu>
                    <StyledMenu anchorEl={workspaceAnchorEl} open={workspaceMenuOpen} onClose={handleWorkspaceClose}>
                        {assignedWorkspaces.map((workspace) => (
                            <MenuItem
                                key={workspace.id}
                                onClick={() => switchWorkspace(workspace.id)}
                                selected={workspace.id === activeWorkspaceId}
                            >
                                <ListItemText>{workspace.name}</ListItemText>
                                {workspace.id === activeWorkspaceId && (
                                    <ListItemIcon sx={{ minWidth: 'auto' }}>
                                        <Check />
                                    </ListItemIcon>
                                )}
                            </MenuItem>
                        ))}
                    </StyledMenu>
                    <Breadcrumbs aria-label='breadcrumb'>
                        <StyledBreadcrumb
                            isDarkMode={customization.isDarkMode}
                            label={assignedOrganizations.find((org) => org.id === activeOrganizationId)?.name || 'Organization'}
                            deleteIcon={<IconChevronDown size={16} />}
                            onDelete={handleOrgClick}
                            onClick={handleOrgClick}
                        />
                        <StyledBreadcrumb
                            isDarkMode={customization.isDarkMode}
                            label={assignedWorkspaces.find((ws) => ws.id === activeWorkspaceId)?.name || 'Workspace'}
                            deleteIcon={<IconChevronDown size={16} />}
                            onDelete={handleWorkspaceClick}
                            onClick={handleWorkspaceClick}
                        />
                    </Breadcrumbs>
                </>
            ) : null}
            <Dialog open={isOrganizationSwitching} PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none' } }}>
                <DialogContent>
                    <Stack spacing={2} alignItems='center'>
                        <CircularProgress />
                        <Typography variant='body1' style={{ color: 'white' }}>
                            Switching organization...
                        </Typography>
                    </Stack>
                </DialogContent>
            </Dialog>
            <Dialog open={isWorkspaceSwitching} PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none' } }}>
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
                        {assignedWorkspaces.length > 0 && !activeOrganizationId ? (
                            <>
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
                            </>
                        ) : (
                            <>
                                <Typography variant='body1'>
                                    Workspace is no longer available. Please select a different organization/workspace to continue.
                                </Typography>
                                <Select
                                    fullWidth
                                    value={activeOrganizationId || ''}
                                    onChange={(event) => {
                                        handleUnavailableOrgSwitch(event.target.value)
                                    }}
                                    displayEmpty
                                >
                                    <MenuItem disabled value=''>
                                        <em>Select Organization</em>
                                    </MenuItem>
                                    {assignedOrganizations.map((org, index) => (
                                        <MenuItem key={index} value={org.id}>
                                            {org.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {activeOrganizationId && assignedWorkspaces.length > 0 && (
                                    <Select
                                        fullWidth
                                        value={activeWorkspaceId || ''}
                                        onChange={(event) => {
                                            setShowWorkspaceUnavailableDialog(false)
                                            switchWorkspace(event.target.value)
                                        }}
                                        displayEmpty
                                        sx={{ mt: 2 }}
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
                                )}
                            </>
                        )}
                    </Stack>
                </DialogContent>
            </Dialog>
        </>
    )
}

OrgWorkspaceBreadcrumbs.propTypes = {}

export default OrgWorkspaceBreadcrumbs
