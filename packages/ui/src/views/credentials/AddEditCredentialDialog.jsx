import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import parser from 'html-react-parser'

// Material
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Box,
    Stack,
    OutlinedInput,
    Typography,
    FormControl,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Tooltip
} from '@mui/material'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import CredentialInputHandler from './CredentialInputHandler'

// Icons
import { IconX } from '@tabler/icons-react'

// API
import credentialsApi from '@/api/credentials'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'
import { initializeDefaultNodeData } from '@/utils/genericHelper'

// const
import { baseURL, REDACTED_CREDENTIAL_VALUE } from '@/store/constant'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { useFlags } from 'flagsmith/react'
import { GoogleAuthButton } from '@/ui-component/button/GoogleAuthButton'
import { SalesforceAuthButton } from '@/ui-component/button/SalesforceAuthButton'
import keySVG from '@/assets/images/key.svg'

const AddEditCredentialDialog = ({ show, dialogProps, onCancel, onConfirm, setError }) => {
    const portalElement = typeof document !== 'undefined' ? document.getElementById('portal') : null

    const dispatch = useDispatch()
    const flags = useFlags(['org:manage', 'chatflow:share:internal'])
    // ==============================|| Snackbar ||============================== //

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const getSpecificCredentialApi = useApi(credentialsApi.getSpecificCredential)
    const getSpecificComponentCredentialApi = useApi(credentialsApi.getSpecificComponentCredential)

    const [credential, setCredential] = useState({})
    const [name, setName] = useState('')
    const [credentialData, setCredentialData] = useState({})
    const [componentCredential, setComponentCredential] = useState({})
    const [visibility, setVisibility] = useState(credentialData.visibility || ['Private'])
    const handleChangeVisibility = useCallback(
        (event, option) => {
            const updatedVisibility = visibility.includes(option) ? visibility.filter((v) => v !== option) : [...visibility, option]
            setVisibility(updatedVisibility)
        },
        [visibility]
    )

    useEffect(() => {
        if (getSpecificCredentialApi.data) {
            setCredential(getSpecificCredentialApi.data)
            setVisibility(getSpecificCredentialApi.data.visibility)
            if (getSpecificCredentialApi.data.name) {
                setName(getSpecificCredentialApi.data.name)
            }
            if (getSpecificCredentialApi.data.plainDataObj) {
                setCredentialData(getSpecificCredentialApi.data.plainDataObj)
            }
            getSpecificComponentCredentialApi.request(getSpecificCredentialApi.data.credentialName)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificCredentialApi.data])

    useEffect(() => {
        if (getSpecificComponentCredentialApi.data) {
            setComponentCredential(getSpecificComponentCredentialApi.data)
        }
    }, [getSpecificComponentCredentialApi.data])

    useEffect(() => {
        if (getSpecificCredentialApi.error && setError) {
            setError(getSpecificCredentialApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificCredentialApi.error])

    useEffect(() => {
        if (getSpecificComponentCredentialApi.error && setError) {
            setError(getSpecificComponentCredentialApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificComponentCredentialApi.error])

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            // When credential dialog is opened from Credentials dashboard
            getSpecificCredentialApi.request(dialogProps.data.id)
        } else if (dialogProps.type === 'EDIT' && dialogProps.credentialId) {
            // When credential dialog is opened from node in canvas
            getSpecificCredentialApi.request(dialogProps.credentialId)
        } else if (dialogProps.type === 'ADD' && dialogProps.credentialComponent) {
            // When credential dialog is to add a new credential
            setName('')
            setCredential({})
            const defaultCredentialData = initializeDefaultNodeData(dialogProps.credentialComponent.inputs || [])
            setCredentialData(defaultCredentialData)
            setComponentCredential(dialogProps.credentialComponent)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        console.log('🔧 AddEditCredentialDialog show effect:', { show, dialogProps })
        if (show) {
            console.log('🔧 Dispatching SHOW_CANVAS_DIALOG')
            dispatch({ type: SHOW_CANVAS_DIALOG })
        } else {
            console.log('🔧 Dispatching HIDE_CANVAS_DIALOG')
            dispatch({ type: HIDE_CANVAS_DIALOG })
        }
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const addNewCredential = async () => {
        try {
            const obj = {
                name,
                credentialName: componentCredential.name,
                plainDataObj: credentialData,
                visibility
            }
            const createResp = await credentialsApi.createCredential(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'New Credential added',
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
                onConfirm(createResp.data.id)
            }
        } catch (error) {
            if (setError) setError(error)
            enqueueSnackbar({
                message: `Failed to add new Credential: ${
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
            onCancel()
        }
    }

    const saveCredential = async () => {
        try {
            const saveObj = {
                name,
                credentialName: componentCredential.name,
                visibility
            }

            let plainDataObj = {}
            for (const key in credentialData) {
                if (credentialData[key] !== REDACTED_CREDENTIAL_VALUE) {
                    plainDataObj[key] = credentialData[key]
                }
            }
            if (Object.keys(plainDataObj).length) saveObj.plainDataObj = plainDataObj

            const saveResp = await credentialsApi.updateCredential(credential.id, saveObj)
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Credential saved',
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
            if (setError) setError(error)
            enqueueSnackbar({
                message: `Failed to save Credential: ${
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
            onCancel()
        }
    }

    const handleGoogleOAuth = () => {
        const width = 500
        const height = 600
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2
        const features = `
            width=${width},
            height=${height},
            left=${left},
            top=${top},
            status=yes,
            toolbar=no,
            location=no,
            menubar=no,
            resizable=yes,
            scrollbars=yes
        `.replace(/\s/g, '')

        window.open(`${baseURL}/api/v1/google-auth`, 'Google Auth', features)

        // Listen for messages from the popup
        const handleMessage = (event) => {
            if (event.data?.type === 'AUTH_SUCCESS' && event.data.user) {
                setCredentialData(event.data.user)
                if (!name) {
                    setName(`${event.data.user.fullName} (${event.data.user.email})`)
                }
                // Show success message
                enqueueSnackbar({
                    message: 'Successfully authenticated with Google',
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
                // authWindow?.close()
                window.removeEventListener('message', handleMessage)
            }
            if (event.data?.type === 'AUTH_ERROR') {
                console.error('Authentication error:', event.data.error)

                enqueueSnackbar({
                    message: 'Failed to authenticate with Google',
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
            }
        }

        // Add the event listener
        window.addEventListener('message', handleMessage)
    }

    const handleSalesforceOAuth = () => {
        const width = 500
        const height = 600
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2
        const features = `
            width=${width},
            height=${height},
            left=${left},
            top=${top},
            status=yes,
            toolbar=no,
            location=no,
            menubar=no,
            resizable=yes,
            scrollbars=yes
        `.replace(/\s/g, '')

        const authUrl = `${baseURL}/api/v1/salesforce-auth`
        window.open(authUrl, 'Salesforce Auth', features)

        // Listen for messages from the popup
        const handleMessage = (event) => {
            if (event.data?.type === 'AUTH_SUCCESS' && event.data.user) {
                setCredentialData((prevData) => ({
                    ...prevData,
                    refreshToken: event.data.user.refreshToken
                }))
                if (!name) {
                    setName(`Salesforce OAuth (${event.data.user.userInfo?.name || 'User'})`)
                }
                // Show success message
                enqueueSnackbar({
                    message: 'Successfully authenticated with Salesforce',
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
                window.removeEventListener('message', handleMessage)
            }
            if (event.data?.type === 'AUTH_ERROR') {
                console.error('Salesforce authentication error:', event.data.error)

                enqueueSnackbar({
                    message: 'Failed to authenticate with Salesforce',
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
                window.removeEventListener('message', handleMessage)
            }
        }

        // Add the event listener
        window.addEventListener('message', handleMessage)
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
                {componentCredential && componentCredential.label && (
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <div
                            style={{
                                width: 50,
                                height: 50,
                                marginRight: 10,
                                borderRadius: '50%',
                                backgroundColor: 'white'
                            }}
                        >
                            <img
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    padding: 7,
                                    borderRadius: '50%',
                                    objectFit: 'contain'
                                }}
                                alt={componentCredential.name}
                                src={`${baseURL}/api/v1/components-credentials-icon/${componentCredential.name}`}
                                onError={(e) => {
                                    e.target.onerror = null
                                    e.target.style.padding = '5px'
                                    e.target.src = keySVG
                                }}
                            />
                        </div>
                        {componentCredential.label}
                    </div>
                )}
            </DialogTitle>
            <DialogContent>
                {componentCredential && componentCredential.description && (
                    <Box sx={{ pl: 2, pr: 2 }}>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                borderRadius: 10,
                                background: 'rgb(254,252,191)',
                                padding: 10,
                                marginTop: 10,
                                marginBottom: 10
                            }}
                        >
                            <span style={{ color: 'rgb(116,66,16)' }}>{parser(componentCredential.description)}</span>
                        </div>
                    </Box>
                )}
                {componentCredential && componentCredential.label && (
                    <Box sx={{ p: 2 }}>
                        <Stack sx={{ position: 'relative' }} direction='row'>
                            <Typography variant='overline'>
                                Credential Name
                                <span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                        </Stack>
                        <OutlinedInput
                            id='credName'
                            type='string'
                            fullWidth
                            placeholder={componentCredential.label}
                            value={name}
                            name='name'
                            onChange={(e) => setName(e.target.value)}
                        />
                    </Box>
                )}
                {componentCredential && (
                    <GoogleAuthButton
                        componentCredential={componentCredential}
                        name={name}
                        handleGoogleOAuth={handleGoogleOAuth}
                        baseURL={baseURL}
                    />
                )}
                {componentCredential && (
                    <SalesforceAuthButton
                        componentCredential={componentCredential}
                        credentialData={credentialData}
                        handleSalesforceOAuth={handleSalesforceOAuth}
                        baseURL={baseURL}
                    />
                )}
                {componentCredential &&
                    componentCredential.inputs &&
                    componentCredential.inputs.map((inputParam, index) => (
                        <CredentialInputHandler key={index} inputParam={inputParam} data={credentialData} />
                    ))}

                <Box sx={{ p: 2 }}>
                    <Typography variant='h4' sx={{ mb: 1 }}>
                        Credential visibility
                        <TooltipWithParser
                            style={{ mb: 1, mt: 2, marginLeft: 10 }}
                            title={
                                'Control visibility and organization permissions. Contact your organization admin to enable more options.'
                            }
                        />
                    </Typography>
                    <FormControl component='fieldset' sx={{ width: '100%', mb: 2 }}>
                        <FormGroup>
                            {['Private', 'Organization'].map((type) => {
                                const isDisabled = type === 'Private' || (type === 'Organization' && !flags['org:manage']?.enabled)
                                return (
                                    <FormControlLabel
                                        key={type}
                                        control={
                                            <Tooltip title={isDisabled ? 'Contact your org admin to enable this option' : ''}>
                                                <Checkbox
                                                    checked={visibility.includes(type)}
                                                    onChange={(event) => handleChangeVisibility(event, type)}
                                                />
                                            </Tooltip>
                                        }
                                        label={type}
                                        disabled={isDisabled}
                                    />
                                )
                            })}
                        </FormGroup>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <StyledButton
                    disabled={
                        componentCredential?.name === 'salesforceOAuth' ? !(credentialData && credentialData.refreshToken && name) : !name
                    }
                    variant='contained'
                    onClick={() => (dialogProps.type === 'ADD' ? addNewCredential() : saveCredential())}
                >
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return portalElement ? createPortal(component, portalElement) : null
}

AddEditCredentialDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    setError: PropTypes.func
}

export default AddEditCredentialDialog
