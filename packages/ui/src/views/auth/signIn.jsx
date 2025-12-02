import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// material-ui
import { Stack, useTheme, Typography, Box, Alert, Button, Divider, Icon } from '@mui/material'
import { IconExclamationCircle } from '@tabler/icons-react'
import { LoadingButton } from '@mui/lab'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { Input } from '@/ui-component/input/Input'

// Hooks
import useApi from '@/hooks/useApi'
import { useConfig } from '@/store/context/ConfigContext'
import { useError } from '@/store/context/ErrorContext'

// API
import authApi from '@/api/auth'
import accountApi from '@/api/account.api'
import loginMethodApi from '@/api/loginmethod'
import ssoApi from '@/api/sso'

// utils
import useNotifier from '@/utils/useNotifier'

// store
import { loginSuccess, logoutSuccess } from '@/store/reducers/authSlice'
import { store } from '@/store'

// icons
import AzureSSOLoginIcon from '@/assets/images/microsoft-azure.svg'
import GoogleSSOLoginIcon from '@/assets/images/google.svg'
import Auth0SSOLoginIcon from '@/assets/images/auth0.svg'
import GithubSSOLoginIcon from '@/assets/images/github.svg'

// ==============================|| SignInPage ||============================== //

const SignInPage = () => {
    const theme = useTheme()
    useSelector((state) => state.customization)
    useNotifier()
    const { isEnterpriseLicensed, isCloud, isOpenSource } = useConfig()

    const usernameInput = {
        label: 'Username',
        name: 'username',
        type: 'email',
        placeholder: 'user@company.com'
    }
    const passwordInput = {
        label: 'Password',
        name: 'password',
        type: 'password',
        placeholder: '********'
    }
    const [usernameVal, setUsernameVal] = useState('')
    const [passwordVal, setPasswordVal] = useState('')
    const [configuredSsoProviders, setConfiguredSsoProviders] = useState([])
    const [authError, setAuthError] = useState(undefined)
    const [loading, setLoading] = useState(false)
    const [showResendButton, setShowResendButton] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const { authRateLimitError, setAuthRateLimitError } = useError()

    const loginApi = useApi(authApi.login)
    const ssoLoginApi = useApi(ssoApi.ssoLogin)
    const getDefaultProvidersApi = useApi(loginMethodApi.getDefaultLoginMethods)
    const navigate = useNavigate()
    const location = useLocation()
    const resendVerificationApi = useApi(accountApi.resendVerificationEmail)

    const doLogin = (event) => {
        event.preventDefault()
        setAuthRateLimitError(null)
        setLoading(true)
        const body = {
            email: usernameVal,
            password: passwordVal
        }
        loginApi.request(body)
    }

    useEffect(() => {
        if (loginApi.error) {
            setLoading(false)
            if (loginApi.error.response.status === 401 && loginApi.error.response.data.redirectUrl) {
                window.location.href = loginApi.error.response.data.data.redirectUrl
            } else {
                setAuthError(loginApi.error.response.data.message)
            }
        }
    }, [loginApi.error])

    useEffect(() => {
        store.dispatch(logoutSuccess())
        setAuthRateLimitError(null)
        if (!isOpenSource) {
            getDefaultProvidersApi.request()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setAuthRateLimitError, isOpenSource])

    useEffect(() => {
        // Parse the "user" query parameter from the URL
        const queryParams = new URLSearchParams(location.search)
        const errorData = queryParams.get('error')
        if (!errorData) return
        const parsedErrorData = JSON.parse(decodeURIComponent(errorData))
        setAuthError(parsedErrorData.message)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search])

    useEffect(() => {
        if (loginApi.data) {
            setLoading(false)
            store.dispatch(loginSuccess(loginApi.data))
            navigate(location.state?.path || '/')
            //navigate(0)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loginApi.data])

    useEffect(() => {
        if (ssoLoginApi.data) {
            store.dispatch(loginSuccess(ssoLoginApi.data))
            navigate(location.state?.path || '/')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ssoLoginApi.data])

    useEffect(() => {
        if (ssoLoginApi.error) {
            if (ssoLoginApi.error?.response?.status === 401 && ssoLoginApi.error?.response?.data.redirectUrl) {
                window.location.href = ssoLoginApi.error.response.data.redirectUrl
            } else {
                setAuthError(ssoLoginApi.error.message)
            }
        }
    }, [ssoLoginApi.error])

    useEffect(() => {
        if (getDefaultProvidersApi.data && getDefaultProvidersApi.data.providers) {
            //data is an array of objects, store only the provider attribute
            setConfiguredSsoProviders(getDefaultProvidersApi.data.providers.map((provider) => provider))
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getDefaultProvidersApi.data])

    useEffect(() => {
        if (authError === 'User Email Unverified') {
            setShowResendButton(true)
        } else {
            setShowResendButton(false)
        }
    }, [authError])

    const signInWithSSO = (ssoProvider) => {
        window.location.href = `/api/v1/${ssoProvider}/login`
    }

    const handleResendVerification = async () => {
        try {
            await resendVerificationApi.request({ email: usernameVal })
            setAuthError(undefined)
            setSuccessMessage('Verification email has been sent successfully.')
            setShowResendButton(false)
        } catch (error) {
            setAuthError(error.response?.data?.message || 'Failed to send verification email.')
        }
    }

    return (
        <>
            <MainCard maxWidth='sm'>
                <Stack flexDirection='column' sx={{ width: '480px', gap: 3 }}>
                    {successMessage && (
                        <Alert variant='filled' severity='success' onClose={() => setSuccessMessage('')}>
                            {successMessage}
                        </Alert>
                    )}
                    {authRateLimitError && (
                        <Alert icon={<IconExclamationCircle />} variant='filled' severity='error'>
                            {authRateLimitError}
                        </Alert>
                    )}
                    {authError && (
                        <Alert icon={<IconExclamationCircle />} variant='filled' severity='error'>
                            {authError}
                        </Alert>
                    )}
                    {showResendButton && (
                        <Stack sx={{ gap: 1 }}>
                            <Button variant='text' onClick={handleResendVerification}>
                                Resend Verification Email
                            </Button>
                        </Stack>
                    )}
                    <Stack sx={{ gap: 1 }}>
                        <Typography variant='h1'>Sign In</Typography>
                        {isCloud && (
                            <Typography variant='body2' sx={{ color: theme.palette.grey[600] }}>
                                Don&apos;t have an account?{' '}
                                <Link style={{ color: `${theme.palette.primary.main}` }} to='/register'>
                                    Sign up for free
                                </Link>
                                .
                            </Typography>
                        )}
                        {isEnterpriseLicensed && (
                            <Typography variant='body2' sx={{ color: theme.palette.grey[600] }}>
                                Have an invite code?{' '}
                                <Link style={{ color: `${theme.palette.primary.main}` }} to='/register'>
                                    Sign up for an account
                                </Link>
                                .
                            </Typography>
                        )}
                    </Stack>
                    <form onSubmit={doLogin}>
                        <Stack sx={{ width: '100%', flexDirection: 'column', alignItems: 'left', justifyContent: 'center', gap: 2 }}>
                            <Box sx={{ p: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Email<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={usernameInput}
                                    onChange={(newValue) => setUsernameVal(newValue)}
                                    value={usernameVal}
                                    showDialog={false}
                                />
                            </Box>
                            <Box sx={{ p: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input inputParam={passwordInput} onChange={(newValue) => setPasswordVal(newValue)} value={passwordVal} />
                                <Typography variant='body2' sx={{ color: theme.palette.grey[600], mt: 1, textAlign: 'right' }}>
                                    <Link style={{ color: theme.palette.primary.main }} to='/forgot-password'>
                                        Forgot password?
                                    </Link>
                                </Typography>
                            </Box>
                            <LoadingButton
                                loading={loading}
                                variant='contained'
                                style={{ borderRadius: 12, height: 40, marginRight: 5 }}
                                type='submit'
                            >
                                Login
                            </LoadingButton>
                            {configuredSsoProviders && configuredSsoProviders.length > 0 && <Divider sx={{ width: '100%' }}>OR</Divider>}
                            {configuredSsoProviders &&
                                configuredSsoProviders.map(
                                    (ssoProvider) =>
                                        //https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-branding-in-apps
                                        ssoProvider === 'azure' && (
                                            <Button
                                                key={ssoProvider}
                                                variant='outlined'
                                                style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                                                onClick={() => signInWithSSO(ssoProvider)}
                                                startIcon={
                                                    <Icon>
                                                        <img src={AzureSSOLoginIcon} alt={'MicrosoftSSO'} width={20} height={20} />
                                                    </Icon>
                                                }
                                            >
                                                Sign In With Microsoft
                                            </Button>
                                        )
                                )}
                            {configuredSsoProviders &&
                                configuredSsoProviders.map(
                                    (ssoProvider) =>
                                        ssoProvider === 'google' && (
                                            <Button
                                                key={ssoProvider}
                                                variant='outlined'
                                                style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                                                onClick={() => signInWithSSO(ssoProvider)}
                                                startIcon={
                                                    <Icon>
                                                        <img src={GoogleSSOLoginIcon} alt={'GoogleSSO'} width={20} height={20} />
                                                    </Icon>
                                                }
                                            >
                                                Sign In With Google
                                            </Button>
                                        )
                                )}
                            {configuredSsoProviders &&
                                configuredSsoProviders.map(
                                    (ssoProvider) =>
                                        ssoProvider === 'auth0' && (
                                            <Button
                                                key={ssoProvider}
                                                variant='outlined'
                                                style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                                                onClick={() => signInWithSSO(ssoProvider)}
                                                startIcon={
                                                    <Icon>
                                                        <img src={Auth0SSOLoginIcon} alt={'Auth0SSO'} width={20} height={20} />
                                                    </Icon>
                                                }
                                            >
                                                Sign In With Auth0 by Okta
                                            </Button>
                                        )
                                )}
                            {configuredSsoProviders &&
                                configuredSsoProviders.map(
                                    (ssoProvider) =>
                                        ssoProvider === 'github' && (
                                            <Button
                                                key={ssoProvider}
                                                variant='outlined'
                                                style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                                                onClick={() => signInWithSSO(ssoProvider)}
                                                startIcon={
                                                    <Icon>
                                                        <img src={GithubSSOLoginIcon} alt={'GithubSSO'} width={20} height={20} />
                                                    </Icon>
                                                }
                                            >
                                                Sign In With Github
                                            </Button>
                                        )
                                )}
                        </Stack>
                    </form>
                </Stack>
            </MainCard>
        </>
    )
}

export default SignInPage
