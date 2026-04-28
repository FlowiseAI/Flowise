import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

// Material
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Box,
    Typography,
    Autocomplete,
    TextField,
    styled,
    Popper
} from '@mui/material'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// Icons
import { IconX, IconUser } from '@tabler/icons-react'

// API
import roleApi from '@/api/role'
import workspaceApi from '@/api/workspace'

// utils
import useNotifier from '@/utils/useNotifier'

// store
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import useApi from '@/hooks/useApi'
import { autocompleteClasses } from '@mui/material/Autocomplete'

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

const EditWorkspaceUserRoleDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')
    const currentUser = useSelector((state) => state.auth.user)

    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [userEmail, setUserEmail] = useState('')
    const [user, setUser] = useState({})

    const [availableRoles, setAvailableRoles] = useState([])
    const [selectedRole, setSelectedRole] = useState('')
    const getAllRolesApi = useApi(roleApi.getAllRolesByOrganizationId)

    useEffect(() => {
        if (getAllRolesApi.data) {
            const roles = getAllRolesApi.data.map((role) => ({
                id: role.id,
                name: role.name,
                label: role.name,
                description: role.description
            }))
            setAvailableRoles(roles)
            if (dialogProps.type === 'EDIT' && dialogProps.data && dialogProps.data.role && dialogProps.data.role.name) {
                const userActiveRole = roles.find((role) => role.name === dialogProps.data.role.name)
                if (userActiveRole) setSelectedRole(userActiveRole)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllRolesApi.data])

    useEffect(() => {
        if (dialogProps.data) {
            getAllRolesApi.request(currentUser.activeOrganizationId)
            setUser(dialogProps.data.user)
            setUserEmail(dialogProps.data.user.email)
        }

        return () => {
            setUserEmail('')
            setUser({})
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const updateUser = async () => {
        try {
            const saveObj = {
                userId: user.id,
                workspaceId: dialogProps.data.workspaceId,
                organizationId: currentUser.activeOrganizationId,
                roleId: selectedRole.id,
                updatedBy: currentUser.id
            }

            const saveResp = await workspaceApi.updateWorkspaceUserRole(saveObj)
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'WorkspaceUser Details Updated',
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
                onConfirm(saveResp.data.id)
            }
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to update WorkspaceUser: ${
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

    const handleRoleChange = (event, newRole) => {
        setSelectedRole(newRole)
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='sm'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <IconUser style={{ marginRight: '10px' }} />
                    {'Change Workspace Role - '} {userEmail || ''} {user.name ? `(${user.name})` : ''}
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>
                            New Role to Assign<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <div style={{ flexGrow: 1 }}></div>
                    </div>
                    <Autocomplete
                        size='small'
                        sx={{ mt: 1 }}
                        onChange={handleRoleChange}
                        getOptionLabel={(option) => option.label || ''}
                        options={availableRoles}
                        renderInput={(params) => <TextField {...params} variant='outlined' placeholder='Select Role' />}
                        value={selectedRole}
                        PopperComponent={StyledPopper}
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <StyledButton variant='contained' onClick={() => updateUser()} id='btn_confirmEditUser'>
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

EditWorkspaceUserRoleDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default EditWorkspaceUserRoleDialog
