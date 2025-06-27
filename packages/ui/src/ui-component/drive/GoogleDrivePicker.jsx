import PropTypes from 'prop-types'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Button, List, ListItem, ListItemAvatar, ListItemText, Avatar, IconButton, Stack, Alert } from '@mui/material'
import useApi from '@/hooks/useApi'
import credentialsApi from '@/api/credentials'
import { IconX, IconTrash } from '@tabler/icons-react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { GOOGLE_DRIVE_SUPPORTED_MIME_TYPES as SUPPORTED_MIME_TYPES } from '../../../../components/src/constants'

/**
 * Custom hook for loading Google API scripts (Google Picker and Identity Services)
 * @param {string} accessToken - Google OAuth access token for authentication
 * @returns {boolean} scriptsLoaded - Whether the Google API scripts have been loaded
 */
const useGoogleAPILoader = (accessToken) => {
    const [scriptsLoaded, setScriptsLoaded] = useState(false)
    const scriptsLoadedRef = useRef(false)

    useEffect(() => {
        if (!accessToken || scriptsLoadedRef.current) return

        // Check if scripts are already loaded
        if (window.gapi && window.google && window.google.picker) {
            setScriptsLoaded(true)
            scriptsLoadedRef.current = true
            return
        }

        let gapiScript, gsiScript

        const loadGAPIClient = () => {
            window.gapi.load('picker', () => {
                setScriptsLoaded(true)
                scriptsLoadedRef.current = true
            })
        }

        // Load Google APIs script
        gapiScript = document.createElement('script')
        gapiScript.src = 'https://apis.google.com/js/api.js'
        gapiScript.async = true
        gapiScript.defer = true
        gapiScript.onload = loadGAPIClient
        gapiScript.onerror = () => console.error('Failed to load Google APIs script')

        // Load Google Identity Services script
        gsiScript = document.createElement('script')
        gsiScript.src = 'https://accounts.google.com/gsi/client'
        gsiScript.async = true
        gsiScript.defer = true
        gsiScript.onerror = () => console.error('Failed to load Google Identity Services script')

        document.body.appendChild(gapiScript)
        document.body.appendChild(gsiScript)

        return () => {
            // Cleanup: only remove if we added them
            if (gapiScript && document.body.contains(gapiScript)) {
                document.body.removeChild(gapiScript)
            }
            if (gsiScript && document.body.contains(gsiScript)) {
                document.body.removeChild(gsiScript)
            }
        }
    }, [accessToken])

    return scriptsLoaded
}

/**
 * Custom hook for managing Google Drive Picker instances
 * @param {string} accessToken - Google OAuth access token for authentication
 * @param {Function} onFilesSelected - Callback function when files are selected
 * @returns {Object} Object containing createPicker, closePicker functions and pickerInstance state
 */
const useGooglePicker = (accessToken, onFilesSelected) => {
    const [pickerInstance, setPickerInstance] = useState(null)

    const createPickerView = useCallback((viewType) => {
        const view = new window.google.picker.DocsView()
            .setIncludeFolders(viewType !== 'recent')
            .setSelectFolderEnabled(false)
            .setMimeTypes(SUPPORTED_MIME_TYPES)

        switch (viewType) {
            case 'myDrive':
                return view.setParent('root').setLabel('My Drive')
            case 'sharedWithMe':
                return view.setOwnedByMe(false).setLabel('Shared with me')
            case 'sharedDrives':
                return view.setEnableDrives(true).setLabel('Shared drives')
            case 'recent':
                return view.setQuery('').setLabel('Recent')
            default:
                return view
        }
    }, [])

    const pickerCallback = useCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const newFiles = data.docs.map((file) => ({
                fileId: file.id,
                fileName: file.name,
                iconUrl: file.iconUrl
            }))
            onFilesSelected(newFiles)
        }
    }, [onFilesSelected])

    const createPicker = useCallback(async () => {
        if (!accessToken || !window.google?.picker) {
            console.error('Google Picker not available or no access token')
            return
        }

        try {
            const picker = new window.google.picker.PickerBuilder()
                .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
                .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
                .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY)
                .setAppId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
                .setOAuthToken(accessToken)
                .addView(createPickerView('myDrive'))
                .addView(createPickerView('sharedWithMe'))
                .addView(createPickerView('sharedDrives'))
                .addView(createPickerView('recent'))
                .setCallback(pickerCallback)
                .build()

            picker.setVisible(true)
            setPickerInstance(picker)
        } catch (error) {
            console.error('Error creating picker:', error)
        }
    }, [accessToken, createPickerView, pickerCallback])

    const closePicker = useCallback(() => {
        if (pickerInstance) {
            pickerInstance.setVisible(false)
        }
        setPickerInstance(null)
    }, [pickerInstance])

    return { createPicker, closePicker, pickerInstance }
}

