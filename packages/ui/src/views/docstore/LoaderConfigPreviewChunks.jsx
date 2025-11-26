import { cloneDeep } from 'lodash'
import { useEffect, useState } from 'react'
import { validate as uuidValidate, v4 as uuidv4 } from 'uuid'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import ReactJson from 'flowise-react-json-view'

// Hooks
import useApi from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'

// Material-UI
import { Skeleton, Toolbar, Box, Button, Card, CardContent, Grid, OutlinedInput, Stack, Typography, TextField } from '@mui/material'
import { useTheme, styled } from '@mui/material/styles'
import { IconScissors, IconArrowLeft, IconDatabaseImport, IconBook, IconX, IconEye } from '@tabler/icons-react'

// Project import
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import DocStoreInputHandler from '@/views/docstore/DocStoreInputHandler'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { StyledFab } from '@/ui-component/button/StyledFab'
import ErrorBoundary from '@/ErrorBoundary'
import ExpandedChunkDialog from './ExpandedChunkDialog'

// API
import nodesApi from '@/api/nodes'
import documentStoreApi from '@/api/documentstore'
import documentsApi from '@/api/documentstore'

// Const
import { baseURL, gridSpacing } from '@/store/constant'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { useError } from '@/store/context/ErrorContext'

// Utils
import { initNode, showHideInputParams } from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'

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

// ===========================|| DOCUMENT LOADER CHUNKS ||=========================== //

