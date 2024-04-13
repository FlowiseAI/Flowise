import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { Box, Divider, Grid, Stack, Table, TableHead, TableRow, Typography } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'

// API
import documentsApi from '@/api/documentstore'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import Card from '@mui/material/Card'

import CardContent from '@mui/material/CardContent'
import { useNavigate } from 'react-router-dom'
import { IconArrowBack } from '@tabler/icons'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { formatBytes } from '@/utils/genericHelper'
import moment from 'moment'
import TableCell from '@mui/material/TableCell'
import ReactJson from 'flowise-react-json-view'

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
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()

    const getChunksApi = useApi(documentsApi.getFileChunks)

    const URLpath = document.location.pathname.toString().split('/')
    const fileId = URLpath[URLpath.length - 1] === 'document-stores' ? '' : URLpath[URLpath.length - 1]
    const storeId = URLpath[URLpath.length - 2] === 'document-stores' ? '' : URLpath[URLpath.length - 2]

    const [documentChunks, setDocumentChunks] = useState([])
    const [totalChunks, setTotalChunks] = useState(0)
    const [loading, setLoading] = useState(false)
    const [selectedChunk, setSelectedChunk] = useState()
    const [selectedChunkNumber, setSelectedChunkNumber] = useState()

    const chunkSelected = (chunkId) => {
        setSelectedChunk(documentChunks.find((chunk) => chunk.id === chunkId))
        setSelectedChunkNumber(documentChunks.findIndex((chunk) => chunk.id === chunkId) + 1)
    }

    useEffect(() => {
        setLoading(true)
        getChunksApi.request(storeId, fileId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getChunksApi.data) {
            const data = getChunksApi.data
            setTotalChunks(data.count)
            setDocumentChunks(data.chunks)
            setLoading(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChunksApi.data])

    const openDS = (storeId) => {
        navigate('/document-stores/' + storeId)
    }

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <Grid container direction='row'>
                        <div>
                            <h1>
                                {getChunksApi.data?.file?.loaderName} Loader ({getChunksApi.data?.file?.splitterName})
                            </h1>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell component='th' scope='row'>
                                            <strong>Chunks:</strong>
                                        </TableCell>
                                        <TableCell>{totalChunks}</TableCell>
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
                        <Box sx={{ flexGrow: 1 }} />
                        <Grid item>
                            <StyledButton
                                variant='contained'
                                sx={{ color: 'white' }}
                                startIcon={<IconArrowBack />}
                                onClick={() => openDS(storeId)}
                            >
                                Back to Document Store
                            </StyledButton>
                        </Grid>
                    </Grid>
                </Stack>
                <Divider sx={{ my: 2 }} />
                {loading && <BackdropLoader open={loading} />}
                <div>
                    <Grid container spacing='2'>
                        <Grid item xs={12} md={8} lg={8} sm={12} style={{ borderRight: '1px', borderRightStyle: 'outset' }}>
                            <div style={{ height: '800px', overflow: 'scroll', padding: '8px' }}>
                                <Grid container spacing={2}>
                                    {documentChunks?.map((row, index) => (
                                        <Grid item lg={6} md={6} sm={6} xs={6} key={index}>
                                            <Typography variant='h6' color='textSecondary' gutterBottom>{`#${index + 1}. Characters: ${
                                                row.pageContent.length
                                            }`}</Typography>
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
            </MainCard>
        </>
    )
}

export default ShowStoredChunks
