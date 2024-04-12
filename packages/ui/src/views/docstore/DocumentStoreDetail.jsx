import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

// material-ui
import {
    Grid,
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
    IconButton,
    Collapse
} from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import Button from '@mui/material/Button'
import { tableCellClasses } from '@mui/material/TableCell'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import AddDocStoreDialog from '@/views/docstore/AddDocStoreDialog'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import DocumentLoaderListDialog from '@/views/docstore/DocumentLoaderListDialog'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// API
import documentsApi from '@/api/documentstore'

// Hooks
import useApi from '@/hooks/useApi'
import { useNavigate } from 'react-router-dom'
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'

// icons
import { IconPlus, IconEdit, IconTrash, IconRefresh, IconX, IconChevronsUp, IconChevronsDown, IconFileStack } from '@tabler/icons'
import moment from 'moment'
import * as PropTypes from 'prop-types'

// ==============================|| DOCUMENTS ||============================== //

const DocumentStoreDetails = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))
    const { confirm } = useConfirm()

    const getSpecificDocumentStore = useApi(documentsApi.getSpecificDocumentStore)

    const [showDialog, setShowDialog] = useState(false)
    const [documentStore, setDocumentStore] = useState({})
    const [dialogProps, setDialogProps] = useState({})
    //const fileUploadRef = useRef(null)
    const [showDocumentLoaderListDialog, setShowDocumentLoaderListDialog] = useState(false)
    const [documentLoaderListDialogProps, setDocumentLoaderListDialogProps] = useState({})

    const openPreviewSettings = (id) => {
        navigate('/document-stores/' + storeId + '/' + id)
    }

    const showStoredChunks = (id) => {
        navigate('/document-stores/chunks/' + storeId + '/' + id)
    }

    const onDocLoaderSelected = (docLoaderComponent) => {
        setShowDocumentLoaderListDialog(false)
        navigate('/document-stores/' + storeId + '/' + docLoaderComponent)
    }

    const listLoaders = () => {
        const dialogProp = {
            title: 'Select Document Loader'
        }
        setDocumentLoaderListDialogProps(dialogProp)
        setShowDocumentLoaderListDialog(true)
    }

    const onFileDelete = async (file) => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete file ${file.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deleteResp = await documentsApi.deleteFileFromStore(storeId, file.id)
                if (deleteResp.data) {
                    enqueueSnackbar({
                        message: 'File deleted',
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
                const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
                enqueueSnackbar({
                    message: `Failed to delete file: ${errorData}`,
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

    const onEditClicked = async () => {
        const data = {
            name: documentStore.name,
            description: documentStore.description,
            id: documentStore.id
        }
        const dialogProp = {
            title: 'Edit Document Store',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Update Document Store',
            data: data
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = () => {
        setShowDialog(false)
        getSpecificDocumentStore.request(storeId)
    }

    const URLpath = document.location.pathname.toString().split('/')
    const storeId = URLpath[URLpath.length - 1] === 'document-stores' ? '' : URLpath[URLpath.length - 1]
    useEffect(() => {
        getSpecificDocumentStore.request(storeId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getSpecificDocumentStore.data) {
            setDocumentStore(getSpecificDocumentStore.data)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificDocumentStore.data])

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <Grid sx={{ mb: 1.25 }} container direction='row'>
                        <h1>{getSpecificDocumentStore.data?.name}</h1>
                        <Box sx={{ flexGrow: 1 }} />
                        <Grid item>
                            {getSpecificDocumentStore.data?.status !== 'STALE' && (
                                <Button variant='outlined' onClick={onEditClicked} sx={{ mr: 2 }} startIcon={<IconEdit />}>
                                    Edit Description
                                </Button>
                            )}
                            {getSpecificDocumentStore.data?.status === 'STALE' && (
                                <Button variant='outlined' sx={{ mr: 2 }} startIcon={<IconRefresh />} onClick={onConfirm}>
                                    Refresh
                                </Button>
                            )}
                            <StyledButton variant='contained' sx={{ color: 'white' }} startIcon={<IconPlus />} onClick={listLoaders}>
                                Select Document Loader
                            </StyledButton>
                        </Grid>
                    </Grid>
                </Stack>
                {!getSpecificDocumentStore.loading && getSpecificDocumentStore.data && (
                    <>
                        <Typography style={{ wordWrap: 'break-word' }} variant='h4'>
                            {getSpecificDocumentStore.data?.description}
                        </Typography>
                        {getSpecificDocumentStore.data?.totalFiles > 0 && (
                            <Typography style={{ wordWrap: 'break-word', fontStyle: 'italic' }} variant='h5'>
                                {getSpecificDocumentStore.data?.totalFiles}{' '}
                                {getSpecificDocumentStore.data?.totalFiles === 1 ? 'File' : 'Files'};{' '}
                                {getSpecificDocumentStore.data?.totalChars?.toLocaleString()} Chars;{' '}
                                {getSpecificDocumentStore.data?.totalChunks} Chunks.
                            </Typography>
                        )}
                    </>
                )}
                <br />
                <TableContainer sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }} component={Paper}>
                    <Table aria-label='documents table' size='small'>
                        <TableHead
                            sx={{
                                backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                                height: 56
                            }}
                        >
                            <TableRow>
                                <TableCell>Loader</TableCell>
                                <TableCell>Splitter</TableCell>
                                <TableCell>Files</TableCell>
                                <TableCell>View Chunks</TableCell>
                                <TableCell>Edit Config</TableCell>
                                <TableCell>Delete</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {getSpecificDocumentStore.data?.loaders &&
                                getSpecificDocumentStore.data?.loaders.length > 0 &&
                                getSpecificDocumentStore.data?.loaders.map((loader, index) => (
                                    <LoaderRow
                                        key={index}
                                        loader={loader}
                                        theme={theme}
                                        onEditClick={() => openPreviewSettings(loader.id)}
                                        onViewChunksClick={() => showStoredChunks(loader.id)}
                                        onDeleteClick={() => onFileDelete(loader.id)}
                                    />
                                ))}
                            {getSpecificDocumentStore.data?.loaders?.length === 0 && (
                                <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell colSpan='6'>
                                        <Typography style={{ color: 'darkred' }} variant='h5'>
                                            Empty Document Store. Please add a document to this store.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {/*{getSpecificDocumentStore.data?.status === 'STALE' && (*/}
                {/*    <div style={{ width: '100%', textAlign: 'center', marginTop: '20px' }}>*/}
                {/*        <Typography color='warning' style={{ color: 'darkred', fontWeight: 500, fontStyle: 'italic', fontSize: 12 }}>*/}
                {/*            Some files are pending processing. Click on t.*/}
                {/*        </Typography>*/}
                {/*    </div>*/}
                {/*)}*/}
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
            <ConfirmDialog />
        </>
    )
}

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,
    padding: '6px 16px',

    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900]
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14
    }
}))

function LoaderRow(props) {
    const [open, setOpen] = useState(false)
    const theme = useTheme()

    return (
        <>
            <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <StyledTableCell scope='row' style={{ width: '15%' }}>
                    {props.loader.loaderName}
                </StyledTableCell>
                <StyledTableCell style={{ width: '40%' }}>{props.loader.splitterName ?? 'None'}</StyledTableCell>
                <StyledTableCell>
                    {props.loader.files.length}{' '}
                    {props.loader.files.length > 0 && (
                        <IconButton aria-label='expand row' size='small' color='inherit' onClick={() => setOpen(!open)}>
                            {props.loader.files.length > 0 && open ? <IconChevronsUp /> : <IconChevronsDown />}
                        </IconButton>
                    )}
                </StyledTableCell>
                <StyledTableCell>
                    <IconButton title='Chunks' color='primary' onClick={props.onViewChunksClick}>
                        <IconFileStack />
                    </IconButton>
                </StyledTableCell>
                <StyledTableCell>
                    <IconButton title='Settings' color='primary' onClick={props.onEditClick}>
                        <IconEdit />
                    </IconButton>
                </StyledTableCell>
                <StyledTableCell>
                    <IconButton title='Delete' color='error' onClick={props.onDeleteClick}>
                        <IconTrash />
                    </IconButton>
                </StyledTableCell>
            </TableRow>
            {open && (
                <TableRow sx={{ '& td': { border: 0 } }}>
                    <StyledTableCell sx={{ p: 2 }} colSpan={6}>
                        <Collapse in={open} timeout='auto' unmountOnExit>
                            <Box sx={{ borderRadius: 2, border: 1, borderColor: theme.palette.grey[900] + 25, overflow: 'hidden' }}>
                                <Table aria-label='loader files table' size='small'>
                                    <TableHead>
                                        <TableRow>
                                            <StyledTableCell sx={{ width: '5%' }}> </StyledTableCell>
                                            <StyledTableCell sx={{ width: '20%' }}>File Name</StyledTableCell>
                                            <StyledTableCell sx={{ width: '15%' }}>Size</StyledTableCell>
                                            <StyledTableCell sx={{ width: '20%' }}>Uploaded On</StyledTableCell>
                                            <StyledTableCell sx={{ width: '20%' }}>Chars</StyledTableCell>
                                            <StyledTableCell sx={{ width: '20%' }}>Chunks</StyledTableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {props.loader.files.map((file, index) => (
                                            <TableRow key={index}>
                                                <StyledTableCell>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            width: '20px',
                                                            height: '20px',
                                                            backgroundColor: file?.status === 'NEW' ? '#ffe57f' : 'green',
                                                            borderRadius: '50%'
                                                        }}
                                                    ></div>
                                                </StyledTableCell>
                                                <StyledTableCell>{file.name}</StyledTableCell>
                                                <StyledTableCell>{file.size.toLocaleString()}</StyledTableCell>
                                                <StyledTableCell>{moment(file.uploaded).format('MMMM Do, YYYY, HH:mm')}</StyledTableCell>
                                                <StyledTableCell>{file.totalChars.toLocaleString()}</StyledTableCell>
                                                <StyledTableCell>{file.totalChunks.toLocaleString()}</StyledTableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Collapse>
                    </StyledTableCell>
                </TableRow>
            )}
        </>
    )
}

LoaderRow.propTypes = {
    loader: PropTypes.any,
    showApiKeys: PropTypes.arrayOf(PropTypes.any),
    open: PropTypes.bool,
    theme: PropTypes.any,
    onViewChunksClick: PropTypes.func,
    onEditClick: PropTypes.func,
    onDeleteClick: PropTypes.func
}
export default DocumentStoreDetails
