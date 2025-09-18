import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

// material-ui
import { Alert, Box, Button, Chip, Divider, Icon, List, ListItemText, Stack, TextField, Typography } from '@mui/material'

// project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Input } from '@/ui-component/input/Input'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'

// API
import accountApi from '@/api/account.api'
import authApi from '@/api/auth'
import loginMethodApi from '@/api/loginmethod'

// Hooks
import useApi from '@/hooks/useApi'
import { store } from '@/store'
import { loginSuccess } from '@/store/reducers/authSlice'

// utils
import useNotifier from '@/utils/useNotifier'
import { passwordSchema } from '@/utils/validation'

// Icons
import Auth0SSOLoginIcon from '@/assets/images/auth0.svg'
import GoogleSSOLoginIcon from '@/assets/images/google.svg'
import AzureSSOLoginIcon from '@/assets/images/microsoft-azure.svg'
import { useConfig } from '@/store/context/ConfigContext'
import { IconCircleCheck, IconExclamationCircle } from '@tabler/icons-react'

// ==============================|| Organization & Admin User Setup ||============================== //

// IMPORTANT: when updating this schema, update the schema on the server as well
// packages/server/src/enterprise/Interface.Enterprise.ts
const OrgSetupSchema = z
    .object({
        username: z.string().min(1, 'Name is required'),
        email: z.string().min(1, 'Email is required').email('Invalid email address'),
        password: passwordSchema,
        confirmPassword: z.string().min(1, 'Confirm Password is required')
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
    })

