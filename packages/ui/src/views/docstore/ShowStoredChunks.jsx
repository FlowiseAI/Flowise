import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

// material-ui
import { Button, Grid, IconButton, Stack, Table, TableHead, TableRow, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import CardContent from '@mui/material/CardContent'
import moment from 'moment'
import { IconArrowBack, IconEdit, IconTrash, IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons'
import TableCell from '@mui/material/TableCell'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'

// API
import documentsApi from '@/api/documentstore'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'

// icons
import Card from '@mui/material/Card'

import { useNavigate } from 'react-router-dom'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ReactJson from 'flowise-react-json-view'
import ErrorBoundary from '@/ErrorBoundary'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import ExpandTextDialog from '@/ui-component/dialog/ExpandTextDialog'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.darkTextPrimary,
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
    cursor: 'pointer',
    '&:hover': {
        background: theme.palette.card.hover,
        boxShadow: '0 2px 14px 0 rgb(32 40 45 / 20%)'
    },
    maxHeight: '250px',
    minHeight: '250px',
    maxWidth: '100%',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line',
    padding: 1
}))

const ShowStoredChunks = () => {
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    useNotifier()

    const getChunksApi = useApi(documentsApi.getFileChunks)
    const deleteChunkApi = useApi(documentsApi.deleteChunkFromStore)
    const editChunkApi = useApi(documentsApi.editChunkFromStore)

    const URLpath = document.location.pathname.toString().split('/')
    const fileId = URLpath[URLpath.length - 1] === 'document-stores' ? '' : URLpath[URLpath.length - 1]
    const storeId = URLpath[URLpath.length - 2] === 'document-stores' ? '' : URLpath[URLpath.length - 2]

    const [documentChunks, setDocumentChunks] = useState([])
    const [totalChunks, setTotalChunks] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [start, setStart] = useState(1)
    const [end, setEnd] = useState(50)

    const [loading, setLoading] = useState(false)
    const [selectedChunk, setSelectedChunk] = useState()
    const [selectedChunkNumber, setSelectedChunkNumber] = useState()
    const [error, setError] = useState(null)
    const { confirm } = useConfirm()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [showExpandDialog, setShowExpandDialog] = useState(false)
    const [expandDialogProps, setExpandDialogProps] = useState({})

    const chunkSelected = (chunkId) => {
        setSelectedChunk(documentChunks.find((chunk) => chunk.id === chunkId))
        setSelectedChunkNumber(documentChunks.findIndex((chunk) => chunk.id === chunkId) + start)
    }

    const editClicked = (chunk) => {
        const dialogProps = {
            value: chunk.pageContent,
            inputParam: { name: chunk.id, type: 'string', label: 'Edit Content' },
            disabled: false,
            confirmButtonName: 'Save',
            cancelButtonName: 'Cancel'
        }
        setExpandDialogProps(dialogProps)
        setShowExpandDialog(true)
    }

    const onEditDialogSave = async (chunk, newValue) => {
        setShowExpandDialog(false)

        try {
            setLoading(true)
            await editChunkApi.request(chunk.storeId, chunk.docId, chunk.id, { pageContent: newValue })
            enqueueSnackbar({
                message: 'Document Chunk Successfully Edited',
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
            getChunksApi.request(storeId, fileId, currentPage)
        } catch (error) {
            setLoading(false)
            setError(error)
        }
    }

    const deleteChunk = async (chunk) => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete chunk ${chunk.id} ? This action cannot be undone.`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                setLoading(true)
                await deleteChunkApi.request(chunk.storeId, chunk.docId, chunk.id)
                enqueueSnackbar({
                    message: 'Document Chunk deleted',
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
                getChunksApi.request(storeId, fileId)
            } catch (error) {
                setLoading(false)
                setError(error)
            }
        }
    }

    useEffect(() => {
        if (deleteChunkApi.error) {
            setLoading(false)
            setError(deleteChunkApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deleteChunkApi.error])

    useEffect(() => {
        setLoading(true)
        getChunksApi.request(storeId, fileId, currentPage)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const changePage = (newPage) => {
        setLoading(true)
        setCurrentPage(newPage)
        getChunksApi.request(storeId, fileId, newPage)
    }

    useEffect(() => {
        if (getChunksApi.data) {
            const data = getChunksApi.data
            setTotalChunks(data.count)
            setDocumentChunks(data.chunks)
            setLoading(false)
            setCurrentPage(data.currentPage)
            setStart(data.currentPage * 50 - 49)
            setEnd(data.currentPage * 50 > data.count ? data.count : data.currentPage * 50)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChunksApi.data])

    const openDS = (storeId) => {
        navigate('/document-stores/' + storeId)
    }

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader search={false} title={getChunksApi.data?.file.loaderName}>
                            <StyledButton
                                variant='contained'
                                sx={{ color: 'white' }}
                                startIcon={<IconArrowBack />}
                                onClick={() => openDS(storeId)}
                            >
                                Back to {getChunksApi.data?.file.storeName}
                            </StyledButton>
                        </ViewHeader>
                        <div style={{ width: '100%' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell component='th' scope='row'>
                                            <strong>Chunks:</strong>
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                size='small'
                                                onClick={() => changePage(currentPage - 1)}
                                                style={{ marginRight: 10 }}
                                                variant='outlined'
                                                disabled={currentPage === 1}
                                            >
                                                <IconChevronLeft />
                                            </IconButton>
                                            Showing {start}-{end} of {totalChunks}
                                            <IconButton
                                                size='small'
                                                onClick={() => changePage(currentPage + 1)}
                                                style={{ marginLeft: 10 }}
                                                variant='outlined'
                                                disabled={end >= totalChunks}
                                            >
                                                <IconChevronRight />
                                            </IconButton>
                                        </TableCell>
                                        <TableCell component='th' scope='row'>
                                            <strong>Total Chars:</strong>
                                        </TableCell>
                                        <TableCell>{getChunksApi.data?.file?.totalChars?.toLocaleString()}</TableCell>
                                        <TableCell component='th' scope='row'>
                                            <strong>Uploaded:</strong>
                                        </TableCell>
                                        <TableCell>{moment(getChunksApi.data?.file?.uploaded).format('DD-MMM-YY hh:mm a')}</TableCell>
                                    </TableRow>
                                </TableHead>
                            </Table>
                        </div>
                        {loading && <BackdropLoader open={loading} />}
                        <div>
                            <Grid container spacing='2'>
                                <Grid item xs={12} md={8} lg={8} sm={12} style={{ borderRight: '1px', borderRightStyle: 'outset' }}>
                                    <div style={{ height: '800px', overflow: 'scroll', padding: '8px' }}>
                                        <Grid container spacing={2}>
                                            {documentChunks?.map((row, index) => (
                                                <Grid item lg={6} md={6} sm={6} xs={6} key={index}>
                                                    <Typography variant='h6' color='textSecondary' gutterBottom>{`#${
                                                        start + index
                                                    }. Characters: ${row.pageContent.length}`}</Typography>
                                                    <CardWrapper style={{ borderColor: 'red' }} onClick={() => chunkSelected(row.id)}>
                                                        <Card style={{ padding: 0 }}>
                                                            <CardContent style={{ padding: 0 }}>
                                                                <Typography
                                                                    sx={{ wordWrap: 'break-word' }}
                                                                    variant='body2'
                                                                    style={{ fontSize: 10 }}
                                                                >
                                                                    {row.pageContent}
                                                                </Typography>
                                                            </CardContent>
                                                        </Card>
                                                    </CardWrapper>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </div>
                                </Grid>
                                <Grid item xs={0} md={4} lg={4} sm={0}>
                                    <div style={{ height: '800px', overflow: 'scroll', padding: '8px' }}>
                                        <Table size='small'>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell colSpan={2}>
                                                        <Typography variant='h4' gutterBottom>
                                                            Selected Chunk : #{selectedChunkNumber}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                                {selectedChunk && (
                                                    <>
                                                        <TableRow>
                                                            <TableCell component='th' scope='row' colSpan={2}>
                                                                <Button
                                                                    variant='outlined'
                                                                    startIcon={<IconEdit />}
                                                                    onClick={() => editClicked(selectedChunk)}
                                                                >
                                                                    Edit Content
                                                                </Button>{' '}
                                                                <Button
                                                                    variant='outlined'
                                                                    sx={{ color: 'red' }}
                                                                    startIcon={<IconTrash />}
                                                                    onClick={() => deleteChunk(selectedChunk)}
                                                                >
                                                                    Delete Chunk
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell component='th' scope='row'>
                                                                <strong>Id</strong>
                                                            </TableCell>
                                                            <TableCell>{selectedChunk.id}</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell component='th' scope='row'>
                                                                <strong>Chars</strong>
                                                            </TableCell>
                                                            <TableCell>{selectedChunk.pageContent.length}</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell style={{ border: 0 }} component='th' scope='row' colSpan={2}>
                                                                <strong>Content</strong>
                                                            </TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell colSpan={2}>
                                                                <Typography
                                                                    sx={{ wordWrap: 'break-word' }}
                                                                    variant='body2'
                                                                    style={{ fontSize: 12 }}
                                                                >
                                                                    {selectedChunk.pageContent}
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell style={{ border: 0 }} component='th' scope='row' colSpan={2}>
                                                                <strong>Metadata</strong>
                                                            </TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell colSpan={2}>
                                                                <ReactJson
                                                                    theme={customization.isDarkMode ? 'ocean' : 'rjv-default'}
                                                                    style={{ padding: 10, borderRadius: 10 }}
                                                                    src={JSON.parse(selectedChunk.metadata)}
                                                                    name={null}
                                                                    quotesOnKeys={false}
                                                                    displayDataTypes={false}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    </>
                                                )}
                                            </TableHead>
                                        </Table>
                                    </div>
                                </Grid>
                            </Grid>
                        </div>
                    </Stack>
                )}
            </MainCard>
            <ConfirmDialog />
            <ExpandTextDialog
                show={showExpandDialog}
                dialogProps={expandDialogProps}
                onCancel={() => setShowExpandDialog(false)}
                onConfirm={(newValue) => onEditDialogSave(selectedChunk, newValue)}
            ></ExpandTextDialog>
        </>
    )
}

export default ShowStoredChunks
