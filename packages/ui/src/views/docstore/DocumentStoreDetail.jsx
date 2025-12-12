import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import * as PropTypes from 'prop-types'
import { useNavigate, useParams } from 'react-router-dom'

// material-ui
import {
    Box,
    Stack,
    Typography,
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    Menu,
    MenuItem,
    Divider,
    Button,
    Skeleton
} from '@mui/material'
import { alpha, styled, useTheme } from '@mui/material/styles'
import { tableCellClasses } from '@mui/material/TableCell'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import AddDocStoreDialog from '@/views/docstore/AddDocStoreDialog'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import DocumentLoaderListDialog from '@/views/docstore/DocumentLoaderListDialog'
import ErrorBoundary from '@/ErrorBoundary'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import DeleteDocStoreDialog from './DeleteDocStoreDialog'
import { Available } from '@/ui-component/rbac/available'
import { PermissionIconButton, StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import DocumentStoreStatus from '@/views/docstore/DocumentStoreStatus'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import DocStoreAPIDialog from './DocStoreAPIDialog'

// API
import documentsApi from '@/api/documentstore'

// Hooks
import useApi from '@/hooks/useApi'
import useNotifier from '@/utils/useNotifier'
import { useAuth } from '@/hooks/useAuth'
import { getFileName } from '@/utils/genericHelper'
import useConfirm from '@/hooks/useConfirm'

// icons
import { IconPlus, IconRefresh, IconX, IconVectorBezier2 } from '@tabler/icons-react'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import FileDeleteIcon from '@mui/icons-material/Delete'
import FileEditIcon from '@mui/icons-material/Edit'
import FileChunksIcon from '@mui/icons-material/AppRegistration'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import SearchIcon from '@mui/icons-material/Search'
import RefreshIcon from '@mui/icons-material/Refresh'
import CodeIcon from '@mui/icons-material/Code'
import doc_store_details_emptySVG from '@/assets/images/doc_store_details_empty.svg'

// store
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { useError } from '@/store/context/ErrorContext'

// ==============================|| DOCUMENTS ||============================== //

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,
    padding: '6px 16px',

    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900]
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
        height: 64
    }
}))

const StyledTableRow = styled(TableRow)(() => ({
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

const StyledMenu = styled((props) => (
    <Menu
        elevation={0}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'right'
        }}
        {...props}
    />
))(({ theme }) => ({
    '& .MuiPaper-root': {
        borderRadius: 6,
        marginTop: theme.spacing(1),
        minWidth: 180,
        boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        '& .MuiMenu-list': {
            padding: '4px 0'
        },
        '& .MuiMenuItem-root': {
            '& .MuiSvgIcon-root': {
                fontSize: 18,
                color: theme.palette.text.secondary,
                marginRight: theme.spacing(1.5)
            },
            '&:active': {
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity)
            }
        }
    }
}))

