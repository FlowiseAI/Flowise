'use client'
import React, { useState, useEffect } from 'react'
import {
    Container,
    Typography,
    Card,
    CardContent,
    Box,
    CircularProgress,
    Alert,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Switch,
    Collapse,
    IconButton,
    Tooltip,
    Button,
    Chip,
    Stack
} from '@mui/material'
import { Settings as SettingsIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Add as AddIcon } from '@mui/icons-material'
import { EnabledIntegration } from 'types'

// API
// @ts-ignore
import credentialsApi from '@/api/credentials'

// Hooks
// @ts-ignore
import useApi from '@/hooks/useApi'

// Constants
// @ts-ignore
import { baseURL } from '@/store/constant'
// @ts-ignore
import keySVG from '@/assets/images/key.svg'

interface ComponentCredential {
    name: string
    label: string
    description?: string
    category?: string
    iconSrc?: string
}

const OrgCredentialsManager: React.FC = () => {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [integrations, setIntegrations] = useState<EnabledIntegration[]>([])
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
    const [organizationCredentials, setOrganizationCredentials] = useState<any[]>([])

    // Use the same API hooks as the existing credential system
    const getAllComponentsCredentialsApi = useApi(credentialsApi.getAllComponentsCredentials)
    const getAllCredentialsApi = useApi(credentialsApi.getAllCredentials)
    const getOrgCredentialsApi = useApi(credentialsApi.getOrgCredentials)
    const updateOrgCredentialsApi = useApi(credentialsApi.updateOrgCredentials)

    useEffect(() => {
        getOrgCredentialsApi.request()
        getAllComponentsCredentialsApi.request()
        getAllCredentialsApi.request()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (getOrgCredentialsApi.data) {
            setIntegrations(getOrgCredentialsApi.data.integrations || [])
        }
    }, [getOrgCredentialsApi.data])

    useEffect(() => {
        if (getAllCredentialsApi.data) {
            // Filter for organization credentials only (not user-owned)
            const orgCreds = getAllCredentialsApi.data.filter((cred: any) => !cred.isOwner)
            setOrganizationCredentials(orgCreds)
        }
    }, [getAllCredentialsApi.data])

    // Handle API errors in useEffect to prevent infinite re-renders
    useEffect(() => {
        const apiError = getAllComponentsCredentialsApi.error || getOrgCredentialsApi.error
        if (apiError) {
            setError(apiError.message || 'Failed to load credentials data')
        }
    }, [getAllComponentsCredentialsApi.error, getOrgCredentialsApi.error])

    // Watch for updates from the updateOrgCredentialsApi and update local state
    useEffect(() => {
        if (updateOrgCredentialsApi.data?.integrations) {
            setIntegrations(updateOrgCredentialsApi.data.integrations)
        }
    }, [updateOrgCredentialsApi.data])

    const handleToggleIntegration = async (credentialName: string, enabled: boolean) => {
        try {
            setSaving(true)
            setError(null) // Clear any previous errors

            let updatedIntegrations: EnabledIntegration[]

            if (enabled) {
                // Find the credential info from available credentials
                const credentialInfo = getAllComponentsCredentialsApi.data?.find((c: any) => c.name === credentialName)
                if (!credentialInfo) {
                    setError('Credential information not found')
                    return
                }

                // Add to enabled integrations
                const newIntegration: EnabledIntegration = {
                    credentialName,
                    label: credentialInfo.label,
                    description: credentialInfo.description,
                    enabled: true,
                    organizationCredentialIds: []
                }

                updatedIntegrations = [...integrations.filter((i) => i.credentialName !== credentialName), newIntegration]
            } else {
                // Update existing integration to disabled
                updatedIntegrations = integrations.map((i) => (i.credentialName === credentialName ? { ...i, enabled: false } : i))
            }

            // Update local state optimistically for immediate UI feedback
            setIntegrations(updatedIntegrations)

            // Make the API call
            await updateOrgCredentialsApi.request(updatedIntegrations)
        } catch (err: any) {
            console.error('Failed to update integrations:', err)
            setError(updateOrgCredentialsApi.error?.message || err.message || 'Failed to update integrations')

            // Revert the optimistic update on error by refetching
            getOrgCredentialsApi.request()
        } finally {
            setSaving(false)
        }
    }

    const handleExpandCard = (credentialName: string) => {
        setExpandedCards((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(credentialName)) {
                newSet.delete(credentialName)
            } else {
                newSet.add(credentialName)
            }
            return newSet
        })
    }

    const getIntegrationStatus = (credentialName: string): boolean => {
        if (!integrations || !Array.isArray(integrations)) return false
        const integration = integrations.find((i) => i.credentialName === credentialName)
        return integration ? integration.enabled : false
    }

    const getIntegrationDetails = (credentialName: string): EnabledIntegration | undefined => {
        if (!integrations || !Array.isArray(integrations)) return undefined
        return integrations.find((i) => i.credentialName === credentialName)
    }

    const getCredentialsForIntegration = (credentialName: string) => {
        return organizationCredentials.filter((cred: any) => cred.credentialName === credentialName)
    }

    const handleCreateNewCredential = (credentialName: string) => {
        window.open(`/sidekick-studio/credentials?cred=${credentialName}`, '_blank')
    }

    const handleEditCredential = (credentialId: string) => {
        window.open(`/sidekick-studio/credentials?cred=${credentialId}`, '_blank')
    }

    const groupCredentialsByCategory = (credentials: ComponentCredential[]) => {
        const groups: { [key: string]: ComponentCredential[] } = {}
        credentials.forEach((cred) => {
            const category = cred.category || 'Other'
            if (!groups[category]) {
                groups[category] = []
            }
            groups[category].push(cred)
        })
        return groups
    }

    if (getAllComponentsCredentialsApi.loading || getOrgCredentialsApi.loading) {
        return (
            <Container>
                <Box display='flex' justifyContent='center' alignItems='center' minHeight='200px'>
                    <CircularProgress />
                </Box>
            </Container>
        )
    }

    // API errors are now handled in useEffect above

    // Transform the API data to include category and icon info
    const availableCredentials: ComponentCredential[] =
        getAllComponentsCredentialsApi.data?.map((cred: any) => ({
            name: cred.name,
            label: cred.label,
            description: cred.description,
            category: 'Integration', // Default category since the API doesn't provide categories
            iconSrc: `${baseURL}/api/v1/components-credentials-icon/${cred.name}`
        })) || []

    const groupedCredentials = groupCredentialsByCategory(availableCredentials)

    return (
        <Container maxWidth='lg'>
            <Box py={3}>
                <Box display='flex' alignItems='center' mb={3}>
                    <SettingsIcon sx={{ mr: 2, fontSize: 32 }} />
                    <Typography variant='h4' component='h1'>
                        Organization Credentials
                    </Typography>
                </Box>

                <Typography variant='body1' color='text.secondary' mb={3}>
                    Control which credential integrations are available to users in your organization. Only enabled integrations will appear
                    in the credential selection dialog.
                </Typography>

                {error && (
                    <Alert severity='error' sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {Object.entries(groupedCredentials).map(([category, categoryCredentials]) => (
                    <Card key={category} sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant='h6' sx={{ mb: 2 }}>
                                {category}
                            </Typography>

                            <List>
                                {categoryCredentials.map((credential) => {
                                    const isEnabled = getIntegrationStatus(credential.name)
                                    const integrationDetails = getIntegrationDetails(credential.name)
                                    const isExpanded = expandedCards.has(credential.name)

                                    return (
                                        <Box key={credential.name}>
                                            <ListItem divider>
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: '50%',
                                                        backgroundColor: 'white',
                                                        mr: 2,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <img
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            padding: 6,
                                                            borderRadius: '50%',
                                                            objectFit: 'contain'
                                                        }}
                                                        alt={credential.name}
                                                        src={credential.iconSrc}
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement
                                                            target.onerror = null
                                                            target.style.padding = '5px'
                                                            target.src = keySVG
                                                        }}
                                                    />
                                                </Box>
                                                <ListItemText primary={credential.label} secondary={credential.name} />
                                                <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center' }}>
                                                    {isEnabled && (
                                                        <Tooltip title='Configure integration settings'>
                                                            <IconButton
                                                                edge='end'
                                                                onClick={() => handleExpandCard(credential.name)}
                                                                sx={{ mr: 1 }}
                                                            >
                                                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    <Switch
                                                        edge='end'
                                                        checked={isEnabled}
                                                        onChange={(e) => handleToggleIntegration(credential.name, e.target.checked)}
                                                        disabled={saving}
                                                    />
                                                </ListItemSecondaryAction>
                                            </ListItem>

                                            {/* Expandable configuration section */}
                                            {isEnabled && integrationDetails && (
                                                <Collapse in={isExpanded} timeout='auto' unmountOnExit>
                                                    <Box sx={{ pl: 8, pr: 2, pb: 2 }}>
                                                        <Typography variant='subtitle2' sx={{ mb: 2, fontWeight: 'bold' }}>
                                                            Organization Credentials
                                                        </Typography>

                                                        {/* Create New Credential Button */}
                                                        <Box sx={{ mb: 3 }}>
                                                            <Button
                                                                variant='outlined'
                                                                startIcon={<AddIcon />}
                                                                onClick={() => handleCreateNewCredential(credential.name)}
                                                                size='small'
                                                            >
                                                                Create New {credential.label} Credential
                                                            </Button>
                                                        </Box>

                                                        {/* Existing Credentials List */}
                                                        <Box>
                                                            <Typography variant='body2' fontWeight='medium' sx={{ mb: 1 }}>
                                                                Existing Credentials
                                                            </Typography>

                                                            {(() => {
                                                                const credentials = getCredentialsForIntegration(credential.name)
                                                                if (credentials.length === 0) {
                                                                    return (
                                                                        <Typography
                                                                            variant='body2'
                                                                            color='text.secondary'
                                                                            sx={{ fontStyle: 'italic', mb: 2 }}
                                                                        >
                                                                            No organization credentials configured yet
                                                                        </Typography>
                                                                    )
                                                                }

                                                                return (
                                                                    <Stack spacing={1} sx={{ mb: 2 }}>
                                                                        {credentials.map((cred: any) => (
                                                                            <Chip
                                                                                key={cred.id}
                                                                                label={cred.name || cred.id}
                                                                                onClick={() => handleEditCredential(cred.id)}
                                                                                clickable
                                                                                variant='outlined'
                                                                                size='small'
                                                                                sx={{
                                                                                    justifyContent: 'flex-start',
                                                                                    '&:hover': {
                                                                                        backgroundColor: 'action.hover'
                                                                                    }
                                                                                }}
                                                                            />
                                                                        ))}
                                                                    </Stack>
                                                                )
                                                            })()}
                                                            <Typography variant='caption' color='text.secondary'>
                                                                Click on a credential to edit it, or create a new one to add more options.
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Collapse>
                                            )}
                                        </Box>
                                    )
                                })}
                            </List>
                        </CardContent>
                    </Card>
                ))}

                {availableCredentials.length === 0 && (
                    <Card>
                        <CardContent>
                            <Typography variant='body1' color='text.secondary' textAlign='center' py={4}>
                                No credential integrations available.
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>
        </Container>
    )
}

export default OrgCredentialsManager
