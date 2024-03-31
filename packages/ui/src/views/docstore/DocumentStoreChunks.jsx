import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { Grid, Box, Stack, Typography, Link } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'

// API
import documentsApi from '@/api/documents'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import { useNavigate } from 'react-router-dom'

// ==============================|| DOCUMENTS ||============================== //

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

const DocumentStoreChunks = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()

    const getChunks = useApi(documentsApi.getFileChunks)

    const URLpath = document.location.pathname.toString().split('/')
    const fileId = URLpath[URLpath.length - 1] === 'documentStores' ? '' : URLpath[URLpath.length - 1]
    const storeId = URLpath[URLpath.length - 2] === 'documentStores' ? '' : URLpath[URLpath.length - 2]

    const [documentChunks, setDocumentChunks] = useState([])
    const [totalChunks, setTotalChunks] = useState(0)

    useEffect(() => {
        getChunks.request(storeId, fileId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getChunks.data) {
            setTotalChunks(getChunks.data.count)
            setDocumentChunks(getChunks.data.chunks)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChunks.data])

    const openDS = (id) => {
        navigate('/documentStores/' + storeId)
    }

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <Grid container direction='row'>
                        <h1>
                            <Link color='inherit' onClick={openDS}>
                                {getChunks.data?.file?.storeName}
                            </Link>{' '}
                            {' > '} {getChunks.data?.file?.name}
                        </h1>
                    </Grid>
                </Stack>
                <Typography style={{ wordWrap: 'break-word', fontStyle: 'italic' }} variant='h5'>
                    {getChunks.data?.file?.totalChars?.toLocaleString()} Chars, {totalChunks} Chunks.
                </Typography>

                <Box sx={{ p: 1 }}>
                    <Grid container spacing={2}>
                        {documentChunks?.map((row, index) => (
                            <Grid item lg={3} md={4} sm={6} xs={12} key={index}>
                                <CardWrapper>
                                    <Card style={{ padding: 0 }}>
                                        <CardContent style={{ padding: 0 }}>
                                            <Typography color='textSecondary' gutterBottom>
                                                {`#${index + 1}. Characters: ${row.pageContent.length}`}
                                            </Typography>
                                            <Typography sx={{ wordWrap: 'break-word' }} variant='body2' style={{ fontSize: 10 }}>
                                                {row.pageContent}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </CardWrapper>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </MainCard>
        </>
    )
}

export default DocumentStoreChunks
