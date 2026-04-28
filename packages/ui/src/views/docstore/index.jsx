import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

// material-ui
import {
    Box,
    Button,
    Fade,
    IconButton,
    InputAdornment,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    OutlinedInput,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography
} from '@mui/material'
import { useTheme, darken } from '@mui/material/styles'

// project imports
import ErrorBoundary from '@/ErrorBoundary'
import { useError } from '@/store/context/ErrorContext'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import MainCard from '@/ui-component/cards/MainCard'
import DocumentStoreStatus from '@/views/docstore/DocumentStoreStatus'
import { kFormatter } from '@/utils/genericHelper'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'
import AddDocStoreDialog from '@/views/docstore/AddDocStoreDialog'
import DeleteDocStoreDialog from '@/views/docstore/DeleteDocStoreDialog'

// API
import documentsApi from '@/api/documentstore'
import { useAuth } from '@/hooks/useAuth'
import useApi from '@/hooks/useApi'

// icons
import {
    IconDotsVertical,
    IconEdit,
    IconLanguage,
    IconLayoutGrid,
    IconList,
    IconScissors,
    IconSearch,
    IconTrash,
    IconVectorBezier2,
    IconX
} from '@tabler/icons-react'

// const
import { baseURL, gridSpacing } from '@/store/constant'
import { DocumentStoreTable } from '@/ui-component/table/DocumentStoreTable'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// utils
import useNotifier from '@/utils/useNotifier'

// ==============================|| DOCUMENTS ||============================== //
const getDocStoreActionButtonSx = (theme) => ({
    p: 0.5,
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
        borderColor: theme.palette.text.secondary
    }
})

