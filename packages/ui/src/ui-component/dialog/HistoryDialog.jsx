import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Button,
    Chip,
    Paper,
    Skeleton,
    Alert,
    DialogActions,
    Tooltip
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// icons
import { IconHistory, IconRestore, IconTrash, IconEye, IconX } from '@tabler/icons-react'

// project imports
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// API
import historyApi from '@/api/history'

// utils
import moment from 'moment'

const HistoryDialog = ({ show, dialogProps, onCancel, onRestore }) => {
    const theme = useTheme()
    const portalElement = document.getElementById('portal')
    const { confirm } = useConfirm()
    const dispatch = useDispatch()
    useNotifier() // Side effect hook

    const enqueueSnackbar = useCallback((...args) => dispatch(enqueueSnackbarAction(...args)), [dispatch])

    const [historyItems, setHistoryItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedSnapshot, setSelectedSnapshot] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [latestVersion, setLatestVersion] = useState(null)
    const [reloadTrigger, setReloadTrigger] = useState(0)

    const { entityType, entityId, entityName, currentVersion } = dialogProps || {}
    const itemsPerPage = 10

    // Load history when dialog opens
    useEffect(() => {
        if (!show || !entityType || !entityId) return

        const loadHistory = async () => {
            try {
                setLoading(true)
                const params = { page: currentPage, limit: itemsPerPage }
                const response = await historyApi.getHistory(entityType, entityId, params)
                const historyData = response.data.data || []

                setHistoryItems(historyData)
                setTotalItems(response.data.total)

                if (latestVersion === null && currentPage === 1) {
                    // Set latest version only when on first page
                    setLatestVersion(historyData[0]?.version || null)
                }
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to load history: ${error.message}`,
                    options: { variant: 'error' }
                })
            } finally {
                setLoading(false)
            }
        }

        loadHistory()
    }, [show, entityType, entityId, currentPage, reloadTrigger, enqueueSnackbar])

    const handleRestore = async (historyItem) => {
        const confirmed = await confirm({
            title: 'Restore Version',
            description: `Are you sure you want to restore "${entityName}" to version ${historyItem.version}? This will create a new version with the restored data.`,
            confirmButtonName: 'Restore',
            cancelButtonName: 'Cancel'
        })

        if (confirmed) {
            try {
                const response = await historyApi.restoreSnapshot(historyItem.id)
                enqueueSnackbar({
                    message: `Successfully restored to version ${historyItem.version}`,
                    options: { variant: 'success' }
                })
                const restoreData = { ...response.data, version: historyItem.version }
                onRestore?.(restoreData)
                onCancel()
            } catch (error) {
                console.error('Restore error:', error)
                enqueueSnackbar({
                    message: `Failed to restore: ${error.message}`,
                    options: { variant: 'error' }
                })
            }
        }
    }

    const handleDelete = async (historyItem) => {
        const confirmed = await confirm({
            title: 'Delete Version',
            description: `Are you sure you want to delete version ${historyItem.version}? This action cannot be undone.`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        })

        if (confirmed) {
            try {
                await historyApi.deleteSnapshot(historyItem.id)
                enqueueSnackbar({
                    message: `Successfully deleted version ${historyItem.version}`,
                    options: { variant: 'success' }
                })

                // Force reload by triggering useEffect
                setHistoryItems([])
                setLatestVersion(null)
                setReloadTrigger((prev) => prev + 1)
            } catch (error) {
                console.error('Delete error:', error)
                enqueueSnackbar({
                    message: `Failed to delete: ${error.message}`,
                    options: { variant: 'error' }
                })
            }
        }
    }

    const handleViewSnapshot = async (historyItem) => {
        try {
            const response = await historyApi.getSnapshotById(historyItem.id)
            setSelectedSnapshot(response.data)
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to load snapshot: ${error.message}`,
                options: { variant: 'error' }
            })
        }
    }

    const formatDate = (dateString) => moment(dateString).fromNow()
    const getVersionChipColor = (version, isCurrent) => (isCurrent ? 'success' : version === 1 ? 'secondary' : 'default')

    const component = show ? (
        <Dialog fullWidth maxWidth='md' open={show} onClose={onCancel} aria-labelledby='history-dialog-title'>
            <DialogTitle sx={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconHistory size={24} />
                Version History - {entityName}
            </DialogTitle>

            <DialogContent>
                {loading ? (
                    <Box>
                        {[1, 2, 3].map((item) => (
                            <Skeleton key={item} variant='rectangular' height={80} sx={{ mb: 1 }} />
                        ))}
                    </Box>
                ) : historyItems.length === 0 ? (
                    <Alert severity='info'>No version history found. History is automatically created when you save changes.</Alert>
                ) : (
                    <Box>
                        <List>
                            {historyItems.map((item) => {
                                const isCurrent = item.version === currentVersion
                                const isLatest = item.version === latestVersion
                                return (
                                    <Paper key={`${item.id}-${item.version}-${currentPage}`} sx={{ mb: 1 }}>
                                        <ListItem>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                        <Chip
                                                            label={`v${item.version}`}
                                                            size='small'
                                                            color={getVersionChipColor(item.version, isCurrent)}
                                                        />
                                                        {isCurrent && <Chip label='Current' size='small' color='primary' />}
                                                        {isLatest && !isCurrent && <Chip label='Latest' size='small' color='secondary' />}
                                                        <Typography variant='body2' sx={{ ml: 1 }}>
                                                            {item.changeDescription || 'No description'}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondary={
                                                    <Typography variant='caption' color='text.secondary'>
                                                        {formatDate(item.createdDate)}
                                                    </Typography>
                                                }
                                            />
                                            <ListItemSecondaryAction>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <Tooltip title='View snapshot'>
                                                        <IconButton size='small' onClick={() => handleViewSnapshot(item)}>
                                                            <IconEye size={16} />
                                                        </IconButton>
                                                    </Tooltip>

                                                    {!isCurrent && (
                                                        <Tooltip title='Restore this version'>
                                                            <IconButton size='small' onClick={() => handleRestore(item)} color='primary'>
                                                                <IconRestore size={16} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}

                                                    <Tooltip title='Delete this version'>
                                                        <IconButton size='small' onClick={() => handleDelete(item)} color='error'>
                                                            <IconTrash size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    </Paper>
                                )
                            })}
                        </List>

                        {totalItems > itemsPerPage && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                <Button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
                                    Previous
                                </Button>
                                <Typography sx={{ mx: 2, alignSelf: 'center' }}>
                                    Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)}
                                </Typography>
                                <Button
                                    disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                                    onClick={() => setCurrentPage((prev) => prev + 1)}
                                >
                                    Next
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onCancel}>Close</Button>
            </DialogActions>

            {selectedSnapshot && (
                <Dialog fullWidth maxWidth='lg' open={Boolean(selectedSnapshot)} onClose={() => setSelectedSnapshot(null)}>
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconEye size={24} />
                        Version {selectedSnapshot.version} Snapshot
                        <IconButton sx={{ ml: 'auto' }} onClick={() => setSelectedSnapshot(null)}>
                            <IconX size={20} />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Typography variant='subtitle2' gutterBottom>
                            Change Description: {selectedSnapshot.changeDescription || 'No description'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary' gutterBottom display='block'>
                            Created: {formatDate(selectedSnapshot.createdDate)}
                        </Typography>

                        <Paper sx={{ p: 2, mt: 2, backgroundColor: theme.palette.grey[50] }}>
                            <Typography
                                variant='body2'
                                component='pre'
                                sx={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontFamily: 'monospace',
                                    fontSize: '0.8rem'
                                }}
                            >
                                {JSON.stringify(JSON.parse(selectedSnapshot.snapshotData), null, 2)}
                            </Typography>
                        </Paper>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

export default HistoryDialog
