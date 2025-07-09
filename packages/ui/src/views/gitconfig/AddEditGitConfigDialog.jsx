import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useEffect, useState, useMemo } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    OutlinedInput,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Stack,
    Button,
    Chip,
    Alert
} from '@mui/material'
import { IconGitBranch, IconExternalLink, IconCheck, IconX, IconLock, IconWorld } from '@tabler/icons-react'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import gitconfigApi from '../../api/gitconfig'

const providers = [
    {
        name: 'github',
        label: 'GitHub',
        description: 'GitHub repository hosting service'
    },
    {
        name: 'gitlab',
        label: 'GitLab',
        description: 'GitLab repository hosting service'
    },
    {
        name: 'bitbucket',
        label: 'Bitbucket',
        description: 'Bitbucket repository hosting service'
    },
    {
        name: 'generic',
        label: 'Generic Git',
        description: 'Generic Git server or self-hosted repository'
    }
]

const authModes = [
    {
        name: 'basic',
        label: 'Basic',
        description: 'Username and password authentication'
    },
    {
        name: 'token',
        label: 'Token',
        description: 'Personal access token or API key authentication'
    },
    {
        name: 'ssh',
        label: 'SSH',
        description: 'SSH key-based authentication'
    }
]

const AddEditGitConfigDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')
    const [form, setForm] = useState({
        provider: 'github',
        repository: '',
        authMode: 'token',
        username: '',
        secret: '',
        branchName: 'main'
    })
    const [errors, setErrors] = useState({})
    const [testResult, setTestResult] = useState(null)
    const [isTesting, setIsTesting] = useState(false)

    const dialogType = useMemo(() => dialogProps?.type || 'ADD', [dialogProps?.type])
    const data = useMemo(() => dialogProps?.data || {}, [dialogProps?.data])

    useEffect(() => {
        if (dialogType === 'EDIT' && data && Object.keys(data).length > 0) {
            setForm({
                provider: data.provider || 'github',
                repository: data.repository || '',
                authMode: data.authMode || 'token',
                username: data.username || '',
                secret: '', // never prefill secret
                branchName: data.branchName || 'main'
            })
        } else if (dialogType === 'ADD') {
            setForm({
                provider: 'github',
                repository: '',
                authMode: 'token',
                username: '',
                secret: '',
                branchName: 'main'
            })
        }
        // Clear test result when dialog opens
        setTestResult(null)
    }, [dialogType, data])

    const handleChange = (e) => {
        const { name, value, type: inputType, checked } = e.target
        setForm((prev) => ({
            ...prev,
            [name]: inputType === 'checkbox' ? checked : value
        }))
        // Clear test result when form changes
        setTestResult(null)
    }

    const onProviderChange = (provider) => {
        setForm((prev) => ({
            ...prev,
            provider: provider
        }))
        setTestResult(null)
    }

    const onAuthModeChange = (authMode) => {
        setForm((prev) => ({
            ...prev,
            authMode: authMode
        }))
        setTestResult(null)
    }

    const handleTestConnection = async () => {
        const newErrors = validate()
        setErrors(newErrors)
        if (Object.keys(newErrors).length === 0) {
            setIsTesting(true)
            setTestResult(null)
            try {
                const response = await gitconfigApi.testGitConfig(form)
                // Handle different response structures
                const responseData = response?.data || response
                
                // Check the success field from the server response
                if (responseData?.success === true) {
                    setTestResult({
                        success: true,
                        data: responseData
                    })
                } else {
                    // Server returned success: false with error message
                    setTestResult({
                        success: false,
                        error: responseData?.error || 'Test connection failed'
                    })
                }
            } catch (error) {
                console.error('Test connection error:', error)
                // Handle different error response structures
                let errorMessage = 'Test connection failed'
                if (error?.response?.data?.error) {
                    errorMessage = error.response.data.error
                } else if (error?.response?.data?.message) {
                    errorMessage = error.response.data.message
                } else if (error?.message) {
                    errorMessage = error.message
                }
                
                setTestResult({
                    success: false,
                    error: errorMessage
                })
            } finally {
                setIsTesting(false)
            }
        }
    }

    const validate = () => {
        const newErrors = {}
        if (!form.username) newErrors.username = 'Username is required'
        if (!form.repository) newErrors.repository = 'Repository name is required'
        if (!form.secret) newErrors.secret = 'Token is required'
        return newErrors
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const newErrors = validate()
        setErrors(newErrors)
        if (Object.keys(newErrors).length === 0) {
            const submitData = { ...form }
            if (dialogType === 'EDIT') submitData.id = data.id
            onConfirm(submitData)
        }
    }

    const renderTestResult = () => {
        if (!testResult) return null

        if (testResult.success && testResult.data) {
            const { permissions } = testResult.data
            if (!permissions) return null

            return (
                <Alert severity="success" sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Connection successful! ✅
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                                Repository:
                            </Typography>
                            <Chip
                                label={permissions.repository || 'Unknown'}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                            <Box sx={{ ml: 1 }}>
                                {permissions.private ? (
                                    <Chip
                                        icon={<IconLock size={14} />}
                                        label="Private"
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                ) : (
                                    <Chip
                                        icon={<IconWorld size={14} />}
                                        label="Public"
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ mr: 1, alignSelf: 'center' }}>
                                Permissions:
                            </Typography>
                            {permissions.permissions?.admin && (
                                <Chip
                                    icon={<IconCheck size={12} />}
                                    label="Admin"
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            )}
                            {permissions.permissions?.push && (
                                <Chip
                                    icon={<IconCheck size={12} />}
                                    label="Push"
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            )}
                            {permissions.permissions?.pull && (
                                <Chip
                                    icon={<IconCheck size={12} />}
                                    label="Pull"
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            )}
                            {permissions.permissions?.maintain && (
                                <Chip
                                    icon={<IconCheck size={12} />}
                                    label="Maintain"
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            )}
                            {permissions.permissions?.triage && (
                                <Chip
                                    icon={<IconCheck size={12} />}
                                    label="Triage"
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            )}
                        </Box>
                    </Box>
                </Alert>
            )
        } else {
            return (
                <Alert severity="error" sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Connection failed! ❌
                        </Typography>
                        <Typography variant="body2">
                            {testResult?.error || 'Unknown error occurred'}
                        </Typography>
                    </Box>
                </Alert>
            )
        }
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
                    <IconGitBranch style={{ marginRight: '10px' }} />
                    {dialogType === 'ADD' ? 'Add Git Config' : 'Edit Git Config'}
                </div>
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {renderTestResult()}
                    <Box sx={{ p: 1 }}>
                        <Typography>Provider<span style={{ color: 'red' }}>&nbsp;*</span></Typography>
                        <Dropdown
                            disabled={true}
                            name='provider'
                            options={providers}
                            onSelect={onProviderChange}
                            value={form.provider}
                            placeholder='Select a provider'
                        />
                    </Box>
                    <Box sx={{ p: 1 }}>
                        <Typography>Auth Mode<span style={{ color: 'red' }}>&nbsp;*</span></Typography>
                        <Dropdown
                            disabled={true}
                            name='authMode'
                            options={authModes}
                            onSelect={onAuthModeChange}
                            value={form.authMode}
                            placeholder='Select an auth mode'
                        />
                    </Box>
                    <Box sx={{ p: 1 }}>
                        <Typography>Username<span style={{ color: 'red' }}>&nbsp;*</span></Typography>
                        <OutlinedInput
                            size='small'
                            name='username'
                            value={form.username}
                            onChange={handleChange}
                            error={!!errors.username}
                            fullWidth
                        />
                    </Box>
                    <Box sx={{ p: 1 }}>
                        <Typography>Repository Name<span style={{ color: 'red' }}>&nbsp;*</span></Typography>
                        <OutlinedInput
                            size='small'
                            name='repository'
                            value={form.repository}
                            onChange={handleChange}
                            error={!!errors.repository}
                            fullWidth
                        />
                    </Box>
                    <Box sx={{ p: 1 }}>
                        <Typography>Token<span style={{ color: 'red' }}>&nbsp;*</span></Typography>
                        <OutlinedInput
                            size='small'
                            name='secret'
                            type='password'
                            value={form.secret}
                            onChange={handleChange}
                            error={!!errors.secret}
                            fullWidth
                            multiline
                            rows={3}
                        />
                        <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                size="small"
                                onClick={() => window.open('https://github.com/settings/personal-access-tokens/new', '_blank')}
                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                startIcon={<IconExternalLink size={14} />}
                            >
                                Learn about GitHub tokens
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', p: 3 }}>
                    <Button 
                        onClick={handleTestConnection} 
                        variant="outlined"
                        disabled={isTesting}
                    >
                        {isTesting ? 'Testing...' : 'Test Connection'}
                    </Button>
                    <Box>
                        <Button onClick={onCancel}>{dialogProps.cancelButtonName || 'Cancel'}</Button>
                        <StyledButton
                            disabled={!form.username || !form.repository || !form.secret || !testResult?.success}
                            variant='contained'
                            type='submit'
                        >
                            {dialogProps.confirmButtonName || (dialogType === 'ADD' ? 'Add' : 'Save')}
                        </StyledButton>
                    </Box>
                </DialogActions>
            </form>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AddEditGitConfigDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default AddEditGitConfigDialog 