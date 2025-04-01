import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { Button, List, ListItem, ListItemAvatar, ListItemText, Avatar } from '@mui/material'
import useApi from '@/hooks/useApi'
import credentialsApi from '@/api/credentials'
import { IconX } from '@tabler/icons-react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

export const GoogleDrivePicker = ({ onChange, value, disabled, credentialId, credentialData, handleCredentialDataChange }) => {
    const dispatch = useDispatch()
    const [pickerInited, setPickerInited] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState(value ? JSON.parse(value) : [])
    const [accessToken, setAccessToken] = useState(null)
    const [isTokenExpired, setIsTokenExpired] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))
    const getCredentialDataApi = useApi(credentialsApi.getSpecificCredential)
    useEffect(() => {
        if (credentialId) {
            getCredentialDataApi.request(credentialId)
        }
    }, [credentialId])

    useEffect(() => {
        if (getCredentialDataApi.data) {
            const expiresAt = new Date(getCredentialDataApi.data?.plainDataObj.expiresAt)
            const now = new Date()
            const isExpired = expiresAt < now

            setIsTokenExpired(isExpired)
            setAccessToken(getCredentialDataApi.data?.plainDataObj.googleAccessToken ?? '')
            handleCredentialDataChange(getCredentialDataApi.data)
        }
    }, [getCredentialDataApi.data])

    useEffect(() => {
        if (!accessToken) return

        // Load the Google Client and Picker libraries
        const script1 = document.createElement('script')
        script1.src = 'https://apis.google.com/js/api.js'
        script1.async = true
        script1.defer = true
        script1.onload = () => loadGAPIClient()

        const script2 = document.createElement('script')
        script2.src = 'https://accounts.google.com/gsi/client'
        script2.async = true
        script2.defer = true

        document.body.appendChild(script1)
        document.body.appendChild(script2)

        // Initialize selected files from value if it exists
        if (value) {
            try {
                const files = JSON.parse(value)
                setSelectedFiles(files)
            } catch (e) {
                console.error('Error parsing selected files:', e)
            }
        }

        return () => {
            document.body.removeChild(script1)
            document.body.removeChild(script2)
        }
    }, [value, accessToken])

    const loadGAPIClient = () => {
        window.gapi.load('picker', () => {
            setPickerInited(true)
        })
    }
    // console.log('accessToken=>', import.meta.env.VITE_PORT)
    // console.log('accessToken=>', process.env.VITE_PORT)
    // console.log('accessToken=>', process.env.REACT_APP_GOOGLE_PICKER_API_KEY)

    const createPicker = async () => {
        if (!accessToken) {
            console.error('No access token available')
            return
        }

        try {
            const view = new window.google.picker.View(window.google.picker.ViewId.DOCS)
            view.setMimeTypes(
                'application/vnd.google-apps.document,' +
                    'application/vnd.google-apps.spreadsheet,' +
                    'application/pdf,' +
                    'text/csv,' +
                    'application/csv,' +
                    'text/comma-separated-values,' +
                    'application/vnd.ms-excel,' +
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )

            const picker = new window.google.picker.PickerBuilder()
                .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
                .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY)
                .setAppId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
                .setOAuthToken(accessToken)
                .addView(view)
                .setCallback(pickerCallback)
                .build()

            picker.setVisible(true)
        } catch (error) {
            console.error('Error creating picker:', error)
        }
    }

    const pickerCallback = (data) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const files = data.docs.map((file) => ({ fileId: file.id, fileName: file.name, iconUrl: file.iconUrl }))
            setSelectedFiles(files)
            onChange(JSON.stringify(files))
        }
    }

    const handleRefreshAccessToken = async () => {
        try {
            setIsRefreshing(true)
            const response = await credentialsApi.refreshAccessToken({ credentialId })

            if (response.status === 200) {
                getCredentialDataApi.request(credentialId)
                setIsTokenExpired(false)

                enqueueSnackbar({
                    message: 'Successfully refreshed access token',
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
        } catch (error) {
            console.error('Error refreshing access token:', error)

            const errorMessage = error.response?.data?.message || 'Error refreshing access token'

            enqueueSnackbar({
                message: errorMessage,
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
        } finally {
            setIsRefreshing(false)
        }
    }
    return (
        <div style={{ margin: '10px 0px 0 0' }}>
            <Button
                variant='outlined'
                onClick={createPicker}
                disabled={!pickerInited || disabled || isTokenExpired}
                sx={{
                    mb: 2,
                    '&.Mui-disabled': {
                        color: 'gray',
                        borderColor: 'gray'
                    }
                }}
            >
                Select Files from Google Drive
            </Button>
            {isTokenExpired && (
                <Button
                    variant='outlined'
                    onClick={handleRefreshAccessToken}
                    disabled={!isTokenExpired || !credentialId}
                    sx={{
                        mb: 2,
                        ml: 2,
                        '&.Mui-disabled': {
                            color: 'gray',
                            borderColor: 'gray'
                        }
                    }}
                >
                    Refresh Access Token
                </Button>
            )}
            {isTokenExpired && (
                <div style={{ color: 'red', marginBottom: '10px' }}>
                    Access token has expired. Please re-authenticate or refresh the access token.
                </div>
            )}
            {selectedFiles.length > 0 && (
                <List sx={{ bgcolor: 'background.paper', p: 0 }}>
                    {selectedFiles.map((file) => (
                        <ListItem
                            key={file.fileId}
                            sx={{
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                p: 0
                            }}
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
