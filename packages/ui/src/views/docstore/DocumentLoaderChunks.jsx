import { styled, useTheme } from '@mui/material/styles'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import useNotifier from '@/utils/useNotifier'

// Hooks
import useApi from '@/hooks/useApi'

// Material-UI
import { Box, Button, Card, CardContent, Divider, Grid, Stack, Typography } from '@mui/material'
import { IconArrowBack, IconX } from '@tabler/icons'

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
const DocumentLoaderChunks = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()

    const getNodeDetailsApi = useApi(nodesApi.getSpecificNode)
    const getNodesByCategoryApi = useApi(nodesApi.getNodesByCategory)
    const previewChunksApi = useApi(documentStoreApi.previewChunksWithLoader)

    const URLpath = document.location.pathname.toString().split('/')
    const nodeName = URLpath[URLpath.length - 1] === 'document-stores' ? '' : URLpath[URLpath.length - 1]
    const storeId = URLpath[URLpath.length - 2] === 'document-stores' ? '' : URLpath[URLpath.length - 2]

    const [nodeData, setNodeData] = useState({})
    const [instanceData, setInstanceData] = useState({})
    const [credential, setCredential] = useState(false)

    const [loading, setLoading] = useState(false)

    const [textSplitterNodes, setTextSplitterNodes] = useState({})
    const [textSplitterMandatory, setTextSplitterMandatory] = useState(false)
    const [splitterOptions, setSplitterOptions] = useState([])
    const [selectedTextSplitter, setSelectedTextSplitter] = useState()
    const [textSplitterInputs, setTextSplitterInputs] = useState([])
    const [textSplitterData, setTextSplitterData] = useState({})

    const [documentChunks, setDocumentChunks] = useState([])
    const [totalChunks, setTotalChunks] = useState(0)

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //
    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const openDS = (storeId) => {
        navigate('/document-stores/' + storeId)
    }

    const onSplitterChange = (name) => {
        setSelectedTextSplitter(name)
        if (textSplitterNodes) {
            const textSplitter = textSplitterNodes.find((splitter) => splitter.name === name)
            setTextSplitterInputs(textSplitter.inputs)
            const iData = { id: 'textSplitter_0', inputs: [] }
            textSplitter.inputs.map((input) => {
                if (input.default) iData.inputs[input.name] = input.default
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
            const config = {
                loaderName: nodeName
            }
            config.loaderConfig = {}
            Object.keys(instanceData.inputs).map((key) => {
                config.loaderConfig[key] = instanceData.inputs[key]
            })
            if (selectedTextSplitter) config.splitterName = selectedTextSplitter
            config.splitterConfig = {}
            if (textSplitterData) {
                Object.keys(textSplitterData.inputs).map((key) => {
                    config.splitterConfig[key] = textSplitterData.inputs[key]
                })
            }
            try {
                previewChunksApi.request(config)
            } catch (error) {
                console.error(error)
            }
        }
    }

    useEffect(() => {
        if (previewChunksApi.data) {
            setTotalChunks(previewChunksApi.data.length)
            setDocumentChunks(previewChunksApi.data)
            // setCurrentPreviewCount(previewApi.data.previewChunkCount)
            setLoading(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewChunksApi.data])

    useEffect(() => {
        getNodeDetailsApi.request(nodeName)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getNodeDetailsApi.data) {
            console.log(getNodeDetailsApi.data)
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
            const iData = { id: storeId, inputs: [] }
            data.inputs.map((input) => {
                if (input.default) iData.inputs[input.name] = input.default
            })
            setInstanceData(iData)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getNodeDetailsApi.data])

    useEffect(() => {
        if (getNodesByCategoryApi.data) {
            console.log(getNodesByCategoryApi.data)
            setTextSplitterNodes(getNodesByCategoryApi.data)
            const options = getNodesByCategoryApi.data.map((splitter) => ({
                label: splitter.label,
                name: splitter.name
            }))

            setSplitterOptions(options)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getNodesByCategoryApi.data])

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <Grid container direction='row'>
                        <div>
                            <h1>{nodeData?.label}</h1>
                            <h3>{nodeData?.description}</h3>
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
                                                    <TooltipWithParser style={{ marginLeft: 10 }} title={nodeData.credential.description} />
                                                )}
                                            </Typography>
                                            <div style={{ flexGrow: 1 }}></div>
                                        </div>
                                        <CredentialInputHandler
                                            key={credential}
                                            data={instanceData}
                                            inputParam={nodeData.credential}
                                            onSelect={(newValue) => (instanceData.credential = newValue)}
                                        />
                                    </Box>
                                )}
                                {nodeData &&
                                    nodeData.inputs &&
                                    nodeData.inputs
                                        .filter((inputParam) => !inputParam.hidden)
                                        .map((inputParam, index) => (
                                            <InputHandler
                                                key={index}
                                                data={instanceData}
                                                inputParam={inputParam}
                                                isAdditionalParams={inputParam.additionalParams}
                                            />
                                        ))}
                                {textSplitterNodes && (
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
                                <Box sx={{ p: 1, textAlign: 'center' }}>
                                    <StyledButton
                                        variant='contained'
                                        sx={{ color: 'white' }}
                                        onClick={() => console.log(instanceData, textSplitterData)}
                                    >
                                        Confirm & Process
                                    </StyledButton>{' '}
                                    <StyledButton variant='contained' sx={{ color: 'white' }} onClick={onPreviewChunks}>
                                        Preview
                                    </StyledButton>
                                </Box>
                            </div>
                        </Grid>
                        <Grid item xs={8} md={6} lg={6} sm={8}>
                            <Typography style={{ marginBottom: 5, wordWrap: 'break-word', textAlign: 'left' }} variant='h4'>
                                Preview: Showing {totalChunks} Chunks.
                            </Typography>
                            <div style={{ height: '800px', overflow: 'scroll' }}>
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
            </MainCard>
        </>
    )
}

export default DocumentLoaderChunks
