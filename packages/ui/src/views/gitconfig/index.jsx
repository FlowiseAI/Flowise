import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

// material-ui
import {
    Button,
    Box,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    Skeleton
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ErrorBoundary from '@/ErrorBoundary'
import gitConfigApi from '@/api/gitconfig'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'
import AddEditGitConfigDialog from './AddEditGitConfigDialog'

// icons
import { IconTrash, IconEdit, IconCheck, IconPlus } from '@tabler/icons-react'

const GitConfigList = () => {
    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)
    const [gitConfigs, setGitConfigs] = useState([])
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [confirmDialogProps, setConfirmDialogProps] = useState({})
    const [error, setError] = useState(null)
    // Placeholder for add/edit dialog state
    const [showDialog, setShowDialog] = useState(false)
    const [dialogType, setDialogType] = useState('ADD')
    const [selectedConfig, setSelectedConfig] = useState(null)

    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const fetchGitConfigs = async () => {
        setLoading(true)
        try {
            const res = await gitConfigApi.getAllGitConfigs()
            setGitConfigs(res.data || res)
        } catch (err) {
            setError(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchGitConfigs()
    }, [])

    const handleAdd = () => {
        setDialogType('ADD')
        setSelectedConfig(null)
        setShowDialog(true)
    }

    const handleEdit = (config) => {
        setDialogType('EDIT')
        setSelectedConfig(config)
        setShowDialog(true)
    }

    const handleDelete = (config) => {
        setConfirmDialogProps({
            title: 'Delete',
            description: `Delete Git Config for provider ${config.provider}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel',
            onConfirm: () => confirmDelete(config.id)
        })
        setShowConfirmDialog(true)
    }

    const confirmDelete = async (id) => {
        setShowConfirmDialog(false)
        try {
            await gitConfigApi.deleteGitConfig(id)
            enqueueSnackbar({
                message: 'Git Config deleted',
                options: { variant: 'success' }
            })
            fetchGitConfigs()
        } catch (err) {
            enqueueSnackbar({
                message: 'Failed to delete Git Config',
                options: { variant: 'error' }
            })
        }
    }

    const handleActivate = (config) => {
        setConfirmDialogProps({
            title: 'Activate',
            description: `Set Git Config for provider ${config.provider} as active?`,
            confirmButtonName: 'Activate',
            cancelButtonName: 'Cancel',
            onConfirm: () => confirmActivate(config.id)
        })
        setShowConfirmDialog(true)
    }

    const confirmActivate = async (id) => {
        setShowConfirmDialog(false)
        try {
            await gitConfigApi.activateGitConfig(id)
            enqueueSnackbar({
                message: 'Git Config activated',
                options: { variant: 'success' }
            })
            fetchGitConfigs()
        } catch (err) {
            enqueueSnackbar({
                message: 'Failed to activate Git Config',
                options: { variant: 'error' }
            })
        }
    }

    // Placeholder for add/edit dialog submit
    const handleDialogSubmit = async (data) => {
        setShowDialog(false)
        try {
            if (dialogType === 'ADD') {
                await gitConfigApi.createGitConfig(data)
                enqueueSnackbar({ message: 'Git Config added', options: { variant: 'success' } })
            } else {
                await gitConfigApi.updateGitConfig(selectedConfig.id, data)
                enqueueSnackbar({ message: 'Git Config updated', options: { variant: 'success' } })
            }
            fetchGitConfigs()
        } catch (err) {
            enqueueSnackbar({ message: 'Failed to save Git Config', options: { variant: 'error' } })
        }
    }

    return (
        <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            isBackButton={false}
                            isEditButton={false}
                            search={false}
                            title='Git Configuration'
                            description=''
                        >
                            {/* TODO: Change the permissionId to 'gitconfig:create' when support for other providers is added */}
                            <StyledPermissionButton
                                permissionId={'datasets:create'}
                                variant='contained'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={handleAdd}
                                startIcon={<IconPlus />}
                            >
                                Add New
                            </StyledPermissionButton>
                        </ViewHeader>
                        <Box>
                            <TableContainer
                                sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                component={Paper}
                            >
                                <Table>
                                    <TableHead sx={{
                                            backgroundColor: customization.isDarkMode
                                                ? theme.palette.common.black
                                                : theme.palette.grey[100],
                                            height: 56
                                        }}>
                                        <TableRow>
                                            <StyledTableCell>Provider</StyledTableCell>
                                            <StyledTableCell>Repository</StyledTableCell>
                                            <StyledTableCell>Username</StyledTableCell>
                                            <StyledTableCell>Auth Mode</StyledTableCell>
                                            <StyledTableCell>Branch Name</StyledTableCell>
                                            <StyledTableCell>Active</StyledTableCell>
                                            <StyledTableCell>Actions</StyledTableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={7}><Skeleton variant="rectangular" height={40} /></TableCell>
                                            </TableRow>
                                        ) : gitConfigs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center">No Git Configs found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            gitConfigs.map((config) => (
                                                <TableRow key={config.id}>
                                                    <TableCell>{config.provider}</TableCell>
                                                    <TableCell>{config.repository}</TableCell>
                                                    <TableCell>{config.username}</TableCell>
                                                    <TableCell>{config.authMode}</TableCell>
                                                    <TableCell>{config.branchName}</TableCell>
                                                    <TableCell>
                                                        {config.isActive ? <Chip label="Active" color="success" size="small" icon={<IconCheck size={16} />} /> : ''}
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton onClick={() => handleEdit(config)}><IconEdit size={18} /></IconButton>
                                                        <IconButton onClick={() => handleDelete(config)}><IconTrash size={18} /></IconButton>
                                                        {!config.isActive && <IconButton onClick={() => handleActivate(config)}><IconCheck size={18} /></IconButton>}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    </Stack>
            )}
            <ConfirmDialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)} {...confirmDialogProps} />
            <AddEditGitConfigDialog
                show={showDialog}
                dialogProps={{
                    type: dialogType,
                    data: selectedConfig,
                    cancelButtonName: 'Cancel',
                    confirmButtonName: dialogType === 'ADD' ? 'Add' : 'Save'
                }}
                onCancel={() => setShowDialog(false)}
                onConfirm={handleDialogSubmit}
            />
        </MainCard>
    )
}

export default GitConfigList
