import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

// material-ui
import { Alert, Box, Button, OutlinedInput, Stack, Typography, useTheme } from '@mui/material'

// project imports
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { StyledButton } from '@/ui-component/button/StyledButton'
import MainCard from '@/ui-component/cards/MainCard'
import { Input } from '@/ui-component/input/Input'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'

// API
import accountApi from '@/api/account.api'

// utils
import useNotifier from '@/utils/useNotifier'
import { validatePassword } from '@/utils/validation'

// Hooks
import { useError } from '@/store/context/ErrorContext'

// Icons
import { IconExclamationCircle, IconX } from '@tabler/icons-react'

// ==============================|| ResetPasswordPage ||============================== //

const ResetPasswordPage = () => {
    const theme = useTheme()
    useNotifier()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const emailInput = {
        label: 'Email',
        name: 'email',
        type: 'email',
        placeholder: 'user@company.com'
    }

    const passwordInput = {
        label: 'Password',
        name: 'password',
        type: 'password',
        placeholder: '********'
    }

    const confirmPasswordInput = {
        label: 'Confirm Password',
        name: 'confirmPassword',
        type: 'password',
        placeholder: '********'
    }

    const resetPasswordInput = {
        label: 'Reset Token',
        name: 'resetToken',
        type: 'text'
    }

    const [params] = useSearchParams()
    const token = params.get('token')

    const [emailVal, setEmailVal] = useState('')
    const [newPasswordVal, setNewPasswordVal] = useState('')
    const [confirmPasswordVal, setConfirmPasswordVal] = useState('')
    const [tokenVal, setTokenVal] = useState(token ?? '')

    const [loading, setLoading] = useState(false)
    const [authErrors, setAuthErrors] = useState([])

    const { authRateLimitError, setAuthRateLimitError } = useError()

    const goLogin = () => {
        navigate('/signin', { replace: true })
    }

    const validateAndSubmit = async (event) => {
        event.preventDefault()
        const validationErrors = []
        setAuthErrors([])
        setAuthRateLimitError(null)
        if (!tokenVal) {
            validationErrors.push('Token cannot be left blank!')
        }
        if (newPasswordVal !== confirmPasswordVal) {
            validationErrors.push('New Password and Confirm Password do not match.')
        }
        const passwordErrors = validatePassword(newPasswordVal)
        if (passwordErrors.length > 0) {
            validationErrors.push(...passwordErrors)
        }
        if (validationErrors.length > 0) {
            setAuthErrors(validationErrors)
            return
        }
        const body = {
            user: {
                email: emailVal,
                tempToken: tokenVal,
                password: newPasswordVal
            }
        }
        setLoading(true)
        try {
            const updateResponse = await accountApi.resetPassword(body)
            setAuthErrors([])
            setLoading(false)
            if (updateResponse.data) {
                enqueueSnackbar({
                    message: 'Password reset successful',
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
                setEmailVal('')
                setTokenVal('')
                setNewPasswordVal('')
                setConfirmPasswordVal('')
                goLogin()
            }
        } catch (error) {
            setLoading(false)
            setAuthErrors([typeof error.response.data === 'object' ? error.response.data.message : error.response.data])
            enqueueSnackbar({
                message: `Failed to reset password!`,
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

    useEffect(() => {
        setAuthRateLimitError(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <MainCard>
                <Stack flexDirection='column' sx={{ maxWidth: '480px', gap: 3 }}>
                    {authErrors && authErrors.length > 0 && (
                        <Alert icon={<IconExclamationCircle />} variant='filled' severity='error'>
                            <ul style={{ margin: 0 }}>
                                {authErrors.map((msg, key) => (
                                    <li key={key}>{msg}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}
                    {authRateLimitError && (
                        <Alert icon={<IconExclamationCircle />} variant='filled' severity='error'>
                            {authRateLimitError}
                        </Alert>
                    )}
                    <Stack sx={{ gap: 1 }}>
                        <Typography variant='h1'>Reset Password</Typography>
                        <Typography variant='body2' sx={{ color: theme.palette.grey[600] }}>
                            <Link style={{ color: theme.palette.primary.main }} to='/signin'>
                                Back to Login
                            </Link>
                            .
                        </Typography>
                    </Stack>
                    <form onSubmit={validateAndSubmit}>
                        <Stack sx={{ width: '100%', flexDirection: 'column', alignItems: 'left', justifyContent: 'center', gap: 2 }}>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Email<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <Typography align='left'></Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={emailInput}
                                    onChange={(newValue) => setEmailVal(newValue)}
                                    value={emailVal}
                                    showDialog={false}
                                />
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Reset Token<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <OutlinedInput
                                    fullWidth
                                    type='string'
                                    placeholder='Paste in the reset token.'
                                    multiline={true}
                                    rows={3}
                                    inputParam={resetPasswordInput}
                                    onChange={(e) => setTokenVal(e.target.value)}
                                    value={tokenVal}
                                    sx={{ mt: '8px' }}
                                />
                                <Typography variant='caption'>
                                    <i>Please copy the token you received in your email.</i>
                                </Typography>
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        New Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <Typography align='left'></Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={passwordInput}
                                    onChange={(newValue) => setNewPasswordVal(newValue)}
                                    value={newPasswordVal}
                                    showDialog={false}
                                />
                                <Typography variant='caption'>
                                    <i>
                                        Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase
                                        letter, one digit, and one special character.
                                    </i>
                                </Typography>
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Confirm Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={confirmPasswordInput}
                                    onChange={(newValue) => setConfirmPasswordVal(newValue)}
                                    value={confirmPasswordVal}
                                    showDialog={false}
                                />
                                <Typography variant='caption'>
                                    <i>Confirm your new password. Must match the password typed above.</i>
                                </Typography>
                            </Box>

                            <StyledButton variant='contained' style={{ borderRadius: 12, height: 40, marginRight: 5 }} type='submit'>
                                Update Password
                            </StyledButton>
                        </Stack>
                    </form>
                </Stack>
            </MainCard>
            {loading && <BackdropLoader open={loading} />}
        </>
    )
}

export default ResetPasswordPage