export const GoogleDrivePicker = ({ onChange, value, disabled, credentialId, credentialData, handleCredentialDataChange }) => {
    const dispatch = useDispatch()
    const [selectedFiles, setSelectedFiles] = useState(() => {
        try {
            return value ? JSON.parse(value) : []
        } catch (error) {
            console.error('Error parsing initial selected files:', error)
            return []
        }
    })
    const [accessToken, setAccessToken] = useState(null)
    const [isTokenExpired, setIsTokenExpired] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    
    const enqueueSnackbar = useCallback((...args) => dispatch(enqueueSnackbarAction(...args)), [dispatch])
    const closeSnackbar = useCallback((...args) => dispatch(closeSnackbarAction(...args)), [dispatch])
    
    const getCredentialDataApi = useApi(credentialsApi.getSpecificCredential)
    const scriptsLoaded = useGoogleAPILoader(accessToken)

    // Handle new files selection from picker
    const handleFilesSelected = useCallback((newFiles) => {
        const uniqueNewFiles = newFiles.filter(
            (newFile) => !selectedFiles.some((existingFile) => existingFile.fileId === newFile.fileId)
        )
        const updatedFiles = [...selectedFiles, ...uniqueNewFiles]
        setSelectedFiles(updatedFiles)
        onChange(JSON.stringify(updatedFiles))
    }, [selectedFiles, onChange])

    const { createPicker, closePicker, pickerInstance } = useGooglePicker(accessToken, handleFilesSelected)

    // Load credential data on mount and clear files when credential changes
    useEffect(() => {
        if (credentialId) {
            getCredentialDataApi.request(credentialId)
            
            // Clear selected files when credential changes
            setSelectedFiles([])
            onChange(JSON.stringify([]))
            
            // Reset token state
            setAccessToken(null)
            setIsTokenExpired(false)
        }
    }, [credentialId])

    // Handle credential data from prop
    useEffect(() => {
        if (credentialData?.plainDataObj) {
            const expiresAt = new Date(credentialData.plainDataObj.expiresAt)
            const now = new Date()
            const isExpired = expiresAt < now

            setIsTokenExpired(isExpired)
            setAccessToken(credentialData.plainDataObj.googleAccessToken ?? '')
        }
    }, [credentialData])

    // Handle credential data from API
    useEffect(() => {
        if (getCredentialDataApi.data) {
            const expiresAt = new Date(getCredentialDataApi.data?.plainDataObj.expiresAt)
            const now = new Date()
            const isExpired = expiresAt < now

            setIsTokenExpired(isExpired)
            setAccessToken(getCredentialDataApi.data?.plainDataObj.googleAccessToken ?? '')
            handleCredentialDataChange?.(getCredentialDataApi.data)
        }
    }, [getCredentialDataApi.data, handleCredentialDataChange])

    // Handle outside clicks and keyboard events for picker
    useEffect(() => {
        if (!pickerInstance) return

        const handleOutsideClick = (event) => {
            const pickerDialog = document.querySelector('.picker-dialog')
            if (pickerDialog && !pickerDialog.contains(event.target)) {
                closePicker()
            }
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closePicker()
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [pickerInstance, closePicker])

    const handleClearAll = useCallback(() => {
        setSelectedFiles([])
        onChange(JSON.stringify([]))
    }, [onChange])

    const handleRemoveFile = useCallback((fileId) => {
        const updatedFiles = selectedFiles.filter((file) => file.fileId !== fileId)
        setSelectedFiles(updatedFiles)
        onChange(JSON.stringify(updatedFiles))
    }, [selectedFiles, onChange])

    const showSnackbar = useCallback((message, variant = 'info') => {
        enqueueSnackbar({
            message,
            options: {
                key: new Date().getTime() + Math.random(),
                variant,
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }, [enqueueSnackbar, closeSnackbar])

    const handleRefreshAccessToken = useCallback(async () => {
        if (!credentialId) return

        try {
            setIsRefreshing(true)
            console.log('🔄 [FRONTEND] Iniciando refresh para credential:', credentialId)
            
            // Obtener token actual antes del refresh
            const currentCred = await credentialsApi.getSpecificCredential(credentialId)
            const oldToken = currentCred?.data?.plainDataObj?.googleAccessToken?.substring(0, 20)
            console.log('🔄 [FRONTEND] Token actual:', oldToken + '...')
            
            const response = await credentialsApi.refreshAccessToken({ credentialId })

            if (response.status === 200) {
                getCredentialDataApi.request(credentialId)
                
                // Verificar que el token cambió
                setTimeout(async () => {
                    const newCred = await credentialsApi.getSpecificCredential(credentialId)
                    const newToken = newCred?.data?.plainDataObj?.googleAccessToken?.substring(0, 20)
                    console.log('✅ [FRONTEND] Token nuevo:', newToken + '...')
                    console.log('🔍 [FRONTEND] ¿Token cambió?', oldToken !== newToken)
                }, 1000)
                
                setIsTokenExpired(false)
                showSnackbar('Successfully refreshed access token', 'success')
            }
        } catch (error) {
            console.error('❌ [FRONTEND] Error refreshing access token:', error)
            const errorMessage = error.response?.data?.message || 'Error refreshing access token'
            showSnackbar(errorMessage, 'error')
        } finally {
            setIsRefreshing(false)
        }
    }, [credentialId, getCredentialDataApi, showSnackbar])

    const isPickerReady = scriptsLoaded && !disabled && !isTokenExpired
    const hasSelectedFiles = selectedFiles.length > 0

    return (
        <div style={{ margin: '10px 0px 0 0' }}>
            <Stack direction='column' spacing={2} sx={{ mb: 2 }}>
                <Button
                    variant='outlined'
                    onClick={createPicker}
                    disabled={!isPickerReady}
                    sx={{
                        '&.Mui-disabled': {
                            color: 'gray',
                            borderColor: 'gray'
                        }
                    }}
                >
                    Select Files from Google Drive
                </Button>
                
                {hasSelectedFiles && (
                    <Button 
                        variant='outlined' 
                        onClick={handleClearAll} 
                        color='error' 
                        startIcon={<IconTrash size={20} />}
                    >
                        Clear All
                    </Button>
                )}
                
                {isTokenExpired && (
                    <Button
                        variant='outlined'
                        onClick={handleRefreshAccessToken}
                        disabled={!credentialId || isRefreshing}
                        sx={{
                            '&.Mui-disabled': {
                                color: 'gray',
                                borderColor: 'gray'
                            }
                        }}
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh Access Token'}
                    </Button>
                )}
            </Stack>
            
            {isTokenExpired && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                    Access token has expired. Please re-authenticate or refresh the access token.
                </Alert>
            )}
            
            {hasSelectedFiles && (
                <List sx={{ bgcolor: 'background.paper', p: 0 }}>
                    {selectedFiles.map((file) => (
                        <ListItem
                            key={file.fileId}
                            sx={{
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                p: 0,
                                mb: 1
                            }}
                            secondaryAction={
                                <IconButton
                                    edge='end'
                                    aria-label={`Remove ${file.fileName}`}
                                    onClick={() => handleRemoveFile(file.fileId)}
                                    sx={{
                                        mr: 1,
                                        color: 'error.main',
                                        '&:hover': {
                                            backgroundColor: 'error.lighter'
                                        }
                                    }}
                                >
                                    <IconTrash size={20} />
                                </IconButton>
                            }
                        >
                            <ListItemAvatar>
                                <Avatar
                                    src={file.iconUrl}
                                    alt={file.fileName}
                                    variant='rounded'
                                    sx={{
                                        bgcolor: 'background.paper',
                                        '& img': {
                                            width: '24px',
                                            height: '24px'
                                        }
                                    }}
                                />
                            </ListItemAvatar>
                            <ListItemText
                                primary={file.fileName}
                                sx={{
                                    '& .MuiListItemText-primary': {
                                        fontSize: '0.875rem'
                                    }
                                }}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </div>
    )
}

GoogleDrivePicker.propTypes = {
    onChange: PropTypes.func.isRequired,
    value: PropTypes.string,
    disabled: PropTypes.bool,
    credentialId: PropTypes.string.isRequired,
    credentialData: PropTypes.object,
    handleCredentialDataChange: PropTypes.func
}
