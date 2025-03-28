import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { Button, Autocomplete, TextField, Chip, CircularProgress, Box, Typography, Paper } from '@mui/material'
import useApi from '@/hooks/useApi'
import credentialsApi from '@/api/credentials'
import gmailApi from '@/api/gmail'
import { IconX, IconRefresh, IconMail } from '@tabler/icons-react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

export const GmailLabelPicker = ({ onChange, value, disabled, credentialId, credentialData, handleCredentialDataChange }) => {
    const dispatch = useDispatch()
    const [labelsList, setLabelsList] = useState([])
    const [selectedLabels, setSelectedLabels] = useState(value ? JSON.parse(value) : [])
    const [accessToken, setAccessToken] = useState(null)
    const [isTokenExpired, setIsTokenExpired] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isLoadingLabels, setIsLoadingLabels] = useState(false)
    const [open, setOpen] = useState(false)

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

            if (!isExpired && getCredentialDataApi.data?.plainDataObj.googleAccessToken) {
                fetchLabels(getCredentialDataApi.data?.plainDataObj.googleAccessToken)
            }
        }
    }, [getCredentialDataApi.data])

    useEffect(() => {
        // Initialize selected labels from value if it exists
        if (value) {
            try {
                const labels = JSON.parse(value)
                setSelectedLabels(labels)
            } catch (e) {
                console.error('Error parsing selected labels:', e)
            }
        }
    }, [value])

    const fetchLabels = async (token) => {
        if (!token) return

        setIsLoadingLabels(true)
        try {
            const response = await gmailApi.getLabels({ accessToken: token })
            if (response.data && Array.isArray(response.data.labels)) {
                // Filter out system labels we don't want to show
                const filteredLabels = response.data.labels
                    .filter((label) => !label.id.startsWith('CATEGORY_'))
                    .map((label) => ({
                        id: label.id,
                        name: label.name,
                        type: label.type,
                        color: label.color
                    }))
                setLabelsList(filteredLabels)
            } else {
                setLabelsList([])
            }
        } catch (error) {
            console.error('Error fetching labels:', error)
            enqueueSnackbar({
                message: 'Failed to load Gmail labels: ' + (error.message || 'Unknown error'),
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
            setIsLoadingLabels(false)
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

    const handleLabelChange = (event, newValues) => {
        // Convert the Autocomplete format to our storage format
        const formattedLabels = newValues.map((label) => ({
            labelId: label.id,
            labelName: label.name
        }))

        setSelectedLabels(formattedLabels)
        onChange(JSON.stringify(formattedLabels))
    }

    const refreshLabels = () => {
        if (accessToken) {
            fetchLabels(accessToken)
        }
    }

    // Transform selectedLabels for Autocomplete
    const autocompleteValue = selectedLabels.map((label) => {
        // Find the full label object from labelsList
        const fullLabel = labelsList.find((item) => item.id === label.labelId)
        return fullLabel || { id: label.labelId, name: label.labelName }
    })

    return (
        <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                <Button
                    variant='outlined'
                    onClick={refreshLabels}
                    disabled={!accessToken || disabled || isTokenExpired || isLoadingLabels}
                    startIcon={<IconRefresh />}
                    size='small'
                >
                    {isLoadingLabels ? 'Loading...' : 'Refresh Labels'}
                </Button>

                {isTokenExpired && (
                    <Button
                        variant='outlined'
                        onClick={handleRefreshAccessToken}
                        disabled={!isTokenExpired || !credentialId || isRefreshing}
                        size='small'
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh Token'}
                    </Button>
                )}
            </Box>

            {isTokenExpired && (
                <Typography color='error' variant='body2' sx={{ mb: 2 }}>
                    Access token has expired. Please refresh the access token.
                </Typography>
            )}

            <Autocomplete
                multiple
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => setOpen(false)}
                options={labelsList}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={autocompleteValue}
                onChange={handleLabelChange}
                disabled={disabled || isTokenExpired || !accessToken}
                loading={isLoadingLabels}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label='Select Gmail Labels'
                        placeholder={selectedLabels.length === 0 ? 'Search and select labels' : ''}
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {isLoadingLabels ? <CircularProgress color='inherit' size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                            startAdornment: (
                                <>
                                    <IconMail size={20} style={{ marginRight: 8, opacity: 0.6 }} />
                                    {params.InputProps.startAdornment}
                                </>
                            )
                        }}
                    />
                )}
                renderOption={(props, option) => (
                    <li {...props}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    bgcolor: option.color?.backgroundColor || '#e0e0e0',
                                    mr: 1.5
                                }}
                            />
                            <Typography variant='body2' component='span' sx={{ flex: 1 }}>
                                {option.name}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                                {option.type === 'system' ? 'System' : 'User'}
                            </Typography>
                        </Box>
                    </li>
                )}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip key={index} variant='outlined' label={option.name} size='small' {...getTagProps({ index })} />
                    ))
                }
                PaperComponent={(props) => (
                    <Paper
                        elevation={3}
                        {...props}
                        sx={{
                            maxHeight: '300px',
                            '& .MuiAutocomplete-listbox': {
                                padding: '4px 0'
                            }
                        }}
                    />
                )}
                noOptionsText={
                    <Typography variant='body2' sx={{ p: 1, textAlign: 'center' }}>
                        {accessToken ? 'No labels found in your Gmail account' : 'Please connect your Gmail account'}
                    </Typography>
                }
            />

            {selectedLabels.length > 0 && (
                <Typography variant='caption' sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                    {selectedLabels.length} label{selectedLabels.length !== 1 ? 's' : ''} selected
                </Typography>
            )}
        </Box>
    )
}

GmailLabelPicker.propTypes = {
    onChange: PropTypes.func.isRequired,
    value: PropTypes.string,
    disabled: PropTypes.bool,
    credentialId: PropTypes.string.isRequired,
    credentialData: PropTypes.object,
    handleCredentialDataChange: PropTypes.func
}