const LoaderConfigPreviewChunks = () => {
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()
    const theme = useTheme()
    const { error } = useError()
    const { hasAssignedWorkspace } = useAuth()

    const getNodeDetailsApi = useApi(nodesApi.getSpecificNode)
    const getNodesByCategoryApi = useApi(nodesApi.getNodesByCategory)
    const getSpecificDocumentStoreApi = useApi(documentsApi.getSpecificDocumentStore)

    const { storeId, name: docLoaderNodeName } = useParams()

    const [selectedDocumentLoader, setSelectedDocumentLoader] = useState({})

    const [loading, setLoading] = useState(false)
    const [loaderName, setLoaderName] = useState('')

    const [textSplitterNodes, setTextSplitterNodes] = useState([])
    const [splitterOptions, setTextSplitterOptions] = useState([])
    const [selectedTextSplitter, setSelectedTextSplitter] = useState({})

    const [documentChunks, setDocumentChunks] = useState([])
    const [totalChunks, setTotalChunks] = useState(0)

    const [currentPreviewCount, setCurrentPreviewCount] = useState(0)
    const [previewChunkCount, setPreviewChunkCount] = useState(20)
    const [existingLoaderFromDocStoreTable, setExistingLoaderFromDocStoreTable] = useState()

    const [showExpandedChunkDialog, setShowExpandedChunkDialog] = useState(false)
    const [expandedChunkDialogProps, setExpandedChunkDialogProps] = useState({})

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //
    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const handleDocumentLoaderDataChange = ({ inputParam, newValue }) => {
        setSelectedDocumentLoader((prevData) => {
            const updatedData = { ...prevData }
            updatedData.inputs[inputParam.name] = newValue
            updatedData.inputParams = showHideInputParams(updatedData)
            return updatedData
        })
    }

    const handleTextSplitterDataChange = ({ inputParam, newValue }) => {
        setSelectedTextSplitter((prevData) => {
            const updatedData = { ...prevData }
            updatedData.inputs[inputParam.name] = newValue
            updatedData.inputParams = showHideInputParams(updatedData)
            return updatedData
        })
    }

    const onSplitterChange = (name) => {
        const textSplitter = (textSplitterNodes ?? []).find((splitter) => splitter.name === name)
        if (textSplitter) {
            setSelectedTextSplitter(textSplitter)
        } else {
            setSelectedTextSplitter({})
        }
    }

    const onChunkClick = (selectedChunk, selectedChunkNumber) => {
        const dialogProps = {
            data: {
                selectedChunk,
                selectedChunkNumber
            }
        }
        setExpandedChunkDialogProps(dialogProps)
        setShowExpandedChunkDialog(true)
    }

    const checkMandatoryFields = () => {
        let canSubmit = true
        const missingFields = []
        const inputParams = (selectedDocumentLoader.inputParams ?? []).filter((inputParam) => !inputParam.hidden)
        for (const inputParam of inputParams) {
            if (!inputParam.optional && (!selectedDocumentLoader.inputs[inputParam.name] || !selectedDocumentLoader.credential)) {
                if (
                    inputParam.type === 'credential' &&
                    !selectedDocumentLoader.credential &&
                    !selectedDocumentLoader.inputs['FLOWISE_CREDENTIAL_ID']
                ) {
                    canSubmit = false
                    missingFields.push(inputParam.label || inputParam.name)
                } else if (inputParam.type !== 'credential' && !selectedDocumentLoader.inputs[inputParam.name]) {
                    canSubmit = false
                    missingFields.push(inputParam.label || inputParam.name)
                }
            }
        }
        if (!canSubmit) {
            const fieldsList = missingFields.join(', ')
            enqueueSnackbar({
                message: `Please fill in the following mandatory fields: ${fieldsList}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'warning',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
        return canSubmit
    }

    const onPreviewChunks = async () => {
        if (checkMandatoryFields()) {
            setLoading(true)
            const config = prepareConfig()
            config.previewChunkCount = previewChunkCount

            try {
                const previewResp = await documentStoreApi.previewChunks(config)
                if (previewResp.data) {
                    setTotalChunks(previewResp.data.totalChunks)
                    setDocumentChunks(Array.isArray(previewResp.data.chunks) ? previewResp.data.chunks : [])
                    setCurrentPreviewCount(previewResp.data.previewChunkCount)
                }
                setLoading(false)
            } catch (error) {
                setLoading(false)
                enqueueSnackbar({
                    message: `Failed to preview chunks: ${
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

    const onSaveAndProcess = async () => {
        if (checkMandatoryFields()) {
            setLoading(true)
            const config = prepareConfig()
            try {
                const saveResp = await documentStoreApi.saveProcessingLoader(config)
                setLoading(false)
                if (saveResp.data) {
                    enqueueSnackbar({
                        message: 'File submitted for processing. Redirecting to Document Store..',
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
                    // don't wait for the process to complete, redirect to document store
                    documentStoreApi.processLoader(config, saveResp.data?.id)
                    navigate('/document-stores/' + storeId)
                }
            } catch (error) {
                setLoading(false)
                enqueueSnackbar({
                    message: `Failed to process chunking: ${
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

    const prepareConfig = () => {
        const config = {}

        // Set loader id & name
        if (existingLoaderFromDocStoreTable) {
            config.loaderId = existingLoaderFromDocStoreTable.loaderId
            config.id = existingLoaderFromDocStoreTable.id
        } else {
            config.loaderId = docLoaderNodeName
        }

        // Set store id & loader name
        config.storeId = storeId
        config.loaderName = loaderName || selectedDocumentLoader?.label

        // Set loader config
        if (selectedDocumentLoader.inputs) {
            config.loaderConfig = {}
            Object.keys(selectedDocumentLoader.inputs).map((key) => {
                config.loaderConfig[key] = selectedDocumentLoader.inputs[key]
            })
        }

        // If Text splitter is set
        if (selectedTextSplitter.inputs && selectedTextSplitter.name && Object.keys(selectedTextSplitter).length > 0) {
            config.splitterId = selectedTextSplitter.name
            config.splitterConfig = {}

            Object.keys(selectedTextSplitter.inputs).map((key) => {
                config.splitterConfig[key] = selectedTextSplitter.inputs[key]
            })
            const textSplitter = textSplitterNodes.find((splitter) => splitter.name === selectedTextSplitter.name)
            if (textSplitter) config.splitterName = textSplitter.label
        }

        if (selectedDocumentLoader.credential) {
            config.credential = selectedDocumentLoader.credential
        }

        return config
    }

    useEffect(() => {
        if (uuidValidate(docLoaderNodeName)) {
            // this is a document store edit config
            getSpecificDocumentStoreApi.request(storeId)
        } else {
            getNodeDetailsApi.request(docLoaderNodeName)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getNodeDetailsApi.data) {
            const nodeData = cloneDeep(initNode(getNodeDetailsApi.data, uuidv4()))
            // If this is a document store edit config, set the existing input values
            if (existingLoaderFromDocStoreTable && existingLoaderFromDocStoreTable.loaderConfig) {
                nodeData.inputs = existingLoaderFromDocStoreTable.loaderConfig
                setLoaderName(existingLoaderFromDocStoreTable.loaderName)
            }
            setSelectedDocumentLoader(nodeData)

            // Check if the loader has a text splitter, if yes, get the text splitter nodes
            const textSplitter = nodeData.inputAnchors.find((inputAnchor) => inputAnchor.name === 'textSplitter')
            if (textSplitter) {
                getNodesByCategoryApi.request('Text Splitters')
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getNodeDetailsApi.data])

    useEffect(() => {
        if (getNodesByCategoryApi.data) {
            // Set available text splitter nodes
            const nodes = []
            for (const node of getNodesByCategoryApi.data) {
                nodes.push(cloneDeep(initNode(node, uuidv4())))
            }
            setTextSplitterNodes(nodes)

            // Set options
            const options = getNodesByCategoryApi.data.map((splitter) => ({
                label: splitter.label,
                name: splitter.name
            }))
            options.unshift({ label: 'None', name: 'none' })
            setTextSplitterOptions(options)

            // If this is a document store edit config, set the existing input values
            if (
                existingLoaderFromDocStoreTable &&
                existingLoaderFromDocStoreTable.splitterConfig &&
                existingLoaderFromDocStoreTable.splitterId
            ) {
                const textSplitter = nodes.find((splitter) => splitter.name === existingLoaderFromDocStoreTable.splitterId)
                if (textSplitter) {
                    textSplitter.inputs = cloneDeep(existingLoaderFromDocStoreTable.splitterConfig)
                    setSelectedTextSplitter(textSplitter)
                } else {
                    setSelectedTextSplitter({})
                }
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getNodesByCategoryApi.data])

    useEffect(() => {
        if (getSpecificDocumentStoreApi.data) {
            const workspaceId = getSpecificDocumentStoreApi.data.workspaceId
            if (!hasAssignedWorkspace(workspaceId)) {
                navigate('/unauthorized')
                return
            }
            if (getSpecificDocumentStoreApi.data?.loaders.length > 0) {
                const loader = getSpecificDocumentStoreApi.data.loaders.find((loader) => loader.id === docLoaderNodeName)
                if (loader) {
                    setExistingLoaderFromDocStoreTable(loader)
                    getNodeDetailsApi.request(loader.loaderId)
                }
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificDocumentStoreApi.data])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column'>
                        <Box sx={{ flexGrow: 1, py: 1.25, width: '100%' }}>
                            <Toolbar
                                disableGutters={true}
                                sx={{
                                    p: 0,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    width: '100%'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row' }}>
                                    <StyledFab size='small' color='secondary' aria-label='back' title='Back' onClick={() => navigate(-1)}>
                                        <IconArrowLeft />
                                    </StyledFab>
                                    <Typography sx={{ ml: 2, mr: 2 }} variant='h3'>
                                        {selectedDocumentLoader?.label}
                                    </Typography>
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: 'white',
                                            boxShadow: '0 2px 14px 0 rgb(32 40 45 / 25%)'
                                        }}
                                    >
                                        {selectedDocumentLoader?.name ? (
                                            <img
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    padding: 7,
                                                    borderRadius: '50%',
                                                    objectFit: 'contain'
                                                }}
                                                alt={selectedDocumentLoader?.name ?? 'docloader'}
                                                src={`${baseURL}/api/v1/node-icon/${selectedDocumentLoader?.name}`}
                                            />
                                        ) : (
                                            <IconBook color='black' />
                                        )}
                                    </div>
                                </Box>
                                <Box>
                                    <StyledButton
                                        variant='contained'
                                        onClick={onSaveAndProcess}
                                        sx={{ borderRadius: 2, height: '100%' }}
                                        startIcon={<IconDatabaseImport />}
                                    >
                                        Process
                                    </StyledButton>
                                </Box>
                            </Toolbar>
                        </Box>
                        <Box>
                            <Grid container spacing='2'>
                                <Grid item xs={4} md={6} lg={6} sm={4}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            paddingRight: 15
                                        }}
                                    >
                                        <Box sx={{ p: 2 }}>
                                            <TextField
                                                fullWidth
                                                sx={{ mt: 1 }}
                                                size='small'
                                                label={
                                                    selectedDocumentLoader?.label?.toLowerCase().includes('loader')
                                                        ? selectedDocumentLoader.label + ' name'
                                                        : selectedDocumentLoader?.label + ' Loader Name'
                                                }
                                                value={loaderName}
                                                onChange={(e) => setLoaderName(e.target.value)}
                                            />
                                        </Box>
                                        {selectedDocumentLoader &&
                                            Object.keys(selectedDocumentLoader).length > 0 &&
                                            showHideInputParams(selectedDocumentLoader)
                                                .filter((inputParam) => !inputParam.hidden && inputParam.display !== false)
                                                .map((inputParam, index) => (
                                                    <DocStoreInputHandler
                                                        key={index}
                                                        inputParam={inputParam}
                                                        data={selectedDocumentLoader}
                                                        onNodeDataChange={handleDocumentLoaderDataChange}
                                                    />
                                                ))}
                                        {textSplitterNodes && textSplitterNodes.length > 0 && (
                                            <>
                                                <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row', p: 2, mt: 5 }}>
                                                    <Typography sx={{ mr: 2 }} variant='h3'>
                                                        {(splitterOptions ?? []).find(
                                                            (splitter) => splitter.name === selectedTextSplitter?.name
                                                        )?.label ?? 'Select Text Splitter'}
                                                    </Typography>
                                                    <div
                                                        style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: '50%',
                                                            backgroundColor: 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            boxShadow: '0 2px 14px 0 rgb(32 40 45 / 25%)'
                                                        }}
                                                    >
                                                        {selectedTextSplitter?.name ? (
                                                            <img
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    padding: 7,
                                                                    borderRadius: '50%',
                                                                    objectFit: 'contain'
                                                                }}
                                                                alt={selectedTextSplitter?.name ?? 'textsplitter'}
                                                                src={`${baseURL}/api/v1/node-icon/${selectedTextSplitter?.name}`}
                                                            />
                                                        ) : (
                                                            <IconScissors color='black' />
                                                        )}
                                                    </div>
                                                </Box>
                                                <Box sx={{ p: 2 }}>
                                                    <Typography>Splitter</Typography>
                                                    <Dropdown
                                                        key={JSON.stringify(selectedTextSplitter)}
                                                        name='textSplitter'
                                                        options={splitterOptions}
                                                        onSelect={(newValue) => onSplitterChange(newValue)}
                                                        value={selectedTextSplitter?.name ?? 'none'}
                                                    />
                                                </Box>
                                            </>
                                        )}
                                        {Object.keys(selectedTextSplitter).length > 0 &&
                                            showHideInputParams(selectedTextSplitter)
                                                .filter((inputParam) => !inputParam.hidden && inputParam.display !== false)
                                                .map((inputParam, index) => (
                                                    <DocStoreInputHandler
                                                        key={index}
                                                        data={selectedTextSplitter}
                                                        inputParam={inputParam}
                                                        onNodeDataChange={handleTextSplitterDataChange}
                                                    />
                                                ))}
                                    </div>
                                </Grid>
                                <Grid item xs={8} md={6} lg={6} sm={8}>
                                    {!documentChunks ||
                                        (documentChunks.length === 0 && (
                                            <div style={{ position: 'relative' }}>
                                                <Box display='grid' gridTemplateColumns='repeat(2, 1fr)' gap={gridSpacing}>
                                                    <Skeleton
                                                        animation={false}
                                                        sx={{ bgcolor: customization.isDarkMode ? '#23262c' : '#fafafa' }}
                                                        variant='rounded'
                                                        height={160}
                                                    />
                                                    <Skeleton
                                                        animation={false}
                                                        sx={{ bgcolor: customization.isDarkMode ? '#23262c' : '#fafafa' }}
                                                        variant='rounded'
                                                        height={160}
                                                    />
                                                    <Skeleton
                                                        animation={false}
                                                        sx={{ bgcolor: customization.isDarkMode ? '#23262c' : '#fafafa' }}
                                                        variant='rounded'
                                                        height={160}
                                                    />
                                                    <Skeleton
                                                        animation={false}
                                                        sx={{ bgcolor: customization.isDarkMode ? '#23262c' : '#fafafa' }}
                                                        variant='rounded'
                                                        height={160}
                                                    />
                                                    <Skeleton
                                                        animation={false}
                                                        sx={{ bgcolor: customization.isDarkMode ? '#23262c' : '#fafafa' }}
                                                        variant='rounded'
                                                        height={160}
                                                    />
                                                    <Skeleton
                                                        animation={false}
                                                        sx={{ bgcolor: customization.isDarkMode ? '#23262c' : '#fafafa' }}
                                                        variant='rounded'
                                                        height={160}
                                                    />
                                                </Box>
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        right: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        backdropFilter: `blur(1px)`,
                                                        background: `transparent`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <StyledFab
                                                        color='secondary'
                                                        aria-label='preview'
                                                        title='Preview'
                                                        variant='extended'
                                                        onClick={onPreviewChunks}
                                                    >
                                                        <IconEye style={{ marginRight: '5px' }} />
                                                        Preview Chunks
                                                    </StyledFab>
                                                </div>
                                            </div>
                                        ))}
                                    {documentChunks && documentChunks.length > 0 && (
                                        <>
                                            <Typography sx={{ wordWrap: 'break-word', textAlign: 'left', mb: 2 }} variant='h3'>
                                                {currentPreviewCount} of {totalChunks} Chunks
                                            </Typography>
                                            <Box sx={{ mb: 3 }}>
                                                <Typography>Show Chunks in Preview</Typography>
                                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                    <OutlinedInput
                                                        size='small'
                                                        multiline={false}
                                                        sx={{ mt: 1, flex: 1, mr: 2 }}
                                                        type='number'
                                                        key='previewChunkCount'
                                                        onChange={(e) => setPreviewChunkCount(e.target.value)}
                                                        value={previewChunkCount ?? 25}
                                                    />
                                                    <StyledFab
                                                        color='secondary'
                                                        aria-label='preview'
                                                        title='Preview'
                                                        variant='extended'
                                                        onClick={onPreviewChunks}
                                                    >
                                                        <IconEye style={{ marginRight: '5px' }} />
                                                        Preview
                                                    </StyledFab>
                                                </div>
                                            </Box>
                                            <div style={{ height: '800px', overflow: 'scroll', padding: '5px' }}>
                                                <Grid container spacing={2}>
                                                    {documentChunks?.map((row, index) => (
                                                        <Grid item lg={6} md={6} sm={6} xs={6} key={index}>
                                                            <CardWrapper
                                                                content={false}
                                                                onClick={() => onChunkClick(row, index + 1)}
                                                                sx={{
                                                                    border: 1,
                                                                    borderColor: theme.palette.grey[900] + 25,
                                                                    borderRadius: 2
                                                                }}
                                                            >
                                                                <Card>
                                                                    <CardContent sx={{ p: 1 }}>
                                                                        <Typography sx={{ wordWrap: 'break-word', mb: 1 }} variant='h5'>
                                                                            {`#${index + 1}. Characters: ${row.pageContent.length}`}
                                                                        </Typography>
                                                                        <Typography sx={{ wordWrap: 'break-word' }} variant='body2'>
                                                                            {row.pageContent}
                                                                        </Typography>
                                                                        <ReactJson
                                                                            theme={customization.isDarkMode ? 'ocean' : 'rjv-default'}
                                                                            style={{ paddingTop: 10 }}
                                                                            src={row.metadata}
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
                                        </>
                                    )}
                                </Grid>
                            </Grid>
                        </Box>
                    </Stack>
                )}
            </MainCard>
            <ExpandedChunkDialog
                show={showExpandedChunkDialog}
                isReadOnly={true}
                dialogProps={expandedChunkDialogProps}
                onCancel={() => setShowExpandedChunkDialog(false)}
            ></ExpandedChunkDialog>
            {loading && <BackdropLoader open={loading} />}
        </>
    )
}

export default LoaderConfigPreviewChunks
