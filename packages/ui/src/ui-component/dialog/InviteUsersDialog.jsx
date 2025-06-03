import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

// Material
import {
    Autocomplete,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Box,
    Chip,
    Typography,
    TextField,
    Stack,
    Tooltip,
    styled,
    Popper,
    CircularProgress
} from '@mui/material'
import { autocompleteClasses } from '@mui/material/Autocomplete'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// Icons
import { IconX, IconCircleCheck, IconUser } from '@tabler/icons-react'

// API
import accountApi from '@/api/account.api'
import roleApi from '@/api/role'
import userApi from '@/api/user'
import workspaceApi from '@/api/workspace'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'

// store
import {
    enqueueSnackbar as enqueueSnackbarAction,
    closeSnackbar as closeSnackbarAction,
    HIDE_CANVAS_DIALOG,
    SHOW_CANVAS_DIALOG
} from '@/store/actions'

const StyledChip = styled(Chip)(({ theme, chiptype }) => {
    let backgroundColor, color
    switch (chiptype) {
        case 'new':
            backgroundColor = theme.palette.success.light
            color = theme.palette.success.contrastText
            break
        case 'existing':
            backgroundColor = theme.palette.primary.main
            color = theme.palette.primary.contrastText
            break
        case 'already-in-workspace':
            backgroundColor = theme.palette.grey[300]
            color = theme.palette.text.primary
            break
        default:
            backgroundColor = theme.palette.primary.main
            color = theme.palette.primary.contrastText
    }
    return {
        backgroundColor,
        color,
        '& .MuiChip-deleteIcon': {
            color
        }
    }
})

const StyledPopper = styled(Popper)({
    boxShadow: '0px 8px 10px -5px rgb(0 0 0 / 20%), 0px 16px 24px 2px rgb(0 0 0 / 14%), 0px 6px 30px 5px rgb(0 0 0 / 12%)',
    borderRadius: '10px',
    [`& .${autocompleteClasses.listbox}`]: {
        boxSizing: 'border-box',
        '& ul': {
            padding: 10,
            margin: 10
        }
    }
})

const InviteUsersDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const currentUser = useSelector((state) => state.auth.user)

    const [searchString, setSearchString] = useState('')
    const [workspaces, setWorkspaces] = useState([])
    const [selectedWorkspace, setSelectedWorkspace] = useState()
    const [userSearchResults, setUserSearchResults] = useState([])
    const [orgUsers, setOrgUsers] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const [selectedUsers, setSelectedUsers] = useState([])
    const [availableRoles, setAvailableRoles] = useState([])
    const [selectedRole, setSelectedRole] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const getAllRolesApi = useApi(roleApi.getAllRolesByOrganizationId)
    const getAllWorkspacesByOrganizationIdApi = useApi(workspaceApi.getAllWorkspacesByOrganizationId)
    const getWorkspacesByUserIdApi = useApi(userApi.getWorkspacesByUserId)

    useEffect(() => {
        if (getAllWorkspacesByOrganizationIdApi.data) {
            const workspaces = getAllWorkspacesByOrganizationIdApi.data.map((workspace) => ({
                id: workspace.id,
                label: workspace.name,
                name: workspace.name,
                description: workspace.description
            }))
            setWorkspaces(workspaces)
            if (dialogProps.type === 'EDIT' && dialogProps.data && dialogProps.data.isWorkspaceUser) {
                // when clicking on edit user in users page
                const userActiveWorkspace = workspaces.find(
                    (workspace) => workspace.id === dialogProps.data.activeWorkspaceId || workspace.id === dialogProps.data.workspaceId
                )
                setSelectedWorkspace(userActiveWorkspace)
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllWorkspacesByOrganizationIdApi.data])

    useEffect(() => {
        if (getAllRolesApi.data) {
            const roles = getAllRolesApi.data.map((role) => ({
                id: role.id,
                name: role.name,
                label: role.name,
                description: role.description
            }))
            setAvailableRoles(roles)
            if (
                dialogProps.type === 'EDIT' &&
                dialogProps.data &&
                Array.isArray(dialogProps.data.assignedRoles) &&
                dialogProps.data.assignedRoles.length > 0
            ) {
                const userActiveRole = roles.find((role) => role.name === dialogProps.data.assignedRoles[0].role)
                if (userActiveRole) setSelectedRole(userActiveRole)
            }
            if (dialogProps.type === 'EDIT' && dialogProps.data && dialogProps.data.role && dialogProps.data.role.name) {
                const userActiveRole = roles.find((role) => role.name === dialogProps.data.role.name)
                if (userActiveRole) setSelectedRole(userActiveRole)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllRolesApi.data])

    useEffect(() => {
        if (getWorkspacesByUserIdApi.data) {
            const data = getWorkspacesByUserIdApi.data[0]
            const selectedRole = {
                id: data.role.id,
                label: data.role.name,
                name: data.role.name,
                description: data.role.description
            }
            const selectedWorkspace = {
                id: data.workspace.id,
                label: data.workspace.name,
                name: data.workspace.name,
                description: data.workspace.description
            }
            setSelectedRole(selectedRole)
            setSelectedWorkspace(selectedWorkspace)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getWorkspacesByUserIdApi.data])

    useEffect(() => {
        getAllRolesApi.request(currentUser.activeOrganizationId)
        getAllWorkspacesByOrganizationIdApi.request(currentUser.activeOrganizationId)
        setSearchString('')
        setUserSearchResults([])
        setSelectedUsers([])
        fetchInitialData()
        if (dialogProps.type === 'ADD' && dialogProps.data) {
            // when clicking on add user in workspace page
            const workspace = dialogProps.data
            setSelectedWorkspace({
                id: workspace.id,
                label: workspace.name,
                name: workspace.name,
                description: workspace.description
            })
        } else if (dialogProps.type === 'ADD' && !dialogProps.data) {
            // when clicking on add user in users page
            setSelectedWorkspace(null)
        } else if (dialogProps.type === 'EDIT' && dialogProps.data && !dialogProps.data.isWorkspaceUser) {
            getWorkspacesByUserIdApi.request(dialogProps.data.userId)
        }
        return () => {
            setSearchString('')
            setAllUsers([])
            setOrgUsers([])
            setUserSearchResults([])
            setSelectedUsers([])
            setWorkspaces([])
            setSelectedRole(null)
            setSelectedWorkspace(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (allUsers.length > 0) {
            if (dialogProps.type === 'EDIT' && dialogProps.data) {
                const selectedUser = allUsers.find((item) => item.userId === dialogProps.data.userId)
                const selectedUserObj = {
                    ...selectedUser,
                    isNewUser: false,
                    alreadyInWorkspace: true
                }
                // when clicking on edit user in users page
                handleChange(null, [selectedUserObj])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allUsers])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const fetchInitialData = async () => {
        try {
            const response = await userApi.getAllUsersByOrganizationId(currentUser.activeOrganizationId)
            if (response.data) {
                let existingUserIds = []

                if (dialogProps.data && dialogProps.type === 'ADD') {
                    // If we're in workspace context (WorkspaceUsers.jsx)
                    // Get existing workspace users
                    const workspaceUsers = await userApi.getAllUsersByWorkspaceId(dialogProps.data.id)
                    existingUserIds = workspaceUsers.data.map((user) => user.userId)
                    setOrgUsers(workspaceUsers.data)
                } else if (!dialogProps.data && dialogProps.type === 'ADD') {
                    // If we're in organization context (index.jsx)
                    // The existing users are already in the response.data
                    existingUserIds = response.data.filter((user) => user.status.toLowerCase() !== 'invited').map((user) => user.userId)
                    setOrgUsers(response.data)
                }

                // Filter out:
                // 1. Current user
                // 2. Organization owners
                // 3. Users already in the workspace (if in workspace context)
                // 4. Active users in the organization (if in organization context)
                const filteredUsers = response.data.filter(
                    (user) => user.userId !== currentUser.id && !user.isOrgOwner && !existingUserIds.includes(user.userId)
                )

                setUserSearchResults(() => filteredUsers)
                setAllUsers(() => filteredUsers) // Set original list only once
            }
        } catch (error) {
            console.error('Error fetching initial user data:', error)
        }
    }

    const saveInvite = async () => {
        if (selectedUsers.length) {
            const existingEmails = []
            for (const orgUser of orgUsers) {
                if (selectedUsers.some((user) => user.email === orgUser.user.email)) {
                    existingEmails.push(orgUser.user.email)
                }
            }
            if (existingEmails.length > 0) {
                enqueueSnackbar({
                    message: `The following users are already in the workspace or organization: ${existingEmails.join(', ')}`,
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
        }
        setIsSaving(true)
        try {
            const responses = await Promise.all(
                selectedUsers.map(async (item) => {
                    const saveObj = item.isNewUser
                        ? {
                              user: {
                                  email: item.email,
                                  createdBy: currentUser.id
                              },
                              workspace: {
                                  id: selectedWorkspace.id
                              },
                              role: {
                                  id: selectedRole.id
                              }
                          }
                        : {
                              user: {
                                  email: item.user.email,
                                  createdBy: currentUser.id
                              },
                              workspace: {
                                  id: selectedWorkspace.id
                              },
                              role: {
                                  id: selectedRole.id
                              }
                          }

                    const response = await accountApi.inviteAccount(saveObj)
                    return response.data
                })
            )
            if (responses.length > 0) {
                enqueueSnackbar({
                    message: 'Users invited to workspace',
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
                onConfirm() // Pass the first ID or modify as needed
            } else {
                throw new Error('No data received from the server')
            }
        } catch (error) {
            console.error('Error in saveInvite:', error)
            enqueueSnackbar({
                message: `Failed to invite users to workspace: ${error.response?.data?.message || error.message || 'Unknown error'}`,
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
            setIsSaving(false)
        }
    }

    const validateEmail = (email) => {
        return email.match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        )
    }

    const handleChange = (event, newValue) => {
        const updatedUsers = newValue
            .filter((item) => {
                if (item.isNewUser) {
                    // For new invites, validate the email
                    return validateEmail(item.email)
                }
                return true // Keep all existing users
            })
            .map((item) => {
                if (item.isNewUser) {
                    // This is a new invite
                    return {
                        email: item.email,
                        isNewUser: true,
                        alreadyInWorkspace: false
                    }
                } else {
                    const existingUser =
                        userSearchResults.length > 0
                            ? userSearchResults.find((result) => result.user.email === item.user.email)
                            : selectedUsers.find((result) => result.user.email === item.user.email)
                    return {
                        ...existingUser,
                        isNewUser: false,
                        alreadyInWorkspace: selectedWorkspace
                            ? existingUser &&
                              existingUser.workspaceNames &&
                              existingUser.workspaceNames.some((ws) => ws.id === selectedWorkspace.id)
                            : false
                    }
                }
            })

        setSelectedUsers(updatedUsers)

        // If any invalid emails were filtered out, show a notification
        if (updatedUsers.length < newValue.length) {
            enqueueSnackbar({
                message: 'One or more invalid emails were removed.',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'warning',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    const handleInputChange = (event, newInputValue) => {
        setSearchString(newInputValue)
        const searchTerm = newInputValue.toLowerCase()
        const filteredUsers = allUsers.filter(
            (item) => item.user.name.toLowerCase().includes(searchTerm) || item.user.email.toLowerCase().includes(searchTerm)
        )
        setUserSearchResults(filteredUsers)
        setAllUsers((prevResults) => {
            const newResults = [...prevResults]
            filteredUsers.forEach((item) => {
                if (!newResults.some((result) => result.user.id === item.user.id)) {
                    newResults.push(item)
                }
            })
            return newResults
        })
    }

    const userSearchFilterOptions = (options, { inputValue }) => {
        const filteredOptions = options.filter((option) => option !== null && option !== undefined) ?? []

        // First filter out already selected users
        const selectedUserEmails = selectedUsers.filter((user) => !user.isNewUser && user.user).map((user) => user.user.email)

        const unselectedOptions = filteredOptions.filter((option) => !option.user || !selectedUserEmails.includes(option.user.email))

        const filterByNameOrEmail = unselectedOptions.filter(
            (option) =>
                (option.user && option.user.name && option.user.name.toLowerCase().includes(inputValue.toLowerCase())) ||
                (option.user && option.user.email && option.user.email.toLowerCase().includes(inputValue.toLowerCase()))
        )

        // Early email detection regex
        const partialEmailRegex = /^[^\s@]+@?[^\s@]*$/

        if (filterByNameOrEmail.length === 0 && partialEmailRegex.test(inputValue)) {
            // If it looks like an email (even partially), show the invite option
            const inviteEmail = inputValue.includes('@') ? inputValue : `${inputValue}@`
            // Check if this email is already in the selected users list
            const isAlreadySelected = selectedUsers.some(
                (user) =>
                    (user.isNewUser && user.email === inviteEmail) || (!user.isNewUser && user.user && user.user.email === inviteEmail)
            )

            if (!isAlreadySelected) {
                return [{ name: `Invite ${inviteEmail}`, email: inviteEmail, isNewUser: true }]
            }
        }

        if (filterByNameOrEmail.length === 0) {
            return [{ name: 'No results found', email: '', isNoResult: true, disabled: true }]
        }

        return filterByNameOrEmail
    }

    const renderUserSearchInput = (params) => (
        <TextField {...params} variant='outlined' placeholder={selectedUsers.length > 0 ? '' : 'Invite users by name or email'} />
    )

    const renderUserSearchOptions = (props, option) => {
        // Custom logic to determine if an option is selected, since state.selected seems unreliable
        const isOptionSelected = option.isNewUser
            ? selectedUsers.some((user) => user.isNewUser && user.email === option.email)
            : selectedUsers.some((user) => !user.isNewUser && user.user && user.user.email === option.user?.email)

        return (
            <li {...props} {...(option.disabled ? { style: { pointerEvents: 'none', opacity: 0.5 } } : {})}>
                {option.isNoResult ? (
                    <Box
                        sx={{
                            width: '100%',
                            px: 1,
                            py: 0.5
                        }}
                    >
                        <Typography color='text.secondary'>No results found</Typography>
                    </Box>
                ) : option.isNewUser ? (
                    <Box
                        sx={{
                            width: '100%',
                            px: 1,
                            py: 0.5
                        }}
                    >
                        <Typography variant='h5' color='primary'>
                            {option.name}
                        </Typography>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 1,
                            py: 0.5
                        }}
                    >
                        <Stack flexDirection='column'>
                            <Typography variant='h5'>{option.user.name}</Typography>
                            <Typography>{option.user.email}</Typography>
                        </Stack>
                        {isOptionSelected ? <IconCircleCheck /> : null}
                    </Box>
                )}
            </li>
        )
    }

    const renderSelectedUsersTags = (tagValue, getTagProps) => {
        return selectedUsers.map((option, index) => {
            const chipProps = getTagProps({ index })
            let chipType = option.isNewUser ? 'new' : 'existing'
            if (option.alreadyInWorkspace) {
                chipType = 'already-in-workspace'
            }
            const ChipComponent = option.isNewUser ? (
                <StyledChip label={option.name || option.email} {...chipProps} chiptype={chipType} />
            ) : (
                <StyledChip label={option.user.name || option.user.email} {...chipProps} chiptype={chipType} />
            )

            const tooltipTitle = option.alreadyInWorkspace
                ? `${option.user.name || option.user.email} is already a member of this workspace and won't be invited again.`
                : option.isNewUser
                ? 'An invitation will be sent to this email address'
                : ''

            return tooltipTitle ? (
                <Tooltip key={chipProps.key} title={tooltipTitle} arrow>
                    {ChipComponent}
                </Tooltip>
            ) : (
                ChipComponent
            )
        })
    }

    const handleWorkspaceChange = (event, newWorkspace) => {
        setSelectedWorkspace(newWorkspace)
        setSelectedUsers((prevUsers) =>
            prevUsers.map((user) => ({
                ...user,
                alreadyInWorkspace: newWorkspace
                    ? user.workspaceNames && newWorkspace && user.workspaceNames.some((ws) => ws.id === newWorkspace.id)
                    : false
            }))
        )
    }

    const handleRoleChange = (event, newRole) => {
        setSelectedRole(newRole)
    }

    const getWorkspaceValue = () => {
        if (dialogProps.data) {
            return selectedWorkspace || {}
        }
        return selectedWorkspace || null
    }

    const getRoleValue = () => {
        if (dialogProps.data && dialogProps.type === 'ADD') {
            return selectedRole || {}
        }
        return selectedRole || null
    }

    const checkDisabled = () => {
        if (isSaving || selectedUsers.length === 0 || !selectedWorkspace || !selectedRole) {
            return true
        }
        return false
    }

    const checkWorkspaceDisabled = () => {
        if (dialogProps.data && dialogProps.type === 'ADD') {
            return Boolean(selectedWorkspace)
        } else if (dialogProps.data && dialogProps.type === 'EDIT') {
            return dialogProps.disableWorkspaceSelection
        }
        return false
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='md'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <IconUser style={{ marginRight: '10px' }} />
                    Invite Users
                </div>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                    <Typography>
                        Select Users<span style={{ color: 'red' }}>&nbsp;*</span>
                    </Typography>
                    <Autocomplete
                        multiple
                        options={allUsers}
                        getOptionKey={(option) => option.userId}
                        getOptionLabel={(option) => option.email || ''}
                        filterOptions={userSearchFilterOptions}
                        onChange={handleChange}
                        inputValue={searchString}
                        onInputChange={handleInputChange}
                        isOptionEqualToValue={(option, value) => {
                            // Compare based on user.email for existing users or email for new users
                            if (option.isNewUser && value.isNewUser) {
                                return option.email === value.email
                            } else if (!option.isNewUser && !value.isNewUser) {
                                return option.user?.email === value.user?.email
                            }
                            return false
                        }}
                        renderInput={renderUserSearchInput}
                        renderOption={renderUserSearchOptions}
                        renderTags={renderSelectedUsersTags}
                        sx={{ mt: 1 }}
                        value={selectedUsers}
                        PopperComponent={StyledPopper}
                    />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box sx={{ gridColumn: 'span 1' }}>
                        <Typography>
                            Workspace<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <Autocomplete
                            disabled={checkWorkspaceDisabled()}
                            getOptionLabel={(option) => option.label || ''}
                            onChange={handleWorkspaceChange}
                            options={workspaces}
                            renderInput={(params) => <TextField {...params} variant='outlined' placeholder='Select Workspace' />}
                            sx={{ mt: 0.5 }}
                            value={getWorkspaceValue()}
                            PopperComponent={StyledPopper}
                        />
                    </Box>
                    <Box sx={{ gridColumn: 'span 1' }}>
                        <Typography>
                            Role to Assign<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <Autocomplete
                            getOptionLabel={(option) => option.label || ''}
                            onChange={handleRoleChange}
                            options={availableRoles}
                            renderInput={(params) => <TextField {...params} variant='outlined' placeholder='Select Role' />}
                            sx={{ mt: 0.5 }}
                            value={getRoleValue()}
                            PopperComponent={StyledPopper}
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => onCancel()} disabled={isSaving}>
                    {dialogProps.cancelButtonName}
                </Button>
                <StyledButton
                    disabled={checkDisabled()}
                    variant='contained'
                    onClick={saveInvite}
                    startIcon={isSaving ? <CircularProgress size={20} color='inherit' /> : null}
                >
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

InviteUsersDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default InviteUsersDialog