const DocumentStoreDetails = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { hasAssignedWorkspace } = useAuth()
    useNotifier()
    const { confirm } = useConfirm()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))
    const { error, setError } = useError()
    const { hasPermission } = useAuth()

    const getSpecificDocumentStore = useApi(documentsApi.getSpecificDocumentStore)

    const [isLoading, setLoading] = useState(true)
    const [isBackdropLoading, setBackdropLoading] = useState(false)
    const [showDialog, setShowDialog] = useState(false)
    const [documentStore, setDocumentStore] = useState({})
    const [dialogProps, setDialogProps] = useState({})
    const [showDocumentLoaderListDialog, setShowDocumentLoaderListDialog] = useState(false)
    const [documentLoaderListDialogProps, setDocumentLoaderListDialogProps] = useState({})
    const [showDeleteDocStoreDialog, setShowDeleteDocStoreDialog] = useState(false)
    const [deleteDocStoreDialogProps, setDeleteDocStoreDialogProps] = useState({})
    const [showDocStoreAPIDialog, setShowDocStoreAPIDialog] = useState(false)
    const [docStoreAPIDialogProps, setDocStoreAPIDialogProps] = useState({})

    const [anchorEl, setAnchorEl] = useState(null)
    const open = Boolean(anchorEl)

    const { storeId } = useParams()

    const openPreviewSettings = (id) => {
        navigate('/document-stores/' + storeId + '/' + id)
    }

    const showStoredChunks = (id) => {
        navigate('/document-stores/chunks/' + storeId + '/' + id)
    }

    const showVectorStoreQuery = (id) => {
        navigate('/document-stores/query/' + id)
    }

    const onDocLoaderSelected = (docLoaderComponentName) => {
        setShowDocumentLoaderListDialog(false)
        navigate('/document-stores/' + storeId + '/' + docLoaderComponentName)
    }

    const showVectorStore = (id) => {
        navigate('/document-stores/vector/' + id)
    }

    const listLoaders = () => {
        const dialogProp = {
            title: 'Select Document Loader'
        }
        setDocumentLoaderListDialogProps(dialogProp)
        setShowDocumentLoaderListDialog(true)
    }

    const deleteVectorStoreDataFromStore = async (storeId, docId) => {
        try {
            await documentsApi.deleteVectorStoreDataFromStore(storeId, docId)
        } catch (error) {
            console.error(error)
        }
    }

    const onDocStoreDelete = async (type, file) => {
        setBackdropLoading(true)
        setShowDeleteDocStoreDialog(false)
        if (type === 'STORE') {
            if (documentStore.recordManagerConfig) {
                await deleteVectorStoreDataFromStore(storeId)
            }
            try {
                const deleteResp = await documentsApi.deleteDocumentStore(storeId)
                setBackdropLoading(false)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: 'Store, Loader and associated document chunks deleted',
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
                    navigate('/document-stores/')
                }
            } catch (error) {
                setBackdropLoading(false)
                setError(error)
                enqueueSnackbar({
                    message: `Failed to delete Document Store: ${
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
            }
        } else if (type === 'LOADER') {
            if (documentStore.recordManagerConfig) {
                await deleteVectorStoreDataFromStore(storeId, file.id)
            }
            try {
                const deleteResp = await documentsApi.deleteLoaderFromStore(storeId, file.id)
                setBackdropLoading(false)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: 'Loader and associated document chunks deleted',
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
                    onConfirm()
                }
            } catch (error) {
                setError(error)
                setBackdropLoading(false)
                enqueueSnackbar({
                    message: `Failed to delete Document Loader: ${
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
            }
        }
    }

    const onLoaderDelete = (file, vectorStoreConfig, recordManagerConfig) => {
        // Get the display name in the format "LoaderName (sourceName)"
        const loaderName = file.loaderName || 'Unknown'
        let sourceName = ''

        // Prefer files.name when files array exists and has items
        if (file.files && Array.isArray(file.files) && file.files.length > 0) {
            sourceName = file.files.map((f) => f.name).join(', ')
        } else if (file.source) {
            // Fallback to source logic
            if (typeof file.source === 'string' && file.source.includes('base64')) {
                sourceName = getFileName(file.source)
            } else if (typeof file.source === 'string' && file.source.startsWith('[') && file.source.endsWith(']')) {
                sourceName = JSON.parse(file.source).join(', ')
            } else if (typeof file.source === 'string') {
                sourceName = file.source
            }
        }

        const displayName = sourceName ? `${loaderName} (${sourceName})` : loaderName

        let description = `Delete "${displayName}"? This will delete all the associated document chunks from the document store.`

        if (
            recordManagerConfig &&
            vectorStoreConfig &&
            Object.keys(recordManagerConfig).length > 0 &&
            Object.keys(vectorStoreConfig).length > 0
        ) {
            description = `Delete "${displayName}"? This will delete all the associated document chunks from the document store and remove the actual data from the vector store database.`
        }

        const props = {
            title: `Delete`,
            description,
            vectorStoreConfig,
            recordManagerConfig,
            type: 'LOADER',
            file
        }

        setDeleteDocStoreDialogProps(props)
        setShowDeleteDocStoreDialog(true)
    }

    const onStoreDelete = (vectorStoreConfig, recordManagerConfig) => {
        let description = `Delete Store ${getSpecificDocumentStore.data?.name}? This will delete all the associated loaders and document chunks from the document store.`

        if (
            recordManagerConfig &&
            vectorStoreConfig &&
            Object.keys(recordManagerConfig).length > 0 &&
            Object.keys(vectorStoreConfig).length > 0
        ) {
            description = `Delete Store ${getSpecificDocumentStore.data?.name}? This will delete all the associated loaders and document chunks from the document store, and remove the actual data from the vector store database.`
        }

        const props = {
            title: `Delete`,
            description,
            vectorStoreConfig,
            recordManagerConfig,
            type: 'STORE'
        }

        setDeleteDocStoreDialogProps(props)
        setShowDeleteDocStoreDialog(true)
    }

    const onStoreRefresh = async (storeId) => {
        const confirmPayload = {
            title: `Refresh all loaders and upsert all chunks?`,
            description: `This will re-process all loaders and upsert all chunks. This action might take some time.`,
            confirmButtonName: 'Refresh',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            setAnchorEl(null)
            setBackdropLoading(true)
            try {
                const resp = await documentsApi.refreshLoader(storeId)
                if (resp.data) {
                    enqueueSnackbar({
                        message: 'Document store refresh successfully!',
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
                setBackdropLoading(false)
            } catch (error) {
                setBackdropLoading(false)
                enqueueSnackbar({
                    message: `Failed to refresh document store: ${
                        typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                    }`,
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
    }

    const onEditClicked = () => {
        const data = {
            name: documentStore.name,
            description: documentStore.description,
            id: documentStore.id
        }
        const dialogProp = {
            title: 'Edit Document Store',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Update',
            data: data
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = () => {
        setShowDialog(false)
        getSpecificDocumentStore.request(storeId)
    }

    const handleClick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        setAnchorEl(event.currentTarget)
    }

    const onViewUpsertAPI = (storeId, loaderId) => {
        const props = {
            title: `Upsert API`,
            storeId,
            loaderId
        }
        setDocStoreAPIDialogProps(props)
        setShowDocStoreAPIDialog(true)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    useEffect(() => {
        getSpecificDocumentStore.request(storeId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getSpecificDocumentStore.data) {
            const workspaceId = getSpecificDocumentStore.data.workspaceId
            if (!hasAssignedWorkspace(workspaceId)) {
                navigate('/unauthorized')
                return
            }
            setDocumentStore(getSpecificDocumentStore.data)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificDocumentStore.data])

    useEffect(() => {
        setLoading(getSpecificDocumentStore.loading)
    }, [getSpecificDocumentStore.loading])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            isBackButton={true}
                            isEditButton={hasPermission('documentStores:create,documentStores:update')}
                            search={false}
                            title={documentStore?.name}
                            description={documentStore?.description}
                            onBack={() => navigate('/document-stores')}
                            onEdit={() => onEditClicked()}
                        >
                            {(documentStore?.status === 'STALE' || documentStore?.status === 'UPSERTING') && (
                                <PermissionIconButton
                                    permissionId={'documentStores:view'}
                                    onClick={onConfirm}
                                    size='small'
                                    color='primary'
                                    title='Refresh Document Store'
                                >
                                    <IconRefresh />
                                </PermissionIconButton>
                            )}
                            <StyledPermissionButton
                                permissionId={'documentStores:add-loader'}
                                variant='contained'
                                sx={{ ml: 2, minWidth: 200, borderRadius: 2, height: '100%', color: 'white' }}
                                startIcon={<IconPlus />}
                                onClick={listLoaders}
                            >
                                Add Document Loader
                            </StyledPermissionButton>
                            <Button
                                id='document-store-header-action-button'
                                aria-controls={open ? 'document-store-header-menu' : undefined}
                                aria-haspopup='true'
                                aria-expanded={open ? 'true' : undefined}
                                variant='outlined'
                                disableElevation
                                color='secondary'
                                onClick={handleClick}
                                sx={{ minWidth: 150 }}
                                endIcon={<KeyboardArrowDownIcon />}
                            >
                                More Actions
                            </Button>
                            <StyledMenu
                                id='document-store-header-menu'
                                MenuListProps={{
                                    'aria-labelledby': 'document-store-header-menu-button'
                                }}
                                anchorEl={anchorEl}
                                open={open}
                                onClose={handleClose}
                            >
                                <MenuItem
                                    disabled={documentStore?.totalChunks <= 0 || documentStore?.status === 'UPSERTING'}
                                    onClick={() => {
                                        handleClose()
                                        showStoredChunks('all')
                                    }}
                                    disableRipple
                                >
                                    <FileChunksIcon />
                                    View & Edit Chunks
                                </MenuItem>
                                <Available permission={'documentStores:upsert-config'}>
                                    <MenuItem
                                        disabled={documentStore?.totalChunks <= 0 || documentStore?.status === 'UPSERTING'}
                                        onClick={() => {
                                            handleClose()
                                            showVectorStore(documentStore.id)
                                        }}
                                        disableRipple
                                    >
                                        <NoteAddIcon />
                                        Upsert All Chunks
                                    </MenuItem>
                                </Available>
                                <MenuItem
                                    disabled={documentStore?.totalChunks <= 0 || documentStore?.status !== 'UPSERTED'}
                                    onClick={() => {
                                        handleClose()
                                        showVectorStoreQuery(documentStore.id)
                                    }}
                                    disableRipple
                                >
                                    <SearchIcon />
                                    Retrieval Query
                                </MenuItem>
                                <Available permission={'documentStores:upsert-config'}>
                                    <MenuItem
                                        disabled={documentStore?.totalChunks <= 0 || documentStore?.status !== 'UPSERTED'}
                                        onClick={() => onStoreRefresh(documentStore.id)}
                                        disableRipple
                                        title='Re-process all loaders and upsert all chunks'
                                    >
                                        <RefreshIcon />
                                        Refresh
                                    </MenuItem>
                                </Available>
                                <Divider sx={{ my: 0.5 }} />
                                <MenuItem
                                    onClick={() => {
                                        handleClose()
                                        onStoreDelete(documentStore.vectorStoreConfig, documentStore.recordManagerConfig)
                                    }}
                                    disableRipple
                                >
                                    <FileDeleteIcon />
                                    Delete
                                </MenuItem>
                            </StyledMenu>
                        </ViewHeader>
                        <DocumentStoreStatus status={documentStore?.status} />
                        {getSpecificDocumentStore.data?.whereUsed?.length > 0 && (
                            <Stack flexDirection='row' sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div
                                    style={{
                                        paddingLeft: '15px',
                                        paddingRight: '15px',
                                        paddingTop: '10px',
                                        paddingBottom: '10px',
                                        fontSize: '0.9rem',
                                        width: 'max-content',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center'
                                    }}
                                >
                                    <IconVectorBezier2 style={{ marginRight: 5 }} size={17} />
                                    Chatflows Used:
                                </div>
                                {getSpecificDocumentStore.data.whereUsed.map((chatflowUsed, index) => (
                                    <Chip
                                        key={index}
                                        clickable
                                        style={{
                                            width: 'max-content',
                                            borderRadius: '25px',
                                            boxShadow: customization.isDarkMode
                                                ? '0 2px 14px 0 rgb(255 255 255 / 10%)'
                                                : '0 2px 14px 0 rgb(32 40 45 / 10%)'
                                        }}
                                        label={chatflowUsed.name}
                                        onClick={() => navigate('/canvas/' + chatflowUsed.id)}
                                    ></Chip>
                                ))}
                            </Stack>
                        )}
                        {!isLoading && documentStore && !documentStore?.loaders?.length ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '16vh', width: 'auto' }}
                                        src={doc_store_details_emptySVG}
                                        alt='doc_store_details_emptySVG'
                                    />
                                </Box>
                                <div>No Document Added Yet</div>
                                <StyledButton
                                    variant='contained'
                                    sx={{ borderRadius: 2, height: '100%', mt: 2, color: 'white' }}
                                    startIcon={<IconPlus />}
                                    onClick={listLoaders}
                                >
                                    Add Document Loader
                                </StyledButton>
                            </Stack>
                        ) : (
                            <TableContainer
                                sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                component={Paper}
                            >
                                <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                                    <TableHead
                                        sx={{
                                            backgroundColor: customization.isDarkMode
                                                ? theme.palette.common.black
                                                : theme.palette.grey[100],
                                            height: 56
                                        }}
                                    >
                                        <TableRow>
                                            <StyledTableCell>&nbsp;</StyledTableCell>
                                            <StyledTableCell>Loader</StyledTableCell>
                                            <StyledTableCell>Splitter</StyledTableCell>
                                            <StyledTableCell>Source(s)</StyledTableCell>
                                            <StyledTableCell>Chunks</StyledTableCell>
                                            <StyledTableCell>Chars</StyledTableCell>
                                            <Available permission={'documentStores:preview-process,documentStores:delete-loader'}>
                                                <StyledTableCell>Actions</StyledTableCell>
                                            </Available>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {isLoading ? (
                                            <>
                                                <StyledTableRow>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <Available permission={'documentStores:preview-process,documentStores:delete-loader'}>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                    </Available>
                                                </StyledTableRow>
                                                <StyledTableRow>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Skeleton variant='text' />
                                                    </StyledTableCell>
                                                    <Available permission={'documentStores:preview-process,documentStores:delete-loader'}>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                    </Available>
                                                </StyledTableRow>
                                            </>
                                        ) : (
                                            <>
                                                {documentStore?.loaders &&
                                                    documentStore?.loaders.length > 0 &&
                                                    documentStore?.loaders.map((loader, index) => (
                                                        <LoaderRow
                                                            key={index}
                                                            index={index}
                                                            loader={loader}
                                                            theme={theme}
                                                            onEditClick={() => openPreviewSettings(loader.id)}
                                                            onViewChunksClick={() => showStoredChunks(loader.id)}
                                                            onDeleteClick={() =>
                                                                onLoaderDelete(
                                                                    loader,
                                                                    documentStore?.vectorStoreConfig,
                                                                    documentStore?.recordManagerConfig
                                                                )
                                                            }
                                                            onChunkUpsert={() =>
                                                                navigate(`/document-stores/vector/${documentStore.id}/${loader.id}`)
                                                            }
                                                            onViewUpsertAPI={() => onViewUpsertAPI(documentStore.id, loader.id)}
                                                        />
                                                    ))}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                        {getSpecificDocumentStore.data?.status === 'STALE' && (
                            <div style={{ width: '100%', textAlign: 'center', marginTop: '20px' }}>
                                <Typography
                                    color='warning'
                                    style={{ color: 'darkred', fontWeight: 500, fontStyle: 'italic', fontSize: 12 }}
                                >
                                    Some files are pending processing. Please Refresh to get the latest status.
                                </Typography>
                            </div>
                        )}
                    </Stack>
                )}
            </MainCard>
            {showDialog && (
                <AddDocStoreDialog
                    dialogProps={dialogProps}
                    show={showDialog}
                    onCancel={() => setShowDialog(false)}
                    onConfirm={onConfirm}
                />
            )}
            {showDocumentLoaderListDialog && (
                <DocumentLoaderListDialog
                    show={showDocumentLoaderListDialog}
                    dialogProps={documentLoaderListDialogProps}
                    onCancel={() => setShowDocumentLoaderListDialog(false)}
                    onDocLoaderSelected={onDocLoaderSelected}
                />
            )}
            {showDeleteDocStoreDialog && (
                <DeleteDocStoreDialog
                    show={showDeleteDocStoreDialog}
                    dialogProps={deleteDocStoreDialogProps}
                    onCancel={() => setShowDeleteDocStoreDialog(false)}
                    onDelete={onDocStoreDelete}
                />
            )}
            {showDocStoreAPIDialog && (
                <DocStoreAPIDialog
                    show={showDocStoreAPIDialog}
                    dialogProps={docStoreAPIDialogProps}
                    onCancel={() => setShowDocStoreAPIDialog(false)}
                />
            )}
            {isBackdropLoading && <BackdropLoader open={isBackdropLoading} />}
            <ConfirmDialog />
        </>
    )
}

function LoaderRow(props) {
    const [anchorEl, setAnchorEl] = useState(null)
    const open = Boolean(anchorEl)

    const handleClick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const formatSources = (files, source, loaderName) => {
        let sourceName = ''

        // Prefer files.name when files array exists and has items
        if (files && Array.isArray(files) && files.length > 0) {
            sourceName = files.map((file) => file.name).join(', ')
        } else if (source && typeof source === 'string' && source.includes('base64')) {
            // Fallback to original source logic
            sourceName = getFileName(source)
        } else if (source && typeof source === 'string' && source.startsWith('[') && source.endsWith(']')) {
            sourceName = JSON.parse(source).join(', ')
        } else if (source) {
            sourceName = source
        }

        // Return format: "LoaderName (sourceName)" or just "LoaderName" if no source
        if (!sourceName) {
            return loaderName || 'No source'
        }
        return loaderName ? `${loaderName} (${sourceName})` : sourceName
    }

    return (
        <>
            <TableRow hover key={props.index} sx={{ '&:last-child td, &:last-child th': { border: 0 }, cursor: 'pointer' }}>
                <StyledTableCell onClick={props.onViewChunksClick} scope='row' style={{ width: '5%' }}>
                    <div
                        style={{
                            display: 'flex',
                            width: '20px',
                            height: '20px',
                            backgroundColor: props.loader?.status === 'SYNC' ? '#00e676' : '#ffe57f',
                            borderRadius: '50%'
                        }}
                    ></div>
                </StyledTableCell>
                <StyledTableCell onClick={props.onViewChunksClick} scope='row'>
                    {props.loader.loaderName}
                </StyledTableCell>
                <StyledTableCell onClick={props.onViewChunksClick}>{props.loader.splitterName ?? 'None'}</StyledTableCell>
                <StyledTableCell onClick={props.onViewChunksClick}>
                    {formatSources(props.loader.files, props.loader.source)}
                </StyledTableCell>
                <StyledTableCell onClick={props.onViewChunksClick}>
                    {props.loader.totalChunks && <Chip variant='outlined' size='small' label={props.loader.totalChunks.toLocaleString()} />}
                </StyledTableCell>
                <StyledTableCell onClick={props.onViewChunksClick}>
                    {props.loader.totalChars && <Chip variant='outlined' size='small' label={props.loader.totalChars.toLocaleString()} />}
                </StyledTableCell>
                <Available permission={'documentStores:preview-process,documentStores:delete-loader'}>
                    <StyledTableCell>
                        <div>
                            <Button
                                id='document-store-action-button'
                                aria-controls={open ? 'document-store-action-customized-menu' : undefined}
                                aria-haspopup='true'
                                aria-expanded={open ? 'true' : undefined}
                                disableElevation
                                onClick={(e) => handleClick(e)}
                                endIcon={<KeyboardArrowDownIcon />}
                            >
                                Options
                            </Button>
                            <StyledMenu
                                id='document-store-actions-customized-menu'
                                MenuListProps={{
                                    'aria-labelledby': 'document-store-actions-customized-button'
                                }}
                                anchorEl={anchorEl}
                                open={open}
                                onClose={handleClose}
                            >
                                <Available permission={'documentStores:preview-process'}>
                                    <MenuItem
                                        onClick={() => {
                                            handleClose()
                                            props.onEditClick()
                                        }}
                                        disableRipple
                                    >
                                        <FileEditIcon />
                                        Preview & Process
                                    </MenuItem>
                                </Available>
                                <Available permission={'documentStores:preview-process'}>
                                    <MenuItem
                                        onClick={() => {
                                            handleClose()
                                            props.onViewChunksClick()
                                        }}
                                        disableRipple
                                    >
                                        <FileChunksIcon />
                                        View & Edit Chunks
                                    </MenuItem>
                                </Available>
                                <Available permission={'documentStores:preview-process'}>
                                    <MenuItem
                                        onClick={() => {
                                            handleClose()
                                            props.onChunkUpsert()
                                        }}
                                        disableRipple
                                    >
                                        <NoteAddIcon />
                                        Upsert Chunks
                                    </MenuItem>
                                </Available>
                                <Available permission={'documentStores:preview-process'}>
                                    <MenuItem
                                        onClick={() => {
                                            handleClose()
                                            props.onViewUpsertAPI()
                                        }}
                                        disableRipple
                                    >
                                        <CodeIcon />
                                        View API
                                    </MenuItem>
                                </Available>
                                <Divider sx={{ my: 0.5 }} />
                                <Available permission={'documentStores:delete-loader'}>
                                    <MenuItem
                                        onClick={() => {
                                            handleClose()
                                            props.onDeleteClick()
                                        }}
                                        disableRipple
                                    >
                                        <FileDeleteIcon />
                                        Delete
                                    </MenuItem>
                                </Available>
                            </StyledMenu>
                        </div>
                    </StyledTableCell>
                </Available>
            </TableRow>
        </>
    )
}

LoaderRow.propTypes = {
    loader: PropTypes.any,
    index: PropTypes.number,
    open: PropTypes.bool,
    theme: PropTypes.any,
    onViewChunksClick: PropTypes.func,
    onEditClick: PropTypes.func,
    onDeleteClick: PropTypes.func,
    onChunkUpsert: PropTypes.func,
    onViewUpsertAPI: PropTypes.func
}
export default DocumentStoreDetails
