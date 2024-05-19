import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import ReactJson from 'flowise-react-json-view'

// material-ui
import { Box, Card, Grid, Stack, Typography, OutlinedInput, IconButton, Button } from '@mui/material'
import { useTheme, styled } from '@mui/material/styles'
import CardContent from '@mui/material/CardContent'
import chunks_emptySVG from '@/assets/images/chunks_empty.svg'
import { IconSearch } from '@tabler/icons-react'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ExpandedChunkDialog from './ExpandedChunkDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'

// API
import documentsApi from '@/api/documentstore'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'

// store
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'

const searchOptions = [
    {
        label: 'Similarity',
        name: 'similarity'
    },
    {
        label: 'Max Marginal Relevance',
        name: 'mmr'
    }
]

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

const VectorStoreQuery = () => {
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const theme = useTheme()
    const { confirm } = useConfirm()

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const URLpath = document.location.pathname.toString().split('/')
    const storeId = URLpath[URLpath.length - 1] === 'document-stores' ? '' : URLpath[URLpath.length - 1]

    const [documentChunks, setDocumentChunks] = useState([])
    const [loading, setLoading] = useState(false)
    const [showExpandedChunkDialog, setShowExpandedChunkDialog] = useState(false)
    const [expandedChunkDialogProps, setExpandedChunkDialogProps] = useState({})
    const [documentStore, setDocumentStore] = useState({})
    const [query, setQuery] = useState('')

    const [topK, setTopK] = useState(0)
    const [allowSearchType, setAllowSearchType] = useState(true)
    const [searchType, setSearchType] = useState('')
    const [lambda, setLambda] = useState(0)
    const [fetchK, setFetchK] = useState(0)
    const [timeTaken, setTimeTaken] = useState(-1)

    const getSpecificDocumentStoreApi = useApi(documentsApi.getSpecificDocumentStore)
    const queryVectorStoreApi = useApi(documentsApi.queryVectorStore)

    const chunkSelected = (chunkId, selectedChunkNumber) => {
        const selectedChunk = documentChunks.find((chunk) => chunk.id === chunkId)
        const dialogProps = {
            data: {
                selectedChunk,
                selectedChunkNumber
            }
        }
        setExpandedChunkDialogProps(dialogProps)
        setShowExpandedChunkDialog(true)
    }

    const doQuery = () => {
        setLoading(true)
        const data = {
            query: query,
            storeId: storeId,
            topK: topK,
            searchType: searchType,
            lambda: lambda,
            fetchK: fetchK
        }
        queryVectorStoreApi.request(data)
    }

    useEffect(() => {
        if (queryVectorStoreApi.data) {
            setDocumentChunks(queryVectorStoreApi.data.docs)
            setTimeTaken(queryVectorStoreApi.data.timeTaken)
            setLoading(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryVectorStoreApi.data])

    useEffect(() => {
        getSpecificDocumentStoreApi.request(storeId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getSpecificDocumentStoreApi.data) {
            setDocumentStore(getSpecificDocumentStoreApi.data)
            const vectorStoreConfig = getSpecificDocumentStoreApi.data.vectorStoreConfig

            const topKValue = parseInt(vectorStoreConfig?.config?.topK)
            setTopK(isNaN(topKValue) ? 4 : topKValue)

            setAllowSearchType(vectorStoreConfig?.config?.searchType !== undefined)
            if (vectorStoreConfig?.config?.searchType !== undefined) {
                setSearchType(vectorStoreConfig.config.searchType)
                const lambdaValue = parseFloat(vectorStoreConfig.config.lambda)
                setLambda(isNaN(lambdaValue) ? 0.5 : lambdaValue)
                const fetchKValue = parseInt(vectorStoreConfig.config.fetchK)
                setFetchK(isNaN(fetchKValue) ? 20 : fetchKValue)
            }

            setLoading(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificDocumentStoreApi.data])

    return (
        <>
            <MainCard style={{ position: 'relative' }}>
                <Stack flexDirection='column' sx={{ gap: 1 }}>
                    <ViewHeader
                        isBackButton={true}
                        search={false}
                        title={documentStore?.name || 'Document Store'}
                        description='Retrieval Playground - Test your vector store retrieval settings'
                        onBack={() => navigate(-1)}
                    ></ViewHeader>
                    <div style={{ width: '100%' }}></div>
                    <div>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={12} md={12} lg={12}>
                                <Box>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography variant='overline'>
                                            Enter your Query<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>

                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        size='small'
                                        multiline={true}
                                        rows={2}
                                        sx={{ mt: 1 }}
                                        type='string'
                                        fullWidth
                                        key='query'
                                        onChange={(e) => setQuery(e.target.value)}
                                        value={query ?? ''}
                                        endAdornment={
                                            <IconButton variant='contained' onClick={doQuery}>
                                                <IconSearch />
                                            </IconButton>
                                        }
                                    />
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={12} md={12} lg={12}>
                                {/*<Box sx={{ p: 1 }}>*/}
                                {/*    <Typography variant='h3' sx={{ pb: 1 }}>*/}
                                {/*        Settings*/}
                                {/*        <TooltipWithParser*/}
                                {/*            title='These values are not persisted till you click on Save. Feel free to change and test your retrieved*/}
                                {/*        documents.'*/}
                                {/*        />*/}
                                {/*    </Typography>*/}
                                {/*</Box>*/}
                                <Stack direction='row' spacing={1}>
                                    <Box style={{ width: '25%' }}>
                                        <Typography variant='overline'>
                                            Top K<TooltipWithParser title='Number of top results to fetch' />
                                        </Typography>
                                        <OutlinedInput
                                            sx={{ mt: 1 }}
                                            id='topk'
                                            size='small'
                                            type='number'
                                            fullWidth
                                            value={topK}
                                            onChange={(e) => setTopK(e.target.value)}
                                        />
                                    </Box>
                                    {allowSearchType && (
                                        <>
                                            <Box style={{ width: '25%' }}>
                                                <Typography variant='overline'>Search Type</Typography>
                                                <Dropdown
                                                    key={searchType}
                                                    name='searchType'
                                                    options={searchOptions}
                                                    onSelect={(newValue) => setSearchType(newValue)}
                                                    value={searchType ?? 'choose an option'}
                                                />
                                            </Box>
                                            <Box style={{ width: '20%' }}>
                                                <Typography variant='overline'>
                                                    Lambda (for MMR Search)
                                                    <TooltipWithParser title='Number between 0 and 1 that determines the degree of diversity among the results, where 0 corresponds to maximum diversity and 1 to minimum diversity. Used only when the search type is MMR' />
                                                </Typography>
                                                <OutlinedInput
                                                    sx={{ mt: 1 }}
                                                    id='lambdaId'
                                                    size='small'
                                                    type='number'
                                                    disabled={searchType === 'similarity'}
                                                    value={lambda}
                                                    onChange={(e) => setLambda(e.target.value)}
                                                />
                                            </Box>
                                            <Box style={{ width: '20%' }}>
                                                <Typography variant='overline'>
                                                    Fetch K (for MMR Search)
                                                    <TooltipWithParser title='Number of initial documents to fetch for MMR reranking. Default to 20. Used only when the search type is MMR' />
                                                </Typography>
                                                <OutlinedInput
                                                    disabled={searchType === 'similarity'}
                                                    sx={{ mt: 1 }}
                                                    value={fetchK}
                                                    onChange={(e) => setFetchK(e.target.value)}
                                                    id='fetchId'
                                                    size='small'
                                                    type='number'
                                                />
                                            </Box>
                                        </>
                                    )}
                                    <Box style={{ verticalAlign: 'middle', width: '10%' }}>
                                        <Button sx={{ mt: 5 }} variant='outlined'>
                                            Save
                                        </Button>
                                    </Box>
                                </Stack>
                            </Grid>
                            <Grid item xs={12} sm={12} md={12} lg={12}>
                                <Box sx={{ p: 1 }}>
                                    <Typography variant='h3'>Retrieved Documents</Typography>
                                    {timeTaken > -1 && (
                                        <Typography variant='body2' sx={{ color: 'gray' }}>
                                            Time taken: {timeTaken} millis.
                                        </Typography>
                                    )}
                                </Box>
                                {!documentChunks.length && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            width: '100%'
                                        }}
                                    >
                                        <Box sx={{ mt: 5, p: 2, height: 'auto' }}>
                                            <img
                                                style={{ objectFit: 'cover', height: '16vh', width: 'auto' }}
                                                src={chunks_emptySVG}
                                                alt='chunks_emptySVG'
                                            />
                                        </Box>
                                        <div>No Documents Retrieved</div>
                                    </div>
                                )}
                            </Grid>
                            {documentChunks?.length > 0 &&
                                documentChunks.map((row, index) => (
                                    <Grid item lg={4} md={4} sm={6} xs={6} key={index}>
                                        <CardWrapper
                                            content={false}
                                            onClick={() => chunkSelected(row.id, index + 1)}
                                            sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                        >
                                            <Card>
                                                <CardContent sx={{ p: 2 }}>
                                                    <Typography sx={{ wordWrap: 'break-word', mb: 1 }} variant='h5'>
                                                        {`#${index + 1}. Characters: ${row.pageContent.length}`}
                                                    </Typography>
                                                    <Typography sx={{ wordWrap: 'break-word' }} variant='body2'>
                                                        {row.pageContent}
                                                    </Typography>
                                                    <ReactJson
                                                        theme={customization.isDarkMode ? 'ocean' : 'rjv-default'}
                                                        style={{ paddingTop: 10 }}
                                                        src={row.metadata || {}}
                                                        name={null}
                                                        quotesOnKeys={false}
                                                        enableClipboard={false}
                                                        displayDataTypes={false}
                                                        collapsed={1}
                                                    />
                                                </CardContent>
                                            </Card>
                                        </CardWrapper>
                                    </Grid>
                                ))}
                        </Grid>
                    </div>
                </Stack>
            </MainCard>
            <ConfirmDialog />
            <ExpandedChunkDialog
                show={showExpandedChunkDialog}
                dialogProps={expandedChunkDialogProps}
                onCancel={() => setShowExpandedChunkDialog(false)}
                isReadOnly={true}
            ></ExpandedChunkDialog>
            {loading && <BackdropLoader open={loading} />}
        </>
    )
}

export default VectorStoreQuery
