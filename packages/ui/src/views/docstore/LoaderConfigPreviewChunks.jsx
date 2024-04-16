import { styled, useTheme } from '@mui/material/styles'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import useNotifier from '@/utils/useNotifier'

// Hooks
import useApi from '@/hooks/useApi'

// Material-UI
import { Box, Button, Card, CardContent, Divider, Grid, OutlinedInput, Stack, Typography } from '@mui/material'
import { IconAlertTriangle, IconArrowBack, IconDatabaseImport, IconListSearch, IconX, IconZoomReplace } from '@tabler/icons'

// Project
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import { useEffect, useState } from 'react'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import InputHandler from '@/views/docstore/InputHandler'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// API
import nodesApi from '@/api/nodes'
import documentStoreApi from '@/api/documentstore'

import { validate as uuidValidate } from 'uuid'
import documentsApi from '@/api/documentstore'
import ErrorBoundary from '@/ErrorBoundary'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ManageScrapedLinksDialog from '@/ui-component/dialog/ManageScrapedLinksDialog'

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
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()

    const getNodeDetailsApi = useApi(nodesApi.getSpecificNode)
    const getNodesByCategoryApi = useApi(nodesApi.getNodesByCategory)
    const previewChunksApi = useApi(documentStoreApi.previewChunks)
    const processChunksApi = useApi(documentStoreApi.processChunks)
    const getSpecificDocumentStoreApi = useApi(documentsApi.getSpecificDocumentStore)

    const URLpath = document.location.pathname.toString().split('/')
    const nodeName = URLpath[URLpath.length - 1] === 'document-stores' ? '' : URLpath[URLpath.length - 1]
    const storeId = URLpath[URLpath.length - 2] === 'document-stores' ? '' : URLpath[URLpath.length - 2]

    const [nodeData, setNodeData] = useState({})
    const [instanceData, setInstanceData] = useState({})
    const [credential, setCredential] = useState(false)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const [textSplitterNodes, setTextSplitterNodes] = useState({})
    const [textSplitterMandatory, setTextSplitterMandatory] = useState(false)
    const [splitterOptions, setSplitterOptions] = useState([])
    const [selectedTextSplitter, setSelectedTextSplitter] = useState()
    const [textSplitterInputs, setTextSplitterInputs] = useState([])
    const [textSplitterData, setTextSplitterData] = useState({})

    const [documentChunks, setDocumentChunks] = useState([])
    const [totalChunks, setTotalChunks] = useState(0)
    const [previewWarning, setPreviewWarning] = useState(null)

    const [currentPreviewCount, setCurrentPreviewCount] = useState(0)
    const [previewChunkCount, setPreviewChunkCount] = useState(20)
    const [editingLoader, setEditingLoader] = useState()

    const dispatch = useDispatch()
    const [showManageScrapedLinksDialog, setShowManageScrapedLinksDialog] = useState(false)
    const [manageScrapedLinksDialogProps, setManageScrapedLinksDialogProps] = useState({})
    const [manageLinksBtn, setManageLinksBtn] = useState(false)

    // ==============================|| Snackbar ||============================== //
    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const openDS = (storeId) => {
        navigate('/document-stores/' + storeId)
    }

    const onManageLinksDialogClicked = (url, selectedLinks, relativeLinksMethod, limit) => {
        const dialogProps = {
            url,
            relativeLinksMethod,
            limit,
            selectedLinks,
            confirmButtonName: 'Save',
            cancelButtonName: 'Cancel'
        }
        setManageScrapedLinksDialogProps(dialogProps)
        setShowManageScrapedLinksDialog(true)
    }

    const onManageLinksDialogSave = (url, links) => {
        setShowManageScrapedLinksDialog(false)
        instanceData.inputs['url'] = url
        instanceData.inputs['selectedLinks'] = links
    }

    const onSplitterChange = (name, preload = false) => {
        if (preload && editingLoader) {
            setSelectedTextSplitter(editingLoader.splitterId)
        }
        setSelectedTextSplitter(name)
        if (textSplitterNodes) {
            const textSplitter = textSplitterNodes.find((splitter) => splitter.name === name)
            setTextSplitterInputs(textSplitter.inputs)
            const iData = { id: 'textSplitter_0', inputs: [] }
            textSplitter.inputs.map((input) => {
                if (preload && editingLoader.splitterConfig[input.name]) iData.inputs[input.name] = editingLoader.splitterConfig[input.name]
                else if (input.default) iData.inputs[input.name] = input.default
            })
            setTextSplitterData(iData)
        }
    }

    const checkMandatoryFields = () => {
        let canSubmit = true
        nodeData.inputs
            .filter((inputParam) => !inputParam.hidden)
            .map((inputParam) => {
                if (!inputParam.optional) {
                    if (!instanceData.inputs[inputParam.name]) {
                        canSubmit = false
                        enqueueSnackbar({
                            message: 'Please fill in all mandatory fields.',
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
            })
        return canSubmit
    }

    const onPreviewChunks = () => {
        if (checkMandatoryFields()) {
            setLoading(true)
            const config = prepareConfig()
            config.previewChunkCount = previewChunkCount
            try {
                previewChunksApi.request(config)
            } catch (error) {
                setLoading(false)
                setError(error)
                enqueueSnackbar({
                    message: 'Error invoking Preview Chunks API. Please try again.',
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

    const onSaveAndProcess = () => {
        if (checkMandatoryFields()) {
            setLoading(true)
            const config = prepareConfig()
            try {
                processChunksApi.request(config)
            } catch (error) {
                setLoading(false)
                enqueueSnackbar({
                    message: 'Error invoking Process Chunks API. Please try again.',
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
        if (editingLoader) {
            config.loaderId = editingLoader.loaderId
            config.id = editingLoader.id
        } else {
            config.loaderId = nodeName
        }
        config.loaderConfig = {}
        Object.keys(instanceData.inputs).map((key) => {
            config.loaderConfig[key] = instanceData.inputs[key]
        })
        config.loaderName = nodeData?.label
        if (selectedTextSplitter) config.splitterId = selectedTextSplitter
        config.splitterConfig = {}
        if (textSplitterData && textSplitterData.inputs) {
            Object.keys(textSplitterData.inputs).map((key) => {
                config.splitterConfig[key] = textSplitterData.inputs[key]
            })
            const textSplitter = textSplitterNodes.find((splitter) => splitter.name === selectedTextSplitter)
            config.splitterName = textSplitter.label
        }
        if (credential) {
            config.credential = credential
        }
        config.storeId = storeId
        return config
    }

    useEffect(() => {
        if (previewChunksApi.data) {
            setTotalChunks(previewChunksApi.data.totalChunks)
            setDocumentChunks(previewChunksApi.data.chunks)
            setCurrentPreviewCount(previewChunksApi.data.previewChunkCount)
            setLoading(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewChunksApi.data])

    useEffect(() => {
        if (processChunksApi.data) {
            setLoading(false)
            enqueueSnackbar({
                message: 'File submitted for processing. Redirected to Document Store.',
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
            navigate('/document-stores/' + storeId)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processChunksApi.data])

    useEffect(() => {
        if (loading && processChunksApi.error) {
            setError(processChunksApi.error)
            setLoading(false)
            enqueueSnackbar({
                message: 'Error invoking Process Chunks API. Please try again.',
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processChunksApi.error])

    useEffect(() => {
        if (uuidValidate(nodeName)) {
            // this is a document store edit config
            getSpecificDocumentStoreApi.request(storeId)
        } else {
            getNodeDetailsApi.request(nodeName)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getNodeDetailsApi.data) {
            setTextSplitterNodes(undefined)
            // check and extract the textSplitter from the inputs array
            const textSplitter = getNodeDetailsApi.data.inputs.find((input) => input.name === 'textSplitter')
            let data = getNodeDetailsApi.data
            if (textSplitter) {
                //remove the textSplitter from the inputs array
                data.inputs = getNodeDetailsApi.data.inputs.filter((input) => input.name !== 'textSplitter')
                getNodesByCategoryApi.request('Text Splitters')
                setTextSplitterMandatory(!textSplitter.optional)
            }
            setNodeData(data)
            let loaderNodeId = nodeName
            if (editingLoader) {
                const iData = { id: storeId, inputs: [] }
                data.inputs.map((input) => {
                    if (editingLoader.loaderConfig[input.name]) iData.inputs[input.name] = editingLoader.loaderConfig[input.name]
                    else if (input.default) iData.inputs[input.name] = input.default
                })
                if (editingLoader.credential) {
                    setCredential(editingLoader.credential)
                    iData.credential = editingLoader.credential
                }
                setInstanceData(iData)
                loaderNodeId = editingLoader.loaderId
            } else {
                const iData = { id: storeId, inputs: [] }
                data.inputs.map((input) => {
                    if (input.default) iData.inputs[input.name] = input.default
                })
                setInstanceData(iData)
            }
            if (loaderNodeId === 'cheerioWebScraper' || loaderNodeId === 'puppeteerWebScraper' || loaderNodeId === 'playwrightWebScraper') {
                setPreviewWarning('In Preview Mode, Only the first 3 links will be scraped.')
                setManageLinksBtn(true)
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getNodeDetailsApi.data])

    useEffect(() => {
        if (getNodesByCategoryApi.data) {
            setTextSplitterNodes(getNodesByCategoryApi.data)
            const options = getNodesByCategoryApi.data.map((splitter) => ({
                label: splitter.label,
                name: splitter.name
            }))
            setTimeout(() => {
                setSplitterOptions(options)
                if (editingLoader) {
                    onSplitterChange(editingLoader.splitterId, true)
                } else {
                    onSplitterChange('recursiveCharacterTextSplitter')
                }
            }, 250)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getNodesByCategoryApi.data])

    useEffect(() => {
        if (getSpecificDocumentStoreApi.data) {
            if (getSpecificDocumentStoreApi.data?.loaders.length > 0) {
                const loader = getSpecificDocumentStoreApi.data.loaders.find((loader) => loader.id === nodeName)
                if (loader) {
                    setEditingLoader(loader)
                    getNodeDetailsApi.request(loader.loaderId)
                }
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificDocumentStoreApi.data])

    useEffect(() => {
        if (getSpecificDocumentStoreApi.error) {
            setError(getSpecificDocumentStoreApi.error)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificDocumentStoreApi.error])

    useEffect(() => {
        if (getNodeDetailsApi.error) {
            setError(getNodeDetailsApi.error)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getNodeDetailsApi.error])

    useEffect(() => {
        if (getNodesByCategoryApi.error) {
            setError(getNodesByCategoryApi.error)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getNodesByCategoryApi.error])

    useEffect(() => {
        if (previewChunksApi.error) {
            setError(previewChunksApi.error)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewChunksApi.error])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader search={false} title={nodeData?.label}>
                            <StyledButton
                                variant='contained'
                                sx={{ color: 'white' }}
                                startIcon={<IconArrowBack />}
                                onClick={() => openDS(storeId)}
                            >
                                Back to Document Store
                            </StyledButton>
                        </ViewHeader>
                        {/*<div>*/}
                        {/*    <h3>{nodeData?.description}</h3>*/}
                        {/*</div>*/}
                        {loading && <BackdropLoader open={loading} />}
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
                                        {nodeData && nodeData.credential && (
                                            <Box sx={{ p: 1 }}>
                                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                    <Typography>
                                                        {nodeData.credential.label}
                                                        {!nodeData.credential.optional && <span style={{ color: 'red' }}>&nbsp;*</span>}
                                                        {nodeData.credential.description && (
                                                            <TooltipWithParser
                                                                style={{ marginLeft: 10 }}
                                                                title={nodeData.credential.description}
                                                            />
                                                        )}
                                                    </Typography>
                                                    <div style={{ flexGrow: 1 }}></div>
                                                </div>
                                                <CredentialInputHandler
                                                    key={credential}
                                                    data={instanceData}
                                                    inputParam={nodeData.credential}
                                                    onSelect={(newValue) => setCredential(newValue)}
                                                />
                                            </Box>
                                        )}
                                        {nodeData &&
                                            nodeData.inputs &&
                                            nodeData.inputs
                                                .filter((inputParam) => !inputParam.hidden)
                                                .map((inputParam, index) => (
                                                    <>
                                                        <InputHandler
                                                            key={index}
                                                            data={instanceData}
                                                            inputParam={inputParam}
                                                            isAdditionalParams={inputParam.additionalParams}
                                                        />
                                                        {manageLinksBtn && inputParam.name === 'url' && (
                                                            <Box sx={{ p: 1, textAlign: 'center' }}>
                                                                <Button
                                                                    variant='outlined'
                                                                    onClick={() =>
                                                                        onManageLinksDialogClicked(
                                                                            instanceData.inputs['url'] ?? inputParam.default ?? '',
                                                                            instanceData.inputs.selectedLinks,
                                                                            instanceData.inputs['relativeLinksMethod'] ?? 'webCrawl',
                                                                            parseInt(instanceData.inputs['limit']) ?? 0
                                                                        )
                                                                    }
                                                                    startIcon={<IconListSearch />}
                                                                >
                                                                    Manage Links
                                                                </Button>{' '}
                                                            </Box>
                                                        )}
                                                    </>
                                                ))}
                                        {textSplitterNodes && Object.keys(textSplitterNodes).length > 0 && (
                                            <Box sx={{ p: 1 }}>
                                                <Divider textAlign='center'>
                                                    Text Splitter{' '}
                                                    <Typography>
                                                        {textSplitterMandatory && <span style={{ color: 'red' }}>&nbsp;*</span>}
                                                    </Typography>
                                                </Divider>
                                                <Dropdown
                                                    key={selectedTextSplitter}
                                                    name='textSplitter'
                                                    options={splitterOptions}
                                                    onSelect={(newValue) => onSplitterChange(newValue)}
                                                    value={selectedTextSplitter ?? 'choose an option'}
                                                />
                                            </Box>
                                        )}
                                        {textSplitterNodes &&
                                            selectedTextSplitter &&
                                            textSplitterInputs.map((inputParam, index) => (
                                                <InputHandler
                                                    key={index}
                                                    data={textSplitterData}
                                                    inputParam={inputParam}
                                                    isAdditionalParams={inputParam.additionalParams}
                                                />
                                            ))}
                                        <Box sx={{ p: 1 }}>
                                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                <Typography>
                                                    Show Chunks in Preview<span style={{ color: 'red' }}>&nbsp;*</span>
                                                </Typography>
                                                <div style={{ flexGrow: 1 }}></div>
                                            </div>
                                            <OutlinedInput
                                                size='small'
                                                multiline={false}
                                                sx={{ mt: 1 }}
                                                type='number'
                                                fullWidth
                                                key='previewChunkCount'
                                                onChange={(e) => setPreviewChunkCount(e.target.value)}
                                                value={previewChunkCount ?? 25}
                                            />
                                        </Box>
                                    </div>
                                </Grid>
                                <Grid item xs={8} md={6} lg={6} sm={8}>
                                    <Typography style={{ marginBottom: 5, wordWrap: 'break-word', textAlign: 'left' }} variant='h4'>
                                        Preview: Showing {currentPreviewCount} of {totalChunks} Chunks.
                                    </Typography>
                                    {previewWarning && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                borderRadius: 10,
                                                background: 'rgb(254,252,191)',
                                                padding: 10,
                                                marginTop: 10,
                                                marginBottom: 10
                                            }}
                                        >
                                            <IconAlertTriangle size={20} color='orange' />
                                            <span
                                                style={{
                                                    color: 'rgb(116,66,16)',
                                                    marginLeft: 10
                                                }}
                                            >
                                                {previewWarning}
                                            </span>
                                        </div>
                                    )}
                                    <div style={{ height: '800px', overflow: 'scroll', padding: '5px' }}>
                                        <Grid container spacing={2}>
                                            {documentChunks &&
                                                documentChunks?.map((row, index) => (
                                                    <Grid item lg={6} md={6} sm={6} xs={6} key={index}>
                                                        <CardWrapper>
                                                            <Card style={{ padding: 0 }}>
                                                                <CardContent style={{ padding: 0 }}>
                                                                    <Typography color='textSecondary' gutterBottom>
                                                                        {`#${index + 1}. Characters: ${row.pageContent.length}`}
                                                                    </Typography>
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
                            </Grid>
                        </Box>
                        <Box sx={{ p: 1, textAlign: 'center' }}>
                            <StyledButton
                                variant='contained'
                                sx={{ color: 'white' }}
                                onClick={onSaveAndProcess}
                                startIcon={<IconDatabaseImport />}
                            >
                                Process & Save
                            </StyledButton>{' '}
                            <StyledButton
                                variant='contained'
                                sx={{ color: 'white' }}
                                onClick={onPreviewChunks}
                                startIcon={<IconZoomReplace />}
                            >
                                Preview
                            </StyledButton>
                        </Box>
                    </Stack>
                )}
            </MainCard>
            {/* Manage Scraped Links Dialog */}
            {manageLinksBtn && (
                <ManageScrapedLinksDialog
                    show={showManageScrapedLinksDialog}
                    dialogProps={manageScrapedLinksDialogProps}
                    onCancel={() => setShowManageScrapedLinksDialog(false)}
                    onSave={onManageLinksDialogSave}
                />
            )}
        </>
    )
}

export default LoaderConfigPreviewChunks
