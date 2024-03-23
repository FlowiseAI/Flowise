import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { Grid, Box, Stack, TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'

// API
import documentsApi from '@/api/documents'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import Link from '@mui/material/Link'

// ==============================|| DOCUMENTS ||============================== //

const DocumentStoreChunks = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const getSpecificDocumentStore = useApi(documentsApi.getSpecificDocumentStore)

    const URLpath = document.location.pathname.toString().split('/')
    const fileId = URLpath[URLpath.length - 1] === 'documentStores' ? '' : URLpath[URLpath.length - 1]
    const storeId = URLpath[URLpath.length - 2] === 'documentStores' ? '' : URLpath[URLpath.length - 2]

    const [documentChunks, setDocumentChunks] = useState([])
    const [fileName, setFileName] = useState('')
    const [totalChunks, setTotalChunks] = useState(0)

    useEffect(() => {
        getSpecificDocumentStore.request(storeId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getSpecificDocumentStore.data) {
            getSpecificDocumentStore.data.files.map((file, index) => {
                if (file.id === fileId) {
                    setFileName(file.name)
                    setTotalChunks(file.totalChunks)
                    setDocumentChunks(file.chunks)
                }
            })
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificDocumentStore.data])

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <Grid sx={{ mb: 1.25 }} container direction='row'>
                        <h1>
                            <Link underline='always' key='2' color='inherit' href='/documentStores'>
                                Document Stores
                            </Link>
                            {' >'}
                            <Link underline='always' key='2' color='inherit' href='/documentStores/${storeId}'>
                                {getSpecificDocumentStore.data?.name}
                            </Link>
                            {' >'} {fileName}
                        </h1>
                    </Grid>
                </Stack>

                <Box sx={{ p: 1 }}>
                    <TableContainer style={{ marginTop: '30', border: 1 }} component={Paper}>
                        <Table sx={{ minWidth: 650 }} size='small' aria-label='a dense table'>
                            <caption>Showing {totalChunks} Documents.</caption>
                            <TableHead>
                                <TableRow sx={{ marginTop: '10', backgroundColor: 'primary' }}>
                                    <TableCell component='h3' scope='row' style={{ width: '10%' }} key='0'>
                                        {' '}
                                    </TableCell>
                                    <TableCell component='h3' style={{ width: '75%' }} key='1'>
                                        Content
                                    </TableCell>
                                    <TableCell style={{ width: '15%' }} key='2'>
                                        Length
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {documentChunks?.map((row, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell key='0' component='th' scope='row'>
                                            {index + 1}
                                        </TableCell>
                                        <TableCell key='1'>{row.pageContent}</TableCell>
                                        <TableCell key='2'>{row.pageContent.length}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </MainCard>
        </>
    )
}

export default DocumentStoreChunks