const OrganizationSetupPage = () => {
    useNotifier()
    const { isEnterpriseLicensed, isOpenSource } = useConfig()

    const orgNameInput = {
        label: 'Organization',
        name: 'organization',
        type: 'text',
        placeholder: 'Acme'
    }

    const usernameInput = {
        label: 'Username',
        name: 'username',
        type: 'text',
        placeholder: 'John Doe'
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

    const emailInput = {
        label: 'EMail',
        name: 'email',
        type: 'email',
        placeholder: 'user@company.com'
    }

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [username, setUsername] = useState('')
    const [orgName, setOrgName] = useState('')
    const [existingUsername, setExistingUsername] = useState('')
    const [existingPassword, setExistingPassword] = useState('')

    const [loading, setLoading] = useState(false)
    const [authError, setAuthError] = useState('')
    const [successMsg, setSuccessMsg] = useState(undefined)
    const [requiresAuthentication, setRequiresAuthentication] = useState(false)

    const loginApi = useApi(authApi.login)
    const registerAccountApi = useApi(accountApi.registerAccount)
    const getBasicAuthApi = useApi(accountApi.getBasicAuth)
    const navigate = useNavigate()

    const getDefaultProvidersApi = useApi(loginMethodApi.getLoginMethods)
    const [configuredSsoProviders, setConfiguredSsoProviders] = useState([])

    const register = async (event) => {
        event.preventDefault()
        const result = OrgSetupSchema.safeParse({
            orgName,
            username,
            email,
            password,
            confirmPassword
        })
        if (result.success) {
            setLoading(true)
            setAuthError('')

            // Check authentication first if required
            if (requiresAuthentication) {
                try {
                    const authResult = await accountApi.checkBasicAuth({
                        username: existingUsername,
                        password: existingPassword
                    })

                    if (!authResult || !authResult.data || authResult.data.message !== 'Authentication successful') {
                        setAuthError('Authentication failed. Please check your existing credentials.')
                        setLoading(false)
                        return
                    }
                } catch (error) {
                    setAuthError('Authentication failed. Please check your existing credentials.')
                    setLoading(false)
                    return
                }
            }

            // Proceed with registration after successful authentication
            const body = {
                user: {
                    name: username,
                    email: email,
                    type: 'pro',
                    credential: password
                }
            }
            if (isEnterpriseLicensed) {
                body.organization = {
                    name: orgName
                }
            }
            await registerAccountApi.request(body)
        } else {
            // Handle validation errors
            const errorMessages = result.error.errors.map((error) => error.message)
            setAuthError(errorMessages.join(', '))
        }
    }

    useEffect(() => {
        if (registerAccountApi.error) {
            const errMessage =
                typeof registerAccountApi.error.response.data === 'object'
                    ? registerAccountApi.error.response.data.message
                    : registerAccountApi.error.response.data
            let finalErrMessage = ''
            if (isEnterpriseLicensed) {
                finalErrMessage = `Error in registering organization. Please contact your administrator. (${errMessage})`
            } else {
                finalErrMessage = `Error in registering account: ${errMessage}`
            }
            setAuthError(finalErrMessage)
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerAccountApi.error])

    useEffect(() => {
        if (getBasicAuthApi.data && getBasicAuthApi.data.isUsernamePasswordSet === true) {
            setRequiresAuthentication(true)
        }
    }, [getBasicAuthApi.data])

    useEffect(() => {
        if (!isOpenSource) {
            getDefaultProvidersApi.request()
        } else {
            getBasicAuthApi.request()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getDefaultProvidersApi.data && getDefaultProvidersApi.data.providers) {
            setConfiguredSsoProviders(getDefaultProvidersApi.data.providers.map((provider) => provider))
        }
    }, [getDefaultProvidersApi.data])

    useEffect(() => {
        if (registerAccountApi.data) {
            setAuthError(undefined)
            setConfirmPassword('')
            setPassword('')
            setUsername('')
            setEmail('')
            setSuccessMsg(registerAccountApi.data.message)
            setTimeout(() => {
                const body = {
                    email,
                    password
                }
                loginApi.request(body)
            }, 1000)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerAccountApi.data])

    useEffect(() => {
        if (loginApi.data) {
            setLoading(false)
            store.dispatch(loginSuccess(loginApi.data))
            localStorage.setItem('username', loginApi.data.name)
            navigate(location.state?.path || '/chatflows')
            //navigate(0)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loginApi.data])

    const signInWithSSO = (ssoProvider) => {
        window.location.href = `/api/v1/${ssoProvider}/login`
    }

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    maxHeight: '100vh',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '24px'
                }}
            >
                <Stack flexDirection='column' sx={{ width: '480px', gap: 3 }}>
                    {authError && (
                        <Alert icon={<IconExclamationCircle />} variant='filled' severity='error'>
                            {authError.split(', ').length > 0 ? (
                                <List dense sx={{ py: 0 }}>
                                    {authError.split(', ').map((error, index) => (
                                        <ListItemText key={index} primary={error} primaryTypographyProps={{ color: '#fff !important' }} />
                                    ))}
                                </List>
                            ) : (
                                authError
                            )}
                        </Alert>
                    )}
                    {successMsg && (
                        <Alert icon={<IconCircleCheck />} variant='filled' severity='success'>
                            {successMsg}
                        </Alert>
                    )}
                    <Stack sx={{ gap: 1 }}>
                        <Typography variant='h1'>Setup Account</Typography>
                    </Stack>
                    {requiresAuthentication && (
                        <Alert severity='info'>
                            Application authentication now requires email and password. Contact administrator to setup an account.
                        </Alert>
                    )}
                    {(isOpenSource || isEnterpriseLicensed) && (
                        <Typography variant='caption'>
                            Account setup does not make any external connections, your data stays securely on your locally hosted server.
                        </Typography>
                    )}
                    <form onSubmit={register}>
                        <Stack sx={{ width: '100%', flexDirection: 'column', alignItems: 'left', justifyContent: 'center', gap: 2 }}>
                            {requiresAuthentication && (
                                <>
                                    <Box>
                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                            <Typography sx={{ mb: 1 }}>
                                                Existing Username<span style={{ color: 'red' }}>&nbsp;*</span>
                                            </Typography>
                                            <div style={{ flexGrow: 1 }}></div>
                                        </div>
                                        <TextField
                                            fullWidth
                                            placeholder='Existing Username'
                                            value={existingUsername}
                                            onChange={(e) => setExistingUsername(e.target.value)}
                                        />
                                        <Typography variant='caption'>
                                            <i>Existing username that was set as FLOWISE_USERNAME environment variable</i>
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                            <Typography sx={{ mb: 1 }}>
                                                Existing Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                            </Typography>
                                            <div style={{ flexGrow: 1 }}></div>
                                        </div>
                                        <TextField
                                            fullWidth
                                            type='password'
                                            placeholder='Existing Password'
                                            value={existingPassword}
                                            onChange={(e) => setExistingPassword(e.target.value)}
                                        />
                                        <Typography variant='caption'>
                                            <i>Existing password that was set as FLOWISE_PASSWORD environment variable</i>
                                        </Typography>
                                    </Box>
                                    <Divider>
                                        <Chip label='New Account Details' size='small' />
                                    </Divider>
                                </>
                            )}
                            {isEnterpriseLicensed && (
                                <>
                                    <Box>
                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                            <Typography>
                                                Organization Name:<span style={{ color: 'red' }}>&nbsp;*</span>
                                            </Typography>
                                            <div style={{ flexGrow: 1 }}></div>
                                        </div>
                                        <Input
                                            inputParam={orgNameInput}
                                            placeholder='Organization Name'
                                            onChange={(newValue) => setOrgName(newValue)}
                                            value={orgName}
                                            showDialog={false}
                                        />
                                    </Box>
                                    <Box>
                                        <Divider>
                                            <Chip label='Account Administrator' size='small' />
                                        </Divider>
                                    </Box>
                                </>
                            )}
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Administrator Name<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={usernameInput}
                                    placeholder='Display Name'
                                    onChange={(newValue) => setUsername(newValue)}
                                    value={username}
                                    showDialog={false}
                                />
                                <Typography variant='caption'>
                                    <i>Is used for display purposes only.</i>
                                </Typography>
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Administrator Email<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={emailInput}
                                    onChange={(newValue) => setEmail(newValue)}
                                    type='email'
                                    value={email}
                                    showDialog={false}
                                />
                                <Typography variant='caption'>
                                    <i>Kindly use a valid email address. Will be used as login id.</i>
                                </Typography>
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input inputParam={passwordInput} onChange={(newValue) => setPassword(newValue)} value={password} />
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
                                    onChange={(newValue) => setConfirmPassword(newValue)}
                                    value={confirmPassword}
                                />
                                <Typography variant='caption'>
                                    <i>Reconfirm your password. Must match the password typed above.</i>
                                </Typography>
                            </Box>
                            <StyledButton
                                variant='contained'
                                style={{ borderRadius: 12, height: 40, marginRight: 5 }}
                                type='submit'
                                disabled={requiresAuthentication && (!existingUsername || !existingPassword)}
                            >
                                Sign Up
                            </StyledButton>
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
                                                Sign Up With Microsoft
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
                                                Sign Up With Google
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
                                                Sign Up With Auth0 by Okta
                                            </Button>
                                        )
                                )}
                        </Stack>
                    </form>
                </Stack>
            </Box>
            {loading && <BackdropLoader open={loading} />}
        </>
    )
}

export default OrganizationSetupPage
