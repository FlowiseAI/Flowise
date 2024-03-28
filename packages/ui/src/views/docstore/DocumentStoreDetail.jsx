import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

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
import documentsApi from '@/api/documents'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons'
import AddDocStoreDialog from '@/views/docstore/AddDocStoreDialog'
import Link from '@mui/material/Link'
import Button from '@mui/material/Button'
import moment from 'moment/moment'
import { formatBytes } from '@/utils/genericHelper'
import { useNavigate } from 'react-router-dom'

// ==============================|| DOCUMENTS ||============================== //

const DocumentStoreDetails = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()

    const getSpecificDocumentStore = useApi(documentsApi.getSpecificDocumentStore)

    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})

    const openChunks = (id) => {
        navigate('/documentStores/' + storeId + '/' + id)
    }

    const onUploadFile = (file) => {
        try {
            const dialogProp = {
                title: 'Add New Tool',
                type: 'IMPORT',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Save',
                data: JSON.parse(file)
            }
            setDialogProps(dialogProp)
            setShowDialog(true)
        } catch (e) {
            console.error(e)
        }
    }

    const handleFileUpload = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const { result } = evt.target
            onUploadFile(result)
        }
        reader.readAsText(file)
    }

    const addNew = () => {
        const dialogProp = {
            title: 'Create New Document Store',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Create New Document Store'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (selectedTool) => {
        const dialogProp = {
            title: 'Edit Document Store',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Update Document Store',
            data: selectedTool
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = () => {
        setShowDialog(false)
        getAllDocumentStores.request()
    }

    const URLpath = document.location.pathname.toString().split('/')
    const storeId = URLpath[URLpath.length - 1] === 'documentStores' ? '' : URLpath[URLpath.length - 1]
    useEffect(() => {
        getSpecificDocumentStore.request(storeId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <Grid sx={{ mb: 1.25 }} container direction='row'>
                        <h1>
                            <Link underline='always' key='2' color='inherit' href='/documentStores'>
                                Document Stores
                            </Link>{' '}
                            {'>'} {getSpecificDocumentStore.data?.name}
                        </h1>
                        <Box sx={{ flexGrow: 1 }} />
                        <Grid item>
                            <Button variant='outlined' onClick={edit} sx={{ mr: 2 }} startIcon={<IconEdit />}>
                                Edit
                            </Button>
                            <StyledButton variant='contained' sx={{ color: 'white' }} onClick={edit} startIcon={<IconPlus />}>
                                Add Document
                            </StyledButton>
                        </Grid>
                    </Grid>
                </Stack>
                {!getSpecificDocumentStore.loading && getSpecificDocumentStore.data && (
                    <>
                        <Typography style={{ wordWrap: 'break-word' }} variant='h4'>
                            {getSpecificDocumentStore.data?.description}
                        </Typography>
                        <Typography style={{ wordWrap: 'break-word', fontStyle: 'italic' }} variant='h5'>
                            {getSpecificDocumentStore.data?.totalFiles} Files, {getSpecificDocumentStore.data?.totalChars.toLocaleString()}
                            {' Chars.'}
                        </Typography>
                        <Typography style={{ wordWrap: 'break-word', fontStyle: 'italic' }} variant='h5'>
                            {getSpecificDocumentStore.data?.totalChunks}
                            {' Chunks, '}
                            {getSpecificDocumentStore.data?.chunkSize}
                            {' Chunk Size, '}
                            {getSpecificDocumentStore.data?.chunkOverlap}
                            {' Chunk Overlap. '}
                        </Typography>
                    </>
                )}
                {getSpecificDocumentStore.data?.files.length > 0 && (
                    <TableContainer component={Paper}>
                        <Table aria-label='documents table'>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Size</TableCell>
                                    <TableCell>Uploaded</TableCell>
                                    <TableCell>Chunks</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {getSpecificDocumentStore.data?.files.map((file, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell component='th' scope='row'>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Button onClick={() => openChunks(file.id)} sx={{ textAlign: 'left' }}>
                                                    {file.name}
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatBytes(file.size)}</TableCell>
                                        <TableCell>{moment(file.uploaded).format('DD-MMM-YY hh:mm a')}</TableCell>
                                        <TableCell>
                                            {file.totalChunks} {file.totalChunks > 1 ? 'chunks' : 'chunk'}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton title='Delete' color='error' onClick={() => deleteVariable(file)}>
                                                <IconTrash />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
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
        </>
    )
}

export default DocumentStoreDetails
