import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'

// Material
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Box,
    Typography,
    OutlinedInput,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    FormHelperText
} from '@mui/material'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'

// Icons
import { IconX } from '@tabler/icons-react'

// API
import userManagementApi from '@/custom/api/user-management'

// utils
import useNotifier from '@/utils/useNotifier'

// store
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

const statuses = [
    { label: 'Active', value: 'active' },
    { label: 'Invited', value: 'invited' },
    { label: 'Inactive', value: 'unverified' }
]

const AddEditUserDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [userName, setUserName] = useState('')
    const [userEmail, setUserEmail] = useState('')
    const [userPassword, setUserPassword] = useState('')
    const [userStatus, setUserStatus] = useState('active')
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            setUserName(dialogProps.data.name || '')
            setUserEmail(dialogProps.data.email || '')
            setUserStatus(dialogProps.data.status || 'active')
            setUserPassword('') // Don't pre-fill password for security
        }

        return () => {
            setUserName('')
            setUserEmail('')
            setUserPassword('')
            setUserStatus('active')
            setErrors({})
        }
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const validateForm = () => {
        const newErrors = {}

        if (!userName.trim()) {
            newErrors.name = 'Name is required'
        }

        if (!userEmail.trim()) {
            newErrors.email = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
            newErrors.email = 'Please enter a valid email address'
        }

        if (dialogProps.type === 'ADD' && !userPassword.trim()) {
            newErrors.password = 'Password is required'
        }

        if (userPassword && userPassword.length < 6) {
            newErrors.password = 'Password must be at least 6 characters long'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSave = async () => {
        if (!validateForm()) {
            return
        }

        setLoading(true)
        try {
            const userData = {
                name: userName.trim(),
                email: userEmail.trim(),
                status: userStatus
            }

            if (userPassword.trim()) {
                userData.password = userPassword
            }

            if (dialogProps.type === 'EDIT') {
                await userManagementApi.updateUser(dialogProps.data.id, userData)
                enqueueSnackbar({
                    message: 'User updated successfully',
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
            } else {
                await userManagementApi.createUser(userData)
                enqueueSnackbar({
                    message: 'User created successfully',
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
            }

            onConfirm()
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to ${dialogProps.type === 'EDIT' ? 'update' : 'create'} user: ${
                    error.response?.data?.message || error.message
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
            setLoading(false)
        }
    }

    const component = show ? (
        <Dialog
            open={show}
            fullWidth
            maxWidth='sm'
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <Typography variant='h4'>{dialogProps.title || (dialogProps.type === 'ADD' ? 'Add User' : 'Edit User')}</Typography>
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <FormControl fullWidth error={!!errors.name}>
                        <InputLabel>Name *</InputLabel>
                        <OutlinedInput
                            label='Name *'
                            type='text'
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            disabled={loading}
                        />
                        {errors.name && <FormHelperText>{errors.name}</FormHelperText>}
                    </FormControl>

                    <FormControl fullWidth error={!!errors.email}>
                        <InputLabel>Email *</InputLabel>
                        <OutlinedInput
                            label='Email *'
                            type='email'
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            disabled={loading || dialogProps.type === 'EDIT'}
                        />
                        {errors.email && <FormHelperText>{errors.email}</FormHelperText>}
                    </FormControl>

                    <FormControl fullWidth error={!!errors.password}>
                        <InputLabel>Password {dialogProps.type === 'ADD' ? '*' : '(leave blank to keep current)'}</InputLabel>
                        <OutlinedInput
                            label={`Password ${dialogProps.type === 'ADD' ? '*' : '(leave blank to keep current)'}`}
                            type='password'
                            value={userPassword}
                            onChange={(e) => setUserPassword(e.target.value)}
                            disabled={loading}
                        />
                        {errors.password && <FormHelperText>{errors.password}</FormHelperText>}
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select label='Status' value={userStatus} onChange={(e) => setUserStatus(e.target.value)} disabled={loading}>
                            {statuses.map((status) => (
                                <MenuItem key={status.value} value={status.value}>
                                    {status.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{dialogProps.cancelButtonName || 'Cancel'}</Button>
                <StyledButton disableElevation onClick={handleSave} variant='contained' disabled={loading}>
                    {loading ? 'Saving...' : dialogProps.confirmButtonName || 'Save'}
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AddEditUserDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default AddEditUserDialog
