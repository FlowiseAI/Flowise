import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { cloneDeep } from 'lodash'
import { v4 as uuidv4 } from 'uuid'

// material-ui
import { Stack, Grid, Box, Typography, Divider, Chip } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import Button from '@mui/material/Button'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// API
import documentsApi from '@/api/documentstore'

// Hooks
import useApi from '@/hooks/useApi'
import { useNavigate } from 'react-router-dom'
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'

// icons
import ErrorBoundary from '@/ErrorBoundary'
import { IconX } from '@tabler/icons-react'
import Embeddings from '@mui/icons-material/DynamicFeed'
import Storage from '@mui/icons-material/Storage'
import DynamicFeed from '@mui/icons-material/Filter1'

import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { initNode } from '@/utils/genericHelper'
import ComponentsListDialog from '@/views/docstore/ComponentsListDialog'
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import DocStoreInputHandler from '@/views/docstore/DocStoreInputHandler'
import ViewHeader from '@/layout/MainLayout/ViewHeader'

const DividerRoot = styled('div')(({ theme }) => ({
    width: '100%',
    ...theme.typography.body2,
    color: theme.palette.text.secondary,
    '& > :not(style) ~ :not(style)': {
        marginTop: theme.spacing(2)
    }
}))

const ConfigureVectorStore = () => {
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

    const [error, setError] = useState(null)
    const [isLoading, setLoading] = useState(true)

    const [showDialog, setShowDialog] = useState(false)
    const [documentStore, setDocumentStore] = useState({})
    const [dialogProps, setDialogProps] = useState({})

    const [showEmbeddingsListDialog, setShowEmbeddingsListDialog] = useState(false)
    const [selectedEmbeddingsProvider, setSelectedEmbeddingsProvider] = useState({})
    //const [embeddingInstanceData, setEmbeddingInstanceData] = useState({})
    //const [embeddingCredential, setEmbeddingCredential] = useState(false)

    const [showVectorStoreListDialog, setShowVectorStoreListDialog] = useState(false)
    const [selectedVectorStoreProvider, setSelectedVectorStoreProvider] = useState({})
    const [vectorStoreInstanceData, setVectorStoreInstanceData] = useState({})
    const [vectorStoreCredential, setVectorStoreCredential] = useState(false)

    const [showRecordManagerListDialog, setShowRecordManagerListDialog] = useState(false)
    const [selectedRecordManagerProvider, setSelectedRecordManagerProvider] = useState({})
    const [recordManagerInstanceData, setRecordManagerInstanceData] = useState({})
    const [recordManagerCredential, setRecordManagerCredential] = useState(false)

    const onEmbeddingsSelected = (component) => {
        const nodeData = cloneDeep(initNode(component, uuidv4()))
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
        setSelectedVectorStoreProvider(component)
        const nodeData = cloneDeep(initNode(component, uuidv4()))
        //setVectorStoreInstanceData(nodeData)
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
        setSelectedRecordManagerProvider(component)
        const nodeData = cloneDeep(initNode(component, uuidv4()))
        setRecordManagerInstanceData(nodeData)
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

    const tryAndInsertIntoStore = () => {
        if (checkMandatoryFields()) {
            const data = {
                embeddingConfig: selectedEmbeddingsProvider,
                vectorStoreConfig: vectorStoreInstanceData,
                vectorStoreName: selectedVectorStoreProvider.name,
                storeId: storeId
            }
            // Set embedding config
            if (selectedEmbeddingsProvider.inputs) {
                data.embeddingConfig = {}
                data.embeddingName = selectedEmbeddingsProvider.name
                Object.keys(selectedEmbeddingsProvider.inputs).map((key) => {
                    data.embeddingConfig[key] = selectedEmbeddingsProvider.inputs[key]
                })
            }
            // if (embeddingCredential) {
            //     data.embeddingCredential = embeddingCredential
            // }
            if (vectorStoreCredential) {
                data.vectorStoreCredential = vectorStoreCredential
            }
            insertIntoVectorStoreApi.request(data)
        }
    }

    const URLpath = document.location.pathname.toString().split('/')
    const storeId = URLpath[URLpath.length - 1] === 'document-stores' ? '' : URLpath[URLpath.length - 1]
    useEffect(() => {
        getSpecificDocumentStoreApi.request(storeId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getSpecificDocumentStoreApi.data) {
            setDocumentStore(getSpecificDocumentStoreApi.data)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificDocumentStoreApi.data])

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
                            description='Configure your Vector Store'
                            onBack={() => navigate(-1)}
                        ></ViewHeader>
                    </Stack>
                )}
            </MainCard>
            {/*<Typography variant='h3' sx={{ m: 3 }} align='center' style={{ color: 'darkred' }}>*/}
            {/*    Configure your Vector Store*/}
            {/*</Typography>*/}
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
                                        <Box sx={{ p: 1 }}>
                                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                <DividerRoot>
                                                    <Divider>
                                                        <Chip color='warning' label={selectedEmbeddingsProvider.label} size='small' />
                                                    </Divider>
                                                </DividerRoot>
                                            </div>
                                        </Box>
                                        {/*{selectedEmbeddingsProvider && selectedEmbeddingsProvider.credential && (*/}
                                        {/*    <Box sx={{ p: 1 }}>*/}
                                        {/*        <div style={{ display: 'flex', flexDirection: 'row' }}>*/}
                                        {/*            <Typography>*/}
                                        {/*                {selectedEmbeddingsProvider.credential.label}*/}
                                        {/*                {!selectedEmbeddingsProvider.credential.optional && (*/}
                                        {/*                    <span style={{ color: 'red' }}>&nbsp;*</span>*/}
                                        {/*                )}*/}
                                        {/*                {selectedEmbeddingsProvider.credential.description && (*/}
                                        {/*                    <TooltipWithParser*/}
                                        {/*                        style={{ marginLeft: 10 }}*/}
                                        {/*                        title={selectedEmbeddingsProvider.credential.description}*/}
                                        {/*                    />*/}
                                        {/*                )}*/}
                                        {/*            </Typography>*/}
                                        {/*            <div style={{ flexGrow: 1 }}></div>*/}
                                        {/*        </div>*/}
                                        {/*        <CredentialInputHandler*/}
                                        {/*            key={embeddingCredential}*/}
                                        {/*            data={embeddingInstanceData}*/}
                                        {/*            inputParam={selectedEmbeddingsProvider.credential}*/}
                                        {/*            onSelect={(newValue) => setEmbeddingCredential(newValue)}*/}
                                        {/*        />*/}
                                        {/*    </Box>*/}
                                        {/*)}*/}
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
                                        <Box sx={{ p: 1 }}>
                                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                <DividerRoot>
                                                    <Divider>
                                                        <Chip color='warning' label={selectedVectorStoreProvider.label} size='small' />
                                                    </Divider>
                                                </DividerRoot>
                                            </div>
                                        </Box>
                                        {selectedVectorStoreProvider &&
                                            Object.keys(selectedVectorStoreProvider).length > 0 &&
                                            (selectedVectorStoreProvider.inputParams ?? [])
                                                .filter((inputParam) => !inputParam.hidden)
                                                .map((inputParam, index) => (
                                                    <DocStoreInputHandler
                                                        key={index}
                                                        data={vectorStoreInstanceData}
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
                                        <Box sx={{ p: 1 }}>
                                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                <DividerRoot>
                                                    <Divider>
                                                        <Chip color='warning' label={selectedRecordManagerProvider.label} size='small' />
                                                    </Divider>
                                                </DividerRoot>
                                            </div>
                                        </Box>
                                        {selectedRecordManagerProvider && selectedRecordManagerProvider.credential && (
                                            <Box sx={{ p: 1 }}>
                                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                    <Typography>
                                                        {selectedRecordManagerProvider.credential.label}
                                                        {!selectedRecordManagerProvider.credential.optional && (
                                                            <span style={{ color: 'red' }}>&nbsp;*</span>
                                                        )}
                                                        {selectedRecordManagerProvider.credential.description && (
                                                            <TooltipWithParser
                                                                style={{ marginLeft: 10 }}
                                                                title={selectedRecordManagerProvider.credential.description}
                                                            />
                                                        )}
                                                    </Typography>
                                                    <div style={{ flexGrow: 1 }}></div>
                                                </div>
                                                <CredentialInputHandler
                                                    key={recordManagerCredential}
                                                    data={recordManagerInstanceData}
                                                    inputParam={selectedRecordManagerProvider.credential}
                                                    onSelect={(newValue) => setRecordManagerCredential(newValue)}
                                                />
                                            </Box>
                                        )}
                                        {selectedRecordManagerProvider &&
                                            Object.keys(selectedRecordManagerProvider).length > 0 &&
                                            (selectedRecordManagerProvider.inputParams ?? [])
                                                .filter((inputParam) => !inputParam.hidden)
                                                .map((inputParam, index) => (
                                                    <>
                                                        <DocStoreInputHandler
                                                            key={index}
                                                            data={recordManagerInstanceData}
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
                <Grid item xs={8} sm={8} md={8} style={{ textAlign: 'left' }}>
                    {Object.keys(selectedEmbeddingsProvider).length > 0 && (
                        <Button color='error' variant='contained' sx={{ mr: 2 }} onClick={showEmbeddingsList}>
                            Change Embeddings
                        </Button>
                    )}
                    {Object.keys(selectedVectorStoreProvider).length > 0 && (
                        <Button color='error' variant='contained' sx={{ mr: 2 }} onClick={showVectorStoreList}>
                            Change Vector Store
                        </Button>
                    )}
                    {Object.keys(selectedRecordManagerProvider).length > 0 && (
                        <Button color='error' variant='contained' sx={{ mr: 2 }} onClick={showRecordManagerList}>
                            Change Record Manager
                        </Button>
                    )}
                </Grid>
                <Grid item xs={4} sm={4} md={4} style={{ textAlign: 'right' }}>
                    <Button color='primary' variant='contained' onClick={() => tryAndInsertIntoStore()}>
                        Save & Proceed
                    </Button>
                </Grid>
            </Grid>

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
        </>
    )
}

export default ConfigureVectorStore
