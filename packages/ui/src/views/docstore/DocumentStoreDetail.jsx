import { useEffect, useRef, useState } from 'react'
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
    IconButton
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'

// API
import documentsApi from '@/api/documentstore'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus, IconEdit, IconTrash, IconRefresh, IconX, IconFileStack } from '@tabler/icons'
import AddDocStoreDialog from '@/views/docstore/AddDocStoreDialog'
import Button from '@mui/material/Button'
import moment from 'moment/moment'
import { formatBytes } from '@/utils/genericHelper'
import { useNavigate } from 'react-router-dom'
import useNotifier from '@/utils/useNotifier'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import useConfirm from '@/hooks/useConfirm'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import DocumentLoaderListDialog from '@/views/docstore/DocumentLoaderListDialog'

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
    const fileUploadRef = useRef(null)
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

    const handleUploadClick = async (e) => {
        if (!e.target.files) return

        if (e.target.files.length === 1) {
            const file = e.target.files[0]
            const { name } = file

            const reader = new FileReader()
            reader.onload = (evt) => {
                if (!evt?.target?.result) {
                    return
                }
                const { result } = evt.target

                const value = result + `,filename:${name}`

                onChange(value)
            }
            reader.readAsDataURL(file)
        } else if (e.target.files.length > 0) {
            let files = Array.from(e.target.files).map((file) => {
                const reader = new FileReader()
                const { name } = file

                return new Promise((resolve) => {
                    reader.onload = (evt) => {
                        if (!evt?.target?.result) {
                            return
                        }
                        const { result } = evt.target
                        const value = result + `,filename:${name}`
                        resolve(value)
                    }
                    reader.readAsDataURL(file)
                })
            })

            const res = await Promise.all(files)
            onChange(JSON.stringify(res))
        }
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

    const onChange = async (value) => {
        const data = {
            storeId: storeId,
            uploadFiles: value
        }
        try {
            const response = await documentsApi.uploadFileToStore(storeId, data)
            if (response.data) {
                getSpecificDocumentStore.request(storeId)
            }
        } catch (error) {
            const errorData = error.response.data?.message || 'Unknown Error'
            enqueueSnackbar({
                message: `Failed to upload file: ${errorData}`,
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

    const handleFileChange = async (event) => {
        // 👇️ open file input box on click of another element
        fileUploadRef.current.click()
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
                            <input style={{ display: 'none' }} multiple ref={fileUploadRef} type='file' onChange={handleUploadClick} />
                            <StyledButton
                                variant='contained'
                                sx={{ mr: 2, color: 'white' }}
                                startIcon={<IconPlus />}
                                onClick={handleFileChange}
                            >
                                Add Document
                            </StyledButton>
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
                <TableContainer component={Paper}>
                    <Table aria-label='documents table'>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{ width: '2%' }}> </TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Size</TableCell>
                                <TableCell>Uploaded</TableCell>
                                <TableCell>Chunks</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {getSpecificDocumentStore.data?.files.length > 0 &&
                                getSpecificDocumentStore.data?.files.map((file, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell style={{ width: '2%' }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    width: '20px',
                                                    height: '20px',
                                                    backgroundColor: file.status === 'NEW' ? '#ffe57f' : 'green',
                                                    borderRadius: '50%'
                                                }}
                                            ></div>
                                        </TableCell>
                                        <TableCell component='th' scope='row'>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Button
                                                    disabled={file.status === 'NEW'}
                                                    onClick={() => showStoredChunks(file.id)}
                                                    style={{ textAlign: 'left' }}
                                                >
                                                    {file.name}
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatBytes(file.size)}</TableCell>
                                        <TableCell>{moment(file.uploaded).format('DD-MMM-YY hh:mm a')}</TableCell>
                                        <TableCell>
                                            {file.status === 'NEW' ? 'Pending Processing...' : file.totalChunks + ' chunks'}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton title='Chunks' color='primary' onClick={() => openPreviewSettings(file.id)}>
                                                <IconFileStack />
                                            </IconButton>
                                            <IconButton title='Delete' color='error' onClick={() => onFileDelete(file)}>
                                                <IconTrash />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {getSpecificDocumentStore.data?.files.length === 0 && (
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

export default DocumentStoreDetails