const Documents = () => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const customization = useSelector((state) => state.customization)
    const { hasPermission } = useAuth()
    const getAllDocumentStores = useApi(documentsApi.getAllDocumentStores)
    const { error } = useError()
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)
    const [images, setImages] = useState({})
    const [search, setSearch] = useState('')
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [docStores, setDocStores] = useState([])
    const [view, setView] = useState(localStorage.getItem('docStoreDisplayStyle') || 'card')
    const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null)
    const [selectedDocumentStore, setSelectedDocumentStore] = useState(null)
    const [showDeleteDocStoreDialog, setShowDeleteDocStoreDialog] = useState(false)
    const [deleteDocStoreDialogProps, setDeleteDocStoreDialogProps] = useState({})

    const canRenameDocumentStore = hasPermission('documentStores:create,documentStores:update')
    const canDeleteDocumentStore = hasPermission('documentStores:delete')
    const canManageDocumentStore = canRenameDocumentStore || canDeleteDocumentStore
    const isActionMenuOpen = Boolean(actionMenuAnchorEl)

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('docStoreDisplayStyle', nextView)
        setView(nextView)
    }

    function filterDocStores(data) {
        return (
            data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 || data.description.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    const getDeleteErrorMessage = (error) => {
        const responseData = error?.response?.data

        if (typeof responseData === 'string' && responseData.trim()) {
            return responseData
        }

        const responseMessage = responseData && typeof responseData === 'object' ? responseData.message || responseData.error : undefined
        if (typeof responseMessage === 'string' && responseMessage.trim()) {
            return responseMessage
        }

        if (typeof error?.message === 'string' && error.message.trim()) {
            return error.message
        }

        return 'Unknown error'
    }

    const goToDocumentStore = (id) => {
        navigate('/document-stores/' + id)
    }

    const addNew = () => {
        const dialogProp = {
            title: 'Add New Document Store',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = (docStoreId, updatedDocStoreData) => {
        setShowDialog(false)

        // For rename from list/table, update locally to avoid full-table loading skeleton flash.
        if (dialogProps?.type === 'EDIT' && docStoreId) {
            setDocStores((prev) =>
                prev.map((store) =>
                    store.id === docStoreId
                        ? {
                              ...store,
                              ...(updatedDocStoreData || {})
                          }
                        : store
                )
            )
            return
        }

        applyFilters(currentPage, pageLimit)
    }

    const handleActionMenuOpen = (event, documentStore) => {
        event.preventDefault()
        event.stopPropagation()
        setSelectedDocumentStore(documentStore)
        setActionMenuAnchorEl(event.currentTarget)
    }

    const handleActionMenuClose = () => {
        setActionMenuAnchorEl(null)
        setSelectedDocumentStore(null)
    }

    const renameDocumentStore = () => {
        if (!selectedDocumentStore) return
        const dialogProp = {
            title: 'Rename Document Store',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: {
                id: selectedDocumentStore.id,
                name: selectedDocumentStore.name,
                description: selectedDocumentStore.description
            }
        }
        handleActionMenuClose()
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const deleteDocumentStore = () => {
        if (!selectedDocumentStore) return
        const documentStoreToDelete = selectedDocumentStore
        handleActionMenuClose()

        let description = `Delete store [${documentStoreToDelete.name}]? This will remove this document store from the list.`

        if (
            documentStoreToDelete.recordManagerConfig &&
            documentStoreToDelete.vectorStoreConfig &&
            Object.keys(documentStoreToDelete.recordManagerConfig).length > 0 &&
            Object.keys(documentStoreToDelete.vectorStoreConfig).length > 0
        ) {
            description = `Delete store [${documentStoreToDelete.name}]? This will remove this document store from the list and remove the actual data from the vector store database.`
        }

        setDeleteDocStoreDialogProps({
            title: 'Delete',
            description,
            vectorStoreConfig: documentStoreToDelete.vectorStoreConfig,
            recordManagerConfig: documentStoreToDelete.recordManagerConfig,
            type: 'STORE',
            storeId: documentStoreToDelete.id
        })
        setShowDeleteDocStoreDialog(true)
    }

    const onDocStoreDelete = async (type) => {
        setShowDeleteDocStoreDialog(false)
        if (type !== 'STORE') return

        const storeId = deleteDocStoreDialogProps?.storeId
        if (!storeId) return

        try {
            const deleteResp = await documentsApi.deleteDocumentStore(storeId)
            if (deleteResp.data) {
                enqueueSnackbar({
                    message: 'Document Store deleted.',
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
                // Update list instantly instead of full refetch/skeleton.
                setDocStores((prev) => prev.filter((store) => store.id !== storeId))
                setImages((prev) => {
                    const nextImages = { ...prev }
                    delete nextImages[storeId]
                    return nextImages
                })
                setTotal((prev) => Math.max(0, prev - 1))
            }
        } catch (error) {
            const errorMessage = getDeleteErrorMessage(error)

            enqueueSnackbar({
                message: `Failed to delete Document Store: ${errorMessage}`,
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

    useEffect(() => {
        applyFilters(currentPage, pageLimit)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(() => Number(localStorage.getItem('docStorePageSize') || DEFAULT_ITEMS_PER_PAGE))
    const [total, setTotal] = useState(0)
    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        localStorage.setItem('docStorePageSize', pageLimit)
        applyFilters(page, pageLimit)
    }

    const applyFilters = (page, limit) => {
        const params = {
            page: page || currentPage,
            limit: limit || pageLimit
        }
        getAllDocumentStores.request(params)
    }

    useEffect(() => {
        if (getAllDocumentStores.data) {
            try {
                const { data, total } = getAllDocumentStores.data
                if (!Array.isArray(data)) return
                const loaderImages = {}

                for (let i = 0; i < data.length; i += 1) {
                    const loaders = data[i].loaders ?? []

                    let totalChunks = 0
                    let totalChars = 0
                    loaderImages[data[i].id] = []
                    for (let j = 0; j < loaders.length; j += 1) {
                        const imageSrc = `${baseURL}/api/v1/node-icon/${loaders[j].loaderId}`
                        if (!loaderImages[data[i].id].includes(imageSrc)) {
                            loaderImages[data[i].id].push(imageSrc)
                        }
                        totalChunks += loaders[j]?.totalChunks ?? 0
                        totalChars += loaders[j]?.totalChars ?? 0
                    }
                    data[i].totalDocs = loaders?.length ?? 0
                    data[i].totalChunks = totalChunks
                    data[i].totalChars = totalChars
                }
                setDocStores(data)
                setTotal(total)
                setImages(loaderImages)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllDocumentStores.data])

    useEffect(() => {
        setLoading(getAllDocumentStores.loading)
    }, [getAllDocumentStores.loading])

    return (
        <MainCard>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Fade in={!isLoading} timeout={250} style={{ transitionDelay: isLoading ? '0ms' : '50ms' }}>
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        {/* ==================== Hero Section ==================== */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pt: 4,
                                pb: 2,
                                ...(!isLoading && docStores.length === 0 ? { minHeight: 'calc(100vh - 200px)' } : {})
                            }}
                        >
                            <Typography
                                variant='h2'
                                sx={{
                                    fontSize: '1.8rem',
                                    fontWeight: 700,
                                    mb: 1,
                                    color: theme.palette.text.primary
                                }}
                            >
                                Create a document store
                            </Typography>

                            <Typography
                                sx={{
                                    mb: 3,
                                    fontSize: '1rem',
                                    textAlign: 'center',
                                    fontWeight: 500,
                                    maxWidth: 600
                                }}
                            >
                                Manage and upsert documents for Retrieval-Augmented Generation (RAG)
                            </Typography>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <StyledPermissionButton
                                    permissionId={'documentStores:create'}
                                    variant='contained'
                                    onClick={addNew}
                                    id='btn_createVariable'
                                    sx={{
                                        borderRadius: '24px',
                                        px: 3,
                                        height: 44,
                                        textTransform: 'none',
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        background: `linear-gradient(90deg, ${theme.palette.primary.main} 10%, ${theme.palette.secondary.main} 100%)`,
                                        color: theme.palette.common.white,
                                        '&:hover': {
                                            background: `linear-gradient(90deg, ${darken(theme.palette.primary.main, 0.1)} 10%, ${darken(
                                                theme.palette.secondary.main,
                                                0.1
                                            )} 100%)`
                                        }
                                    }}
                                >
                                    Create
                                </StyledPermissionButton>
                            </Box>
                        </Box>

                        {/* ==================== Document Stores Listing Section ==================== */}
                        {docStores.length > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant='h3' sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                    Document Stores
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <OutlinedInput
                                        size='small'
                                        placeholder='Search Name'
                                        onChange={onSearchChange}
                                        startAdornment={
                                            <InputAdornment position='start'>
                                                <IconSearch size={16} stroke={1.5} />
                                            </InputAdornment>
                                        }
                                        sx={{
                                            width: 250,
                                            borderRadius: 2,
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: theme.palette.grey[900] + 25
                                            }
                                        }}
                                    />
                                    <ToggleButtonGroup
                                        sx={{ borderRadius: 2, maxHeight: 36 }}
                                        value={view}
                                        color='primary'
                                        exclusive
                                        onChange={handleChange}
                                    >
                                        <ToggleButton
                                            sx={{
                                                borderColor: theme.palette.grey[900] + 25,
                                                borderRadius: 2,
                                                color: customization.isDarkMode ? 'white' : 'inherit'
                                            }}
                                            variant='contained'
                                            value='card'
                                            title='Card View'
                                        >
                                            <IconLayoutGrid size={18} />
                                        </ToggleButton>
                                        <ToggleButton
                                            sx={{
                                                borderColor: theme.palette.grey[900] + 25,
                                                borderRadius: 2,
                                                color: customization.isDarkMode ? 'white' : 'inherit'
                                            }}
                                            variant='contained'
                                            value='list'
                                            title='List View'
                                        >
                                            <IconList size={18} />
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                            </Box>
                        )}

                        {!isLoading && docStores.length > 0 && (
                            <React.Fragment>
                                {!view || view === 'card' ? (
                                    <Box display='grid' gridTemplateColumns='repeat(3, minmax(0, 1fr))' gap={gridSpacing}>
                                        {docStores?.filter(filterDocStores).map((data) => {
                                            const loaderImages = images[data.id] || []
                                            const visibleLoaders = loaderImages.slice(0, 4)
                                            const remainingLoaders = loaderImages.length - visibleLoaders.length
                                            return (
                                                <Box
                                                    key={data.id}
                                                    onClick={() => goToDocumentStore(data.id)}
                                                    sx={{
                                                        position: 'relative',
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: 1.5,
                                                        p: 2,
                                                        height: '100%',
                                                        borderRadius: 3,
                                                        border: `1px solid ${theme.palette.grey[900]}15`,
                                                        cursor: 'pointer',
                                                        backgroundColor: theme.palette.card?.main || theme.palette.background.paper,
                                                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                                        transition: 'background-color 0.2s, box-shadow 0.2s',
                                                        '&:hover': {
                                                            backgroundColor: theme.palette.card?.hover || theme.palette.action.hover,
                                                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
                                                        }
                                                    }}
                                                >
                                                    <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                                                        <Stack
                                                            direction='row'
                                                            alignItems='center'
                                                            spacing={1}
                                                            sx={{ pr: canManageDocumentStore ? 4 : 0 }}
                                                        >
                                                            <Typography
                                                                sx={{
                                                                    fontSize: '0.95rem',
                                                                    fontWeight: 600,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    flex: 1,
                                                                    color: theme.palette.text.primary
                                                                }}
                                                            >
                                                                {data.name}
                                                            </Typography>
                                                            <DocumentStoreStatus status={data.status} isTableView />
                                                        </Stack>
                                                        {data.description && (
                                                            <Typography
                                                                sx={{
                                                                    mt: 0.5,
                                                                    fontSize: '0.8rem',
                                                                    color: customization.isDarkMode
                                                                        ? theme.palette.grey[400]
                                                                        : theme.palette.grey[700],
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}
                                                            >
                                                                {data.description}
                                                            </Typography>
                                                        )}
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                flexWrap: 'wrap',
                                                                columnGap: 1.5,
                                                                rowGap: 0.5,
                                                                mt: 1.25,
                                                                color: customization.isDarkMode
                                                                    ? theme.palette.grey[400]
                                                                    : theme.palette.grey[700]
                                                            }}
                                                        >
                                                            <Stack direction='row' alignItems='center' spacing={0.5}>
                                                                <IconVectorBezier2 size={13} />
                                                                <Typography sx={{ fontSize: '0.75rem' }}>
                                                                    {data.whereUsed?.length ?? 0}{' '}
                                                                    {(data.whereUsed?.length ?? 0) <= 1 ? 'flow' : 'flows'}
                                                                </Typography>
                                                            </Stack>
                                                            <Stack direction='row' alignItems='center' spacing={0.5}>
                                                                <IconLanguage size={13} />
                                                                <Typography sx={{ fontSize: '0.75rem' }}>
                                                                    {kFormatter(data.totalChars ?? 0)} chars
                                                                </Typography>
                                                            </Stack>
                                                            <Stack direction='row' alignItems='center' spacing={0.5}>
                                                                <IconScissors size={13} />
                                                                <Typography sx={{ fontSize: '0.75rem' }}>
                                                                    {kFormatter(data.totalChunks ?? 0)} chunks
                                                                </Typography>
                                                            </Stack>
                                                        </Box>
                                                        {loaderImages.length > 0 && (
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.5,
                                                                    mt: 1,
                                                                    flexWrap: 'wrap'
                                                                }}
                                                            >
                                                                {visibleLoaders.map((img, i) => (
                                                                    <Box
                                                                        key={i}
                                                                        sx={{
                                                                            width: 22,
                                                                            height: 22,
                                                                            borderRadius: '50%',
                                                                            backgroundColor: customization.isDarkMode
                                                                                ? theme.palette.common.white
                                                                                : theme.palette.grey[300] + 75,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}
                                                                    >
                                                                        <img
                                                                            style={{
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                padding: 3,
                                                                                objectFit: 'contain'
                                                                            }}
                                                                            alt=''
                                                                            src={img}
                                                                        />
                                                                    </Box>
                                                                ))}
                                                                {remainingLoaders > 0 && (
                                                                    <Typography
                                                                        sx={{
                                                                            fontSize: '0.75rem',
                                                                            color: theme.palette.text.secondary,
                                                                            ml: 0.5
                                                                        }}
                                                                    >
                                                                        +{remainingLoaders}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        )}
                                                    </Box>
                                                    {canManageDocumentStore && (
                                                        <IconButton
                                                            size='small'
                                                            aria-label='Document store actions'
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 12,
                                                                right: 10,
                                                                zIndex: 2,
                                                                width: 28,
                                                                height: 28,
                                                                ...getDocStoreActionButtonSx(theme)
                                                            }}
                                                            onClick={(event) => handleActionMenuOpen(event, data)}
                                                        >
                                                            <IconDotsVertical size={16} />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            )
                                        })}
                                    </Box>
                                ) : (
                                    <DocumentStoreTable
                                        isLoading={isLoading}
                                        data={docStores?.filter(filterDocStores)}
                                        images={images}
                                        onRowClick={(row) => goToDocumentStore(row.id)}
                                        showActions={canManageDocumentStore}
                                        onActionMenuClick={handleActionMenuOpen}
                                        actionButtonSx={getDocStoreActionButtonSx(theme)}
                                    />
                                )}
                                <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                            </React.Fragment>
                        )}
                    </Stack>
                </Fade>
            )}
            {showDialog && (
                <AddDocStoreDialog
                    dialogProps={dialogProps}
                    show={showDialog}
                    onCancel={() => setShowDialog(false)}
                    onConfirm={onConfirm}
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
            <Menu
                anchorEl={actionMenuAnchorEl}
                open={isActionMenuOpen}
                onClose={handleActionMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                {canRenameDocumentStore && (
                    <MenuItem onClick={renameDocumentStore}>
                        <ListItemIcon>
                            <IconEdit size={16} />
                        </ListItemIcon>
                        <ListItemText>Rename</ListItemText>
                    </MenuItem>
                )}
                {canDeleteDocumentStore && (
                    <MenuItem onClick={deleteDocumentStore}>
                        <ListItemIcon>
                            <IconTrash size={16} />
                        </ListItemIcon>
                        <ListItemText>Delete</ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </MainCard>
    )
}

export default Documents
