import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { cloneDeep } from 'lodash'
import { v4 as uuidv4 } from 'uuid'

// material-ui
import { Stack, Grid, Box, Divider, Typography, IconButton } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import Button from '@mui/material/Button'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// API
import documentsApi from '@/api/documentstore'
import nodesApi from '@/api/nodes'

// Hooks
import useApi from '@/hooks/useApi'
import { useNavigate } from 'react-router-dom'
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'

// icons
import ErrorBoundary from '@/ErrorBoundary'
import { IconX, IconEdit } from '@tabler/icons-react'
import Embeddings from '@mui/icons-material/DynamicFeed'
import Storage from '@mui/icons-material/Storage'
import DynamicFeed from '@mui/icons-material/Filter1'

import { initNode } from '@/utils/genericHelper'
import ComponentsListDialog from '@/views/docstore/ComponentsListDialog'
import DocStoreInputHandler from '@/views/docstore/DocStoreInputHandler'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import { baseURL } from '@/store/constant'

// const

const DividerRoot = styled('div')(({ theme }) => ({
    width: '100%',
    ...theme.typography.body2,
    color: theme.palette.text.secondary,
    '& > :not(style) ~ :not(style)': {
        marginTop: theme.spacing(2)
    }
}))

const VectorStoreConfigure = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))
    const { confirm } = useConfirm()

    const getSpecificDocumentStoreApi = useApi(documentsApi.getSpecificDocumentStore)
    const insertIntoVectorStoreApi = useApi(documentsApi.insertIntoVectorStore)
    const saveVectorStoreConfigApi = useApi(documentsApi.saveVectorStoreConfig)
    const getEmbeddingNodeDetailsApi = useApi(nodesApi.getSpecificNode)
    const getVectorStoreNodeDetailsApi = useApi(nodesApi.getSpecificNode)
    const getRecordManagerNodeDetailsApi = useApi(nodesApi.getSpecificNode)

    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)

    const [showDialog, setShowDialog] = useState(false)
    const [documentStore, setDocumentStore] = useState({})
    const [dialogProps, setDialogProps] = useState({})

    const [showEmbeddingsListDialog, setShowEmbeddingsListDialog] = useState(false)
    const [selectedEmbeddingsProvider, setSelectedEmbeddingsProvider] = useState({})

    const [showVectorStoreListDialog, setShowVectorStoreListDialog] = useState(false)
    const [selectedVectorStoreProvider, setSelectedVectorStoreProvider] = useState({})

    const [showRecordManagerListDialog, setShowRecordManagerListDialog] = useState(false)
    const [selectedRecordManagerProvider, setSelectedRecordManagerProvider] = useState({})

    const onEmbeddingsSelected = (component) => {
        const nodeData = cloneDeep(initNode(component, uuidv4()))
        if (!showEmbeddingsListDialog && documentStore.embeddingConfig) {
            nodeData.inputs = documentStore.embeddingConfig.config
            /* TODO set the credential id */
        }
        setSelectedEmbeddingsProvider(nodeData)
        setShowEmbeddingsListDialog(false)
    }

    const showEmbeddingsList = () => {
        const dialogProp = {
            title: 'Select Embeddings Provider'
        }
        setDialogProps(dialogProp)
        setShowEmbeddingsListDialog(true)
    }

    const onVectorStoreSelected = (component) => {
        const nodeData = cloneDeep(initNode(component, uuidv4()))
        if (!showVectorStoreListDialog && documentStore.vectorStoreConfig) {
            nodeData.inputs = documentStore.vectorStoreConfig.config
            /* TODO set the credential id */
            //nodeData.credentialId = documentStore.vectorStoreConfig.credential
        }
        setSelectedVectorStoreProvider(nodeData)
        setShowVectorStoreListDialog(false)
    }

    const showVectorStoreList = () => {
        const dialogProp = {
            title: 'Select a Vector Store Provider'
        }
        setDialogProps(dialogProp)
        setShowVectorStoreListDialog(true)
    }

    const onRecordManagerSelected = (component) => {
        const nodeData = cloneDeep(initNode(component, uuidv4()))
        if (!showRecordManagerListDialog && documentStore.recordManagerConfig) {
            nodeData.inputs = documentStore.recordManagerConfig.config
            /* TODO set the credential id */
            //nodeData.credentialId = documentStore.recordManagerConfig.credential
        }
        setSelectedRecordManagerProvider(nodeData)
        setShowRecordManagerListDialog(false)
    }

    const showRecordManagerList = () => {
        const dialogProp = {
            title: 'Select a Record Manager'
        }
        setDialogProps(dialogProp)
        setShowRecordManagerListDialog(true)
    }

    const checkMandatoryFields = () => {
        let canSubmit = true
        const inputParams = (selectedVectorStoreProvider?.inputParams ?? []).filter((inputParam) => !inputParam.hidden)
        for (const inputParam of inputParams) {
            if (!inputParam.optional && (!selectedVectorStoreProvider.inputs[inputParam.name] || !selectedVectorStoreProvider.credential)) {
                if (inputParam.type === 'credential' && !selectedVectorStoreProvider.credential) {
                    canSubmit = false
                    break
                } else if (inputParam.type !== 'credential' && !selectedVectorStoreProvider.inputs[inputParam.name]) {
                    canSubmit = false
                    break
                }
            }
        }

        const inputParams2 = (selectedEmbeddingsProvider?.inputParams ?? []).filter((inputParam) => !inputParam.hidden)
        for (const inputParam of inputParams2) {
            if (!inputParam.optional && (!selectedEmbeddingsProvider.inputs[inputParam.name] || !selectedEmbeddingsProvider.credential)) {
                if (inputParam.type === 'credential' && !selectedEmbeddingsProvider.credential) {
                    canSubmit = false
                    break
                } else if (inputParam.type !== 'credential' && !selectedEmbeddingsProvider.inputs[inputParam.name]) {
                    canSubmit = false
                    break
                }
            }
        }

        if (!canSubmit) {
            enqueueSnackbar({
                message: 'Please fill in all mandatory fields.',
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

    const prepareConfigData = () => {
        const data = {
            storeId: storeId
        }
        // Set embedding config
        if (selectedEmbeddingsProvider.inputs) {
            data.embeddingConfig = {}
            data.embeddingName = selectedEmbeddingsProvider.name
            Object.keys(selectedEmbeddingsProvider.inputs).map((key) => {
                if (key === 'FLOWISE_CREDENTIAL_ID') {
                    data.embeddingConfig['credential'] = selectedEmbeddingsProvider.inputs[key]
                } else {
                    data.embeddingConfig[key] = selectedEmbeddingsProvider.inputs[key]
                }
            })
        }
        if (selectedVectorStoreProvider.inputs) {
            data.vectorStoreConfig = {}
            data.vectorStoreName = selectedVectorStoreProvider.name
            Object.keys(selectedVectorStoreProvider.inputs).map((key) => {
                if (key === 'FLOWISE_CREDENTIAL_ID') {
                    data.vectorStoreConfig['credential'] = selectedVectorStoreProvider.inputs[key]
                } else {
                    data.vectorStoreConfig[key] = selectedVectorStoreProvider.inputs[key]
                }
            })
        }
        if (selectedRecordManagerProvider.inputs) {
            data.recordManagerConfig = {}
            data.recordManagerName = selectedRecordManagerProvider.name
            Object.keys(selectedRecordManagerProvider.inputs).map((key) => {
                if (key === 'FLOWISE_CREDENTIAL_ID') {
                    data.recordManagerConfig['credential'] = selectedRecordManagerProvider.inputs[key]
                } else {
                    data.recordManagerConfig[key] = selectedRecordManagerProvider.inputs[key]
                }
            })
        }
        return data
    }

    const tryAndInsertIntoStore = () => {
        if (checkMandatoryFields()) {
            setLoading(true)
            const data = prepareConfigData()
            insertIntoVectorStoreApi.request(data)
        }
    }

    const saveVectorStoreConfig = () => {
        setLoading(true)
        const data = prepareConfigData()
        saveVectorStoreConfigApi.request(data)
        setLoading(false)
    }

    useEffect(() => {
        if (saveVectorStoreConfigApi.data) {
            setLoading(false)
            enqueueSnackbar({
                message: 'Configuration Saved Successfully.',
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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveVectorStoreConfigApi.data])

    useEffect(() => {
        if (insertIntoVectorStoreApi.data) {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [insertIntoVectorStoreApi.data])

    useEffect(() => {
        if (insertIntoVectorStoreApi.error) {
            setLoading(false)
            setError(insertIntoVectorStoreApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [insertIntoVectorStoreApi.error])

    useEffect(() => {
        if (saveVectorStoreConfigApi.error) {
            setLoading(false)
            setError(saveVectorStoreConfigApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saveVectorStoreConfigApi.error])

    const URLpath = document.location.pathname.toString().split('/')
    const storeId = URLpath[URLpath.length - 1] === 'document-stores' ? '' : URLpath[URLpath.length - 1]
    useEffect(() => {
        getSpecificDocumentStoreApi.request(storeId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getSpecificDocumentStoreApi.data) {
            const docStore = getSpecificDocumentStoreApi.data
            setDocumentStore(docStore)
            if (docStore.embeddingConfig) {
                getEmbeddingNodeDetailsApi.request(docStore.embeddingConfig.name)
            }
            if (docStore.vectorStoreConfig) {
                getVectorStoreNodeDetailsApi.request(docStore.vectorStoreConfig.name)
            }
            if (docStore.recordManagerConfig) {
                getRecordManagerNodeDetailsApi.request(docStore.recordManagerConfig.name)
            }
            setLoading(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificDocumentStoreApi.data])

    useEffect(() => {
        if (getEmbeddingNodeDetailsApi.data) {
            const node = getEmbeddingNodeDetailsApi.data
            onEmbeddingsSelected(node)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getEmbeddingNodeDetailsApi.data])

    useEffect(() => {
        if (getVectorStoreNodeDetailsApi.data) {
            const node = getVectorStoreNodeDetailsApi.data
            onVectorStoreSelected(node)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getVectorStoreNodeDetailsApi.data])

    useEffect(() => {
        if (getRecordManagerNodeDetailsApi.data) {
            const node = getRecordManagerNodeDetailsApi.data
            onRecordManagerSelected(node)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getRecordManagerNodeDetailsApi.data])

    useEffect(() => {
        if (getSpecificDocumentStoreApi.error) {
            setError(getSpecificDocumentStoreApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificDocumentStoreApi.error])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            isBackButton={true}
                            search={false}
                            title={getSpecificDocumentStoreApi.data?.name}
                            description='Configure your Vector Store and Upsert your data.'
                            onBack={() => navigate(-1)}
                        ></ViewHeader>
                        <Grid container spacing={1} style={{ textAlign: 'center' }}>
                            <Grid item xs={12} sm={4} md={4}>
                                {Object.keys(selectedEmbeddingsProvider).length === 0 ? (
                                    <Button
                                        color='error'
                                        onClick={showEmbeddingsList}
                                        variant='outlined'
                                        fullWidth={true}
                                        startIcon={<Embeddings style={{ height: 32, width: 32 }} />}
                                        style={{ minHeight: '200px' }}
                                    >
                                        Select Embeddings
                                    </Button>
                                ) : (
                                    <Box>
                                        <Grid container spacing='2'>
                                            <Grid item xs={12} md={12} lg={12} sm={12}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        paddingRight: 15
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            flexDirection: 'row',
                                                            p: 1
                                                        }}
                                                    >
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
                                                            {selectedEmbeddingsProvider.label ? (
                                                                <img
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        padding: 7,
                                                                        borderRadius: '50%',
                                                                        objectFit: 'contain'
                                                                    }}
                                                                    alt={selectedEmbeddingsProvider.label ?? 'embeddings'}
                                                                    src={`${baseURL}/api/v1/node-icon/${selectedEmbeddingsProvider?.name}`}
                                                                />
                                                            ) : (
                                                                <Embeddings color='black' />
                                                            )}
                                                        </div>
                                                        <Typography sx={{ ml: 2 }} variant='h3'>
                                                            {selectedEmbeddingsProvider.label}
                                                        </Typography>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignContent: 'center',
                                                                flexDirection: 'row'
                                                            }}
                                                        >
                                                            {Object.keys(selectedEmbeddingsProvider).length > 0 && (
                                                                <IconButton variant='outlined' sx={{ ml: 4 }} onClick={showEmbeddingsList}>
                                                                    <IconEdit />
                                                                </IconButton>
                                                            )}
                                                        </div>
                                                    </Box>
                                                    {selectedEmbeddingsProvider &&
                                                        Object.keys(selectedEmbeddingsProvider).length > 0 &&
                                                        (selectedEmbeddingsProvider.inputParams ?? [])
                                                            .filter((inputParam) => !inputParam.hidden)
                                                            .map((inputParam, index) => (
                                                                <DocStoreInputHandler
                                                                    key={index}
                                                                    data={selectedEmbeddingsProvider}
                                                                    inputParam={inputParam}
                                                                    isAdditionalParams={inputParam.additionalParams}
                                                                />
                                                            ))}
                                                </div>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}
                            </Grid>
                            <Grid item xs={12} sm={4} md={4}>
                                {Object.keys(selectedVectorStoreProvider).length === 0 ? (
                                    <Button
                                        color='error'
                                        variant='outlined'
                                        onClick={showVectorStoreList}
                                        fullWidth={true}
                                        startIcon={<Storage style={{ height: 32, width: 32 }} />}
                                        style={{ minHeight: '200px' }}
                                    >
                                        Select Vector Store
                                    </Button>
                                ) : (
                                    <Box>
                                        <Grid container spacing='2'>
                                            <Grid item xs={12} md={12} lg={12} sm={12}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        paddingRight: 15
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            flexDirection: 'row',
                                                            p: 1
                                                        }}
                                                    >
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
                                                            {selectedVectorStoreProvider.label ? (
                                                                <img
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        padding: 7,
                                                                        borderRadius: '50%',
                                                                        objectFit: 'contain'
                                                                    }}
                                                                    alt={selectedVectorStoreProvider.label ?? 'embeddings'}
                                                                    src={`${baseURL}/api/v1/node-icon/${selectedVectorStoreProvider?.name}`}
                                                                />
                                                            ) : (
                                                                <Embeddings color='black' />
                                                            )}
                                                        </div>
                                                        <Typography sx={{ ml: 2 }} variant='h3'>
                                                            {selectedVectorStoreProvider.label}
                                                        </Typography>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignContent: 'center',
                                                                flexDirection: 'row'
                                                            }}
                                                        >
                                                            {Object.keys(selectedVectorStoreProvider).length > 0 && (
                                                                <IconButton variant='outlined' sx={{ ml: 4 }} onClick={showVectorStoreList}>
                                                                    <IconEdit />
                                                                </IconButton>
                                                            )}
                                                        </div>
                                                    </Box>
                                                    {selectedVectorStoreProvider &&
                                                        Object.keys(selectedVectorStoreProvider).length > 0 &&
                                                        (selectedVectorStoreProvider.inputParams ?? [])
                                                            .filter((inputParam) => !inputParam.hidden)
                                                            .map((inputParam, index) => (
                                                                <DocStoreInputHandler
                                                                    key={index}
                                                                    data={selectedVectorStoreProvider}
                                                                    inputParam={inputParam}
                                                                    isAdditionalParams={inputParam.additionalParams}
                                                                />
                                                            ))}
                                                </div>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}
                            </Grid>
                            <Grid item xs={12} sm={4} md={4}>
                                {Object.keys(selectedRecordManagerProvider).length === 0 ? (
                                    <Button
                                        color='error'
                                        variant='outlined'
                                        onClick={showRecordManagerList}
                                        fullWidth={true}
                                        startIcon={<DynamicFeed style={{ height: 32, width: 32 }} />}
                                        style={{ minHeight: '200px' }}
                                    >
                                        Select Record Manager
                                    </Button>
                                ) : (
                                    <Box>
                                        <Grid container spacing='2'>
                                            <Grid item xs={12} md={12} lg={12} sm={12}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        paddingRight: 15
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            flexDirection: 'row',
                                                            p: 1
                                                        }}
                                                    >
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
                                                            {selectedRecordManagerProvider.label ? (
                                                                <img
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        padding: 7,
                                                                        borderRadius: '50%',
                                                                        objectFit: 'contain'
                                                                    }}
                                                                    alt={selectedRecordManagerProvider.label ?? 'embeddings'}
                                                                    src={`${baseURL}/api/v1/node-icon/${selectedRecordManagerProvider?.name}`}
                                                                />
                                                            ) : (
                                                                <Embeddings color='black' />
                                                            )}
                                                        </div>
                                                        <Typography sx={{ ml: 2 }} variant='h3'>
                                                            {selectedRecordManagerProvider.label}
                                                        </Typography>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignContent: 'center',
                                                                flexDirection: 'row'
                                                            }}
                                                        >
                                                            {Object.keys(selectedRecordManagerProvider).length > 0 && (
                                                                <IconButton
                                                                    variant='outlined'
                                                                    sx={{ ml: 4 }}
                                                                    onClick={showRecordManagerList}
                                                                >
                                                                    <IconEdit />
                                                                </IconButton>
                                                            )}
                                                        </div>
                                                    </Box>
                                                    {selectedRecordManagerProvider &&
                                                        Object.keys(selectedRecordManagerProvider).length > 0 &&
                                                        (selectedRecordManagerProvider.inputParams ?? [])
                                                            .filter((inputParam) => !inputParam.hidden)
                                                            .map((inputParam, index) => (
                                                                <>
                                                                    <DocStoreInputHandler
                                                                        key={index}
                                                                        data={selectedRecordManagerProvider}
                                                                        inputParam={inputParam}
                                                                        isAdditionalParams={inputParam.additionalParams}
                                                                    />
                                                                </>
                                                            ))}
                                                </div>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}
                            </Grid>
                            <Grid item xs={12} sm={12} md={12}>
                                <Divider />
                            </Grid>
                            {/*<Grid item xs={8} sm={8} md={8} style={{ textAlign: 'left' }}>*/}
                            {/*    {Object.keys(selectedEmbeddingsProvider).length > 0 && (*/}
                            {/*        <Button variant='outlined' sx={{ mr: 2 }} onClick={showEmbeddingsList}>*/}
                            {/*            Change Embeddings*/}
                            {/*        </Button>*/}
                            {/*    )}*/}
                            {/*    {Object.keys(selectedVectorStoreProvider).length > 0 && (*/}
                            {/*        <Button variant='outlined' sx={{ mr: 2 }} onClick={showVectorStoreList}>*/}
                            {/*            Change Vector Store*/}
                            {/*        </Button>*/}
                            {/*    )}*/}
                            {/*    {Object.keys(selectedRecordManagerProvider).length > 0 && (*/}
                            {/*        <Button variant='outlined' sx={{ mr: 2 }} onClick={showRecordManagerList}>*/}
                            {/*            Change Record Manager*/}
                            {/*        </Button>*/}
                            {/*    )}*/}
                            {/*</Grid>*/}
                            <Grid item xs={12} sm={12} md={12} style={{ textAlign: 'right' }}>
                                {(Object.keys(selectedEmbeddingsProvider).length > 0 ||
                                    Object.keys(selectedVectorStoreProvider).length > 0) && (
                                    <Button color='primary' variant='contained' sx={{ mr: 2 }} onClick={() => saveVectorStoreConfig()}>
                                        Save Configuration
                                    </Button>
                                )}
                                <Button color='primary' variant='contained' onClick={() => tryAndInsertIntoStore()}>
                                    Save & Upsert
                                </Button>
                            </Grid>
                        </Grid>
                    </Stack>
                )}
            </MainCard>

            {showEmbeddingsListDialog && (
                <ComponentsListDialog
                    show={showEmbeddingsListDialog}
                    dialogProps={dialogProps}
                    onCancel={() => setShowEmbeddingsListDialog(false)}
                    apiCall={documentsApi.getEmbeddingProviders}
                    onSelected={onEmbeddingsSelected}
                />
            )}
            {showVectorStoreListDialog && (
                <ComponentsListDialog
                    show={showVectorStoreListDialog}
                    dialogProps={dialogProps}
                    onCancel={() => setShowVectorStoreListDialog(false)}
                    apiCall={documentsApi.getVectorStoreProviders}
                    onSelected={onVectorStoreSelected}
                />
            )}
            {showRecordManagerListDialog && (
                <ComponentsListDialog
                    show={showRecordManagerListDialog}
                    dialogProps={dialogProps}
                    onCancel={() => setShowRecordManagerListDialog(false)}
                    apiCall={documentsApi.getRecordManagerProviders}
                    onSelected={onRecordManagerSelected}
                />
            )}
            <ConfirmDialog />
            {loading && <BackdropLoader open={loading} />}
        </>
    )
}

export default VectorStoreConfigure
