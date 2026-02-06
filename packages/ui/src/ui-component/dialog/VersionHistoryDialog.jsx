import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import moment from 'moment'

// material-ui
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Tooltip,
    Stack,
    Typography,
    TextField,
    Box,
    Alert
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import { IconCheck, IconHistory, IconTrash, IconEye, IconCopy, IconCircleCheckFilled } from '@tabler/icons-react'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

const VersionHistoryDialog = ({ show, dialogProps, onCancel, onVersionLoad }) => {
    const portalElement = document.getElementById('portal')
    const theme = useTheme()
    const { confirm } = useConfirm()

    const [versions, setVersions] = useState([])
    const [masterId, setMasterId] = useState(null)
    const [_activeVersion, setActiveVersion] = useState(null)
    const [flowName, setFlowName] = useState('')
    const [error, setError] = useState(null)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [newVersionDescription, setNewVersionDescription] = useState('')
    const [sourceVersionNumber, setSourceVersionNumber] = useState(null)

    const getAllVersionsApi = useApi(chatflowsApi.getAllVersions)
    const setActiveVersionApi = useApi(chatflowsApi.setActiveVersion)
    const deleteVersionApi = useApi(chatflowsApi.deleteVersion)
    const createVersionApi = useApi(chatflowsApi.createVersion)

    useEffect(() => {
        if (show && dialogProps.chatflowId) {
            setMasterId(dialogProps.chatflowId)
            getAllVersionsApi.request(dialogProps.chatflowId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, dialogProps.chatflowId])

    useEffect(() => {
        if (getAllVersionsApi.data) {
            setVersions(getAllVersionsApi.data.versions || [])
            setActiveVersion(getAllVersionsApi.data.activeVersion)
            setFlowName(getAllVersionsApi.data.name)
            setError(null)
        } else if (getAllVersionsApi.error) {
            setError(getAllVersionsApi.error.response?.data?.message || 'Failed to load versions')
        }
    }, [getAllVersionsApi.data, getAllVersionsApi.error])

    useEffect(() => {
        if (setActiveVersionApi.data) {
            getAllVersionsApi.request(masterId)
        } else if (setActiveVersionApi.error) {
            setError(setActiveVersionApi.error.response?.data?.message || 'Failed to set active version')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setActiveVersionApi.data, setActiveVersionApi.error])

    useEffect(() => {
        if (deleteVersionApi.data) {
            getAllVersionsApi.request(masterId)
        } else if (deleteVersionApi.error) {
            setError(deleteVersionApi.error.response?.data?.message || 'Failed to delete version')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deleteVersionApi.data, deleteVersionApi.error])

    useEffect(() => {
        if (createVersionApi.data) {
            getAllVersionsApi.request(masterId)
            setCreateDialogOpen(false)
            setNewVersionDescription('')
            setSourceVersionNumber(null)
        } else if (createVersionApi.error) {
            setError(createVersionApi.error.response?.data?.message || 'Failed to create version')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createVersionApi.data, createVersionApi.error])

    const handleSetActive = async (versionNumber) => {
        const confirmPayload = {
            title: `Set Version ${versionNumber} as Active`,
            description: `Are you sure you want to set version ${versionNumber} as the active version?`,
            confirmButtonName: 'Confirm',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            setActiveVersionApi.request(masterId, versionNumber)
        }
    }

    const handleDelete = async (versionNumber, isActive) => {
        if (isActive) {
            setError('Cannot delete the active version. Please set another version as active first.')
            return
        }

        if (versions.length <= 1) {
            setError('Cannot delete the last remaining version.')
            return
        }

        const confirmPayload = {
            title: `Delete Version ${versionNumber}`,
            description: `Are you sure you want to delete version ${versionNumber}? This action cannot be undone.`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            deleteVersionApi.request(masterId, versionNumber)
        }
    }

    const handleViewVersion = (versionNumber) => {
        if (onVersionLoad) {
            onVersionLoad(versionNumber)
        }
        onCancel()
    }

    const handleCreateVersion = (sourceVersion) => {
        setSourceVersionNumber(sourceVersion)
        setCreateDialogOpen(true)
    }

    const handleConfirmCreateVersion = async () => {
        if (!sourceVersionNumber) return

        try {
            // Fetch the full source version data including flowData
            const sourceVersionData = await chatflowsApi.getVersion(masterId, sourceVersionNumber)

            if (!sourceVersionData.data) {
                setError('Failed to fetch source version data')
                return
            }

            const versionData = {
                flowData: sourceVersionData.data.flowData,
                chatbotConfig: sourceVersionData.data.chatbotConfig,
                apiConfig: sourceVersionData.data.apiConfig,
                analytic: sourceVersionData.data.analytic,
                speechToText: sourceVersionData.data.speechToText,
                textToSpeech: sourceVersionData.data.textToSpeech,
                followUpPrompts: sourceVersionData.data.followUpPrompts,
                apikeyid: sourceVersionData.data.apikeyid,
                changeDescription: newVersionDescription || `Created from version ${sourceVersionNumber}`,
                sourceVersion: sourceVersionNumber,
                isActive: false
            }

            createVersionApi.request(masterId, versionData)
        } catch (err) {
            setError('Failed to create version: ' + (err.message || 'Unknown error'))
        }
    }

    const component = show ? (
        <>
            <Dialog
                open={show}
                fullWidth
                maxWidth='md'
                onClose={onCancel}
                aria-labelledby='version-history-dialog-title'
                disableRestoreFocus
            >
                <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 600 }} id='version-history-dialog-title'>
                    <Stack direction='row' alignItems='center' spacing={1}>
                        <IconHistory />
                        <span>Version History - {flowName}</span>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {versions.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant='body1' color='text.secondary'>
                                No versions found
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Version</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Created By</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Created Date</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align='right'>
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {versions.map((version) => (
                                        <TableRow
                                            key={version.version}
                                            sx={{
                                                '&:hover': { bgcolor: theme.palette.action.hover },
                                                bgcolor: version.isActive ? alpha(theme.palette.success.light, 0.1) : 'inherit'
                                            }}
                                        >
                                            <TableCell>
                                                <Typography variant='body2' fontWeight={version.isActive ? 600 : 400}>
                                                    v{version.version}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {version.isActive && (
                                                    <Chip
                                                        icon={<IconCircleCheckFilled size={16} />}
                                                        label='Active'
                                                        color='success'
                                                        size='small'
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant='body2' noWrap sx={{ maxWidth: 200 }}>
                                                    {version.changeDescription || '-'}
                                                </Typography>
                                                {version.sourceVersion && (
                                                    <Typography variant='caption' color='text.secondary'>
                                                        From v{version.sourceVersion}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant='body2'>{version.createdBy || '-'}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant='body2'>
                                                    {moment(version.createdDate).format('MMM DD, YYYY HH:mm')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align='right'>
                                                <Stack direction='row' spacing={0.5} justifyContent='flex-end'>
                                                    <Tooltip title='View this version'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={() => handleViewVersion(version.version)}
                                                            sx={{ color: theme.palette.primary.main }}
                                                        >
                                                            <IconEye size={18} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {!version.isActive && (
                                                        <Tooltip title='Set as active'>
                                                            <IconButton
                                                                size='small'
                                                                onClick={() => handleSetActive(version.version)}
                                                                sx={{ color: theme.palette.success.main }}
                                                            >
                                                                <IconCheck size={18} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title='Create new version from this'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={() => handleCreateVersion(version.version)}
                                                            sx={{ color: theme.palette.info.main }}
                                                        >
                                                            <IconCopy size={18} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {!version.isActive && versions.length > 1 && (
                                                        <Tooltip title='Delete version'>
                                                            <IconButton
                                                                size='small'
                                                                onClick={() => handleDelete(version.version, version.isActive)}
                                                                sx={{ color: theme.palette.error.main }}
                                                            >
                                                                <IconTrash size={18} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCancel}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Create Version Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth='sm' fullWidth>
                <DialogTitle>Create New Version</DialogTitle>
                <DialogContent>
                    <Typography variant='body2' sx={{ mb: 2 }}>
                        Creating a new version from v{sourceVersionNumber}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label='Version Description (optional)'
                        placeholder='Describe the changes in this version...'
                        value={newVersionDescription}
                        onChange={(e) => setNewVersionDescription(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <StyledButton variant='contained' onClick={handleConfirmCreateVersion}>
                        Create Version
                    </StyledButton>
                </DialogActions>
            </Dialog>

            <ConfirmDialog />
        </>
    ) : null

    return createPortal(component, portalElement)
}

VersionHistoryDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onVersionLoad: PropTypes.func
}

export default VersionHistoryDialog
