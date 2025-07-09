import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'

// material-ui
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Box,
    Typography,
    Select,
    MenuItem,
    FormControl,
    IconButton,
    Divider,
    Stack,
    useTheme,
    CircularProgress,
    Paper,
    Avatar,
    InputLabel,
    Chip
} from '@mui/material'
import { IconPlus, IconX, IconLock } from '@tabler/icons-react'

// project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import AddEditCredentialDialog from '@/views/credentials/AddEditCredentialDialog'
import { groupCredentialsByType } from '@/utils/flowCredentialsHelper'

// API
import credentialsApi from '@/api/credentials'

// Assets
import keySVG from '@/assets/images/key.svg'

// Constants
import { baseURL } from '@/store/constant'

// ==============================|| UnifiedCredentialsModal ||============================== //

const UnifiedCredentialsModal = ({ show, missingCredentials, onAssign, onSkip, onCancel, flowData }) => {
    const theme = useTheme()
    const portalElement = document.getElementById('portal')

    const [credentialAssignments, setCredentialAssignments] = useState({})
    const [availableCredentials, setAvailableCredentials] = useState({})
    const [loading, setLoading] = useState(false)
    const [showCredentialDialog, setShowCredentialDialog] = useState(false)
    const [credentialDialogProps, setCredentialDialogProps] = useState({})
    const [refreshKey, setRefreshKey] = useState(0)

    // Group credentials by type for better organization
    const groupedCredentials = groupCredentialsByType(missingCredentials)

    // Load available credentials when modal opens
    useEffect(() => {
        if (show && missingCredentials.length > 0) {
            const loadCredentials = async () => {
                setLoading(true)
                const credentialsData = {}
                const groupedCreds = groupCredentialsByType(missingCredentials)

                try {
                    // Load credentials for each group
                    await Promise.all(
                        Object.entries(groupedCreds).map(async ([groupKey, group]) => {
                            try {
                                // For grouped credentials, load all credential types in the group
                                const credentialTypes = group.credentialTypes || [group.credentialName]
                                const allCredentials = []

                                await Promise.all(
                                    credentialTypes.map(async (credType) => {
                                        try {
                                            const response = await credentialsApi.getAllCredentials()
                                            const credentialsOfType = response.data.filter((cred) => cred.credentialName === credType)
                                            allCredentials.push(...credentialsOfType)
                                        } catch (error) {
                                            console.warn(`Failed to load credentials for type ${credType}:`, error)
                                        }
                                    })
                                )

                                credentialsData[groupKey] = allCredentials
                                console.log(`📋 Loaded ${allCredentials.length} credentials for group ${groupKey}:`, allCredentials)
                            } catch (error) {
                                console.error(`Failed to load credentials for group ${groupKey}:`, error)
                                credentialsData[groupKey] = []
                            }
                        })
                    )

                    setAvailableCredentials(credentialsData)

                    // Auto-select credentials where there's only one option
                    const autoSelections = {}
                    Object.entries(credentialsData).forEach(([groupKey, creds]) => {
                        if (creds && creds.length === 1) {
                            // Auto-select for all nodes in this group
                            groupedCreds[groupKey].nodes.forEach((node) => {
                                autoSelections[node.nodeId] = creds[0].id
                            })
                        }
                    })

                    if (Object.keys(autoSelections).length > 0) {
                        setCredentialAssignments(autoSelections)
                        console.log('🎯 Auto-selected credentials:', autoSelections)
                    }
                } catch (error) {
                    console.error('Error loading credentials:', error)
                } finally {
                    setLoading(false)
                }
            }

            loadCredentials()
        }
    }, [show, missingCredentials])

    const handleCredentialChange = (nodeId, credentialId) => {
        setCredentialAssignments((prev) => ({
            ...prev,
            [nodeId]: credentialId
        }))
    }

    const handleAddCredential = (credentialName) => {
        // Find the component credential info
        fetch(`${baseURL}/api/v1/components-credentials/${credentialName}`)
            .then((response) => response.json())
            .then((componentCredential) => {
                const dialogProps = {
                    type: 'ADD',
                    cancelButtonName: 'Cancel',
                    confirmButtonName: 'Add',
                    credentialComponent: componentCredential
                }
                setCredentialDialogProps(dialogProps)
                setShowCredentialDialog(true)
            })
            .catch((error) => {
                console.error('Error loading credential component:', error)
            })
    }

    const handleCredentialDialogConfirm = () => {
        setShowCredentialDialog(false)
        setRefreshKey((prev) => prev + 1) // Refresh available credentials
    }

    const handleAssignCredentials = () => {
        if (onAssign) {
            onAssign(credentialAssignments)
        }
    }

    const handleSkip = () => {
        if (onSkip) {
            onSkip()
        }
    }

    const handleCancel = () => {
        if (onCancel) {
            onCancel()
        }
    }

    const getCredentialIcon = (credentialName) => {
        return `${baseURL}/api/v1/components-credentials-icon/${credentialName}`
    }

    const handleCreateCredential = (credentialName) => {
        // Find the component credential info
        fetch(`${baseURL}/api/v1/components-credentials/${credentialName}`)
            .then((response) => response.json())
            .then((componentCredential) => {
                const dialogProps = {
                    type: 'ADD',
                    cancelButtonName: 'Cancel',
                    confirmButtonName: 'Add',
                    credentialComponent: componentCredential
                }
                setCredentialDialogProps(dialogProps)
                setShowCredentialDialog(true)
            })
            .catch((error) => {
                console.error('Error loading credential component:', error)
            })
    }

    const renderCredentialRow = (credentialName, credentialInfo) => {
        const available = availableCredentials[credentialName] || []
        const nodes = credentialInfo.nodes

        return (
            <Box key={credentialName} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
                            alt={credentialName}
                            src={getCredentialIcon(credentialName)}
                            onError={(e) => {
                                e.target.onerror = null
                                e.target.style.padding = '5px'
                                e.target.src = keySVG
                            }}
                        />
                    </Box>
                    <Typography variant='h6' sx={{ flex: 1 }}>
                        {credentialInfo.label}
                    </Typography>
                    <IconButton
                        size='small'
                        color='primary'
                        onClick={() => handleAddCredential(credentialName)}
                        title='Add new credential'
                        sx={{ ml: 1 }}
                    >
                        <IconPlus />
                    </IconButton>
                </Box>

                {/* Show nodes that need this credential */}
                <Box sx={{ ml: 6, mb: 2 }}>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                        Required by: {nodes.map((n) => n.nodeName).join(', ')}
                    </Typography>
                </Box>

                {/* Credential selection */}
                {nodes.map((node) => (
                    <Box key={node.nodeId} sx={{ ml: 6, mb: 1, display: 'flex', alignItems: 'center' }}>
                        <Typography variant='body2' sx={{ minWidth: 120, mr: 2 }}>
                            {node.nodeName}:
                        </Typography>
                        <FormControl size='small' sx={{ minWidth: 200 }}>
                            <Select
                                value={credentialAssignments[node.nodeId] || ''}
                                onChange={(e) => handleCredentialChange(node.nodeId, e.target.value)}
                                displayEmpty
                                disabled={loading || available.length === 0}
                            >
                                <MenuItem value=''>
                                    <em>Select credential...</em>
                                </MenuItem>
                                {available.map((credential) => (
                                    <MenuItem key={credential.id} value={credential.id}>
                                        {credential.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                ))}
            </Box>
        )
    }

    if (!show) return null

    const component = (
        <Dialog
            open={show}
            onClose={handleCancel}
            maxWidth='md'
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2
                }
            }}
        >
            <DialogTitle
                sx={{
                    fontSize: '1.2rem',
                    pb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <Typography variant='h5'>Setup Required Credentials</Typography>
                <IconButton onClick={handleCancel} size='small'>
                    <IconX />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ padding: 3, minHeight: '400px' }}>
                {loading ? (
                    <Box display='flex' justifyContent='center' alignItems='center' minHeight='200px'>
                        <CircularProgress />
                        <Typography sx={{ ml: 2 }}>Loading credentials...</Typography>
                    </Box>
                ) : (
                    <Stack spacing={3}>
                        {Object.entries(groupedCredentials).map(([groupKey, group]) => {
                            const credentialsForGroup = availableCredentials[groupKey] || []
                            const hasMultipleNodes = group.nodes.length > 1

                            return (
                                <Paper key={groupKey} elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                                    <Stack spacing={2}>
                                        {/* Credential Header */}
                                        <Box display='flex' alignItems='center' gap={2}>
                                            <Avatar
                                                src={`${baseURL}/api/v1/components-credentials-icon/${
                                                    group.credentialTypes?.[0] || group.credentialName
                                                }`}
                                                sx={{ width: 32, height: 32 }}
                                            >
                                                <IconLock />
                                            </Avatar>
                                            <Box flex={1}>
                                                <Typography variant='h6' fontWeight='bold'>
                                                    {group.label}
                                                </Typography>
                                                <Typography variant='body2' color='text.secondary'>
                                                    {hasMultipleNodes
                                                        ? `Required by ${group.nodes.length} nodes`
                                                        : `Required by ${group.nodes[0].nodeName}`}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Credential Selector */}
                                        <Box>
                                            <FormControl fullWidth>
                                                <InputLabel>Select Credential</InputLabel>
                                                <Select
                                                    value={group.nodes.length > 0 ? credentialAssignments[group.nodes[0].nodeId] || '' : ''}
                                                    onChange={(e) => {
                                                        // Apply the same credential to all nodes in this group
                                                        group.nodes.forEach((node) => {
                                                            handleCredentialChange(node.nodeId, e.target.value)
                                                        })
                                                    }}
                                                    label='Select Credential'
                                                    sx={{ mb: 1 }}
                                                >
                                                    {credentialsForGroup.map((credential) => (
                                                        <MenuItem key={credential.id} value={credential.id}>
                                                            <Box display='flex' alignItems='center' gap={1}>
                                                                <Typography>{credential.name}</Typography>
                                                                <Typography variant='caption' color='text.secondary'>
                                                                    ({credential.credentialName})
                                                                </Typography>
                                                            </Box>
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>

                                            {/* Add new credential button */}
                                            <Button
                                                startIcon={<IconPlus />}
                                                onClick={() => handleCreateCredential(group.credentialTypes?.[0] || group.credentialName)}
                                                size='small'
                                                sx={{ mt: 1 }}
                                            >
                                                Add New {group.label}
                                            </Button>
                                        </Box>

                                        {/* Show affected nodes if multiple */}
                                        {hasMultipleNodes && (
                                            <Box>
                                                <Typography variant='caption' color='text.secondary' gutterBottom>
                                                    Affected nodes:
                                                </Typography>
                                                <Box display='flex' flexWrap='wrap' gap={0.5}>
                                                    {group.nodes.map((node) => (
                                                        <Chip key={node.nodeId} label={node.nodeName} size='small' variant='outlined' />
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}
                                    </Stack>
                                </Paper>
                            )
                        })}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={handleSkip} color='inherit'>
                    Skip for now
                </Button>
                <StyledButton variant='contained' onClick={handleAssignCredentials} disabled={loading}>
                    Assign & Continue
                </StyledButton>
            </DialogActions>

            {/* Credential creation dialog */}
            <AddEditCredentialDialog
                show={showCredentialDialog}
                dialogProps={credentialDialogProps}
                onCancel={() => setShowCredentialDialog(false)}
                onConfirm={handleCredentialDialogConfirm}
            />
        </Dialog>
    )

    return portalElement ? createPortal(component, portalElement) : component
}

UnifiedCredentialsModal.propTypes = {
    show: PropTypes.bool.isRequired,
    missingCredentials: PropTypes.array.isRequired,
    onAssign: PropTypes.func.isRequired,
    onSkip: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    flowData: PropTypes.object
}

export default UnifiedCredentialsModal 