import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useRef, useState } from 'react'

// material-ui
import { useTheme } from '@mui/material/styles'
import {
    Avatar,
    Box,
    ButtonBase,
    Typography,
    Stack,
    TextField,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    Tabs,
    Tab,
    DialogActions
} from '@mui/material'

// icons
import {
    IconSettings,
    IconChevronLeft,
    IconDeviceFloppy,
    IconPencil,
    IconCheck,
    IconX,
    IconCode,
    IconPlayerPlay
} from '@tabler/icons-react'

// project imports
import Settings from '@/views/settings'
import SaveChatflowDialog from '@/ui-component/dialog/SaveChatflowDialog'
import APICodeDialog from '@/views/chatflows/APICodeDialog'
import ViewMessagesDialog from '@/ui-component/dialog/ViewMessagesDialog'
import ChatflowConfigurationDialog from '@/ui-component/dialog/ChatflowConfigurationDialog'
import UpsertHistoryDialog from '@/views/vectorstore/UpsertHistoryDialog'
import ViewLeadsDialog from '@/ui-component/dialog/ViewLeadsDialog'
import ExportAsTemplateDialog from '@/ui-component/dialog/ExportAsTemplateDialog'
import { StyledButton } from '@/ui-component/button/StyledButton'

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import { generateExportFlowData } from '@/utils/genericHelper'
import { uiBaseURL } from '@/store/constant'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction, SET_CHATFLOW } from '@/store/actions'

// ==============================|| CANVAS HEADER ||============================== //

const CanvasHeader = ({ chatflow, isAgentCanvas, isAgentflowV2, handleSaveFlow, handleDeleteFlow, handleLoadFlow }) => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const flowNameRef = useRef()
    const settingsRef = useRef()

    const [isEditingFlowName, setEditingFlowName] = useState(null)
    const [flowName, setFlowName] = useState('')
    const [isSettingsOpen, setSettingsOpen] = useState(false)
    const [flowDialogOpen, setFlowDialogOpen] = useState(false)
    const [apiDialogOpen, setAPIDialogOpen] = useState(false)
    const [apiDialogProps, setAPIDialogProps] = useState({})
    const [viewMessagesDialogOpen, setViewMessagesDialogOpen] = useState(false)
    const [viewMessagesDialogProps, setViewMessagesDialogProps] = useState({})
    const [viewLeadsDialogOpen, setViewLeadsDialogOpen] = useState(false)
    const [viewLeadsDialogProps, setViewLeadsDialogProps] = useState({})
    const [upsertHistoryDialogOpen, setUpsertHistoryDialogOpen] = useState(false)
    const [upsertHistoryDialogProps, setUpsertHistoryDialogProps] = useState({})
    const [chatflowConfigurationDialogOpen, setChatflowConfigurationDialogOpen] = useState(false)
    const [chatflowConfigurationDialogProps, setChatflowConfigurationDialogProps] = useState({})

    const [exportAsTemplateDialogOpen, setExportAsTemplateDialogOpen] = useState(false)
    const [exportAsTemplateDialogProps, setExportAsTemplateDialogProps] = useState({})
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const title = isAgentCanvas ? 'Agents' : 'Chatflow'

    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
    const canvas = useSelector((state) => state.canvas)

    const [runDialogOpen, setRunDialogOpen] = useState(false)
    const [activeTab, setActiveTab] = useState(0)
    const [runResult, setRunResult] = useState({
        input: {},
        output: {},
        details: {},
        trace: []
    })

    const onSettingsItemClick = (setting) => {
        setSettingsOpen(false)

        if (setting === 'deleteChatflow') {
            handleDeleteFlow()
        } else if (setting === 'viewMessages') {
            setViewMessagesDialogProps({
                title: 'View Messages',
                chatflow: chatflow
            })
            setViewMessagesDialogOpen(true)
        } else if (setting === 'viewLeads') {
            setViewLeadsDialogProps({
                title: 'View Leads',
                chatflow: chatflow
            })
            setViewLeadsDialogOpen(true)
        } else if (setting === 'saveAsTemplate') {
            if (canvas.isDirty) {
                enqueueSnackbar({
                    message: 'Please save the flow before exporting as template',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                return
            }
            setExportAsTemplateDialogProps({
                title: 'Export As Template',
                chatflow: chatflow
            })
            setExportAsTemplateDialogOpen(true)
        } else if (setting === 'viewUpsertHistory') {
            setUpsertHistoryDialogProps({
                title: 'View Upsert History',
                chatflow: chatflow
            })
            setUpsertHistoryDialogOpen(true)
        } else if (setting === 'chatflowConfiguration') {
            setChatflowConfigurationDialogProps({
                title: `${title} Configuration`,
                chatflow: chatflow
            })
            setChatflowConfigurationDialogOpen(true)
        } else if (setting === 'duplicateChatflow') {
            try {
                let flowData = chatflow.flowData
                const parsedFlowData = JSON.parse(flowData)
                flowData = JSON.stringify(parsedFlowData)
                localStorage.setItem('duplicatedFlowData', flowData)
                if (isAgentflowV2) {
                    window.open(`${uiBaseURL}/v2/agentcanvas`, '_blank')
                } else if (isAgentCanvas) {
                    window.open(`${uiBaseURL}/agentcanvas`, '_blank')
                } else {
                    window.open(`${uiBaseURL}/canvas`, '_blank')
                }
            } catch (e) {
                console.error(e)
            }
        } else if (setting === 'exportChatflow') {
            try {
                const flowData = JSON.parse(chatflow.flowData)
                let dataStr = JSON.stringify(generateExportFlowData(flowData), null, 2)
                //let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
                const blob = new Blob([dataStr], { type: 'application/json' })
                const dataUri = URL.createObjectURL(blob)

                let exportFileDefaultName = `${chatflow.name} ${title}.json`

                let linkElement = document.createElement('a')
                linkElement.setAttribute('href', dataUri)
                linkElement.setAttribute('download', exportFileDefaultName)
                linkElement.click()
            } catch (e) {
                console.error(e)
            }
        }
    }

    const onUploadFile = (file) => {
        setSettingsOpen(false)
        handleLoadFlow(file)
    }

    const submitFlowName = () => {
        if (chatflow.id) {
            const updateBody = {
                name: flowNameRef.current.value
            }
            updateChatflowApi.request(chatflow.id, updateBody)
        }
    }

    const onAPIDialogClick = () => {
        // If file type is file, isFormDataRequired = true
        let isFormDataRequired = false
        try {
            const flowData = JSON.parse(chatflow.flowData)
            const nodes = flowData.nodes
            for (const node of nodes) {
                if (node.data.inputParams.find((param) => param.type === 'file')) {
                    isFormDataRequired = true
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        // If sessionId memory, isSessionMemory = true
        let isSessionMemory = false
        try {
            const flowData = JSON.parse(chatflow.flowData)
            const nodes = flowData.nodes
            for (const node of nodes) {
                if (node.data.inputParams.find((param) => param.name === 'sessionId')) {
                    isSessionMemory = true
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        setAPIDialogProps({
            title: 'Embed in website or use as API',
            chatflowid: chatflow.id,
            chatflowApiKeyId: chatflow.apikeyid,
            isFormDataRequired,
            isSessionMemory,
            isAgentCanvas
        })
        setAPIDialogOpen(true)
    }

    const onSaveChatflowClick = () => {
        if (chatflow.id) handleSaveFlow(flowName)
        else setFlowDialogOpen(true)
    }

    const onConfirmSaveName = (flowName) => {
        setFlowDialogOpen(false)
        handleSaveFlow(flowName)
    }

    const handleRunClick = () => {
        setRunResult({
            input: {
                a: 1,
                'sys.files': [],
                'sys.user_id': '40f573af-ea4b-4f5d-ab82-71bf4d212d49',
                'sys.app_id': 'cfc0f4c2-bf1f-4352-9866-12cb93e23388',
                'sys.workflow_id': '57b216f9-0d99-4aee-9761-b9e2ab681713'
            },
            output: {},
            details: {
                status: 'SUCCESS',
                executor: 'Dify',
                startTime: '2025-05-26 04:26',
                runTime: '0.070s',
                totalTokens: '0 Tokens',
                steps: 2
            },
            trace: [
                {
                    node: '开始',
                    time: '31.299 ms',
                    status: 'success'
                },
                {
                    node: '结束',
                    time: '51.209 ms',
                    status: 'success'
                }
            ]
        })
        setRunDialogOpen(true)
    }

    useEffect(() => {
        if (updateChatflowApi.data) {
            setFlowName(updateChatflowApi.data.name)
            dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
        }
        setEditingFlowName(false)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateChatflowApi.data])

    useEffect(() => {
        if (chatflow) {
            setFlowName(chatflow.name)
            // if configuration dialog is open, update its data
            if (chatflowConfigurationDialogOpen) {
                setChatflowConfigurationDialogProps({
                    title: `${title} Configuration`,
                    chatflow
                })
            }
        }
    }, [chatflow, title, chatflowConfigurationDialogOpen])

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ButtonBase title='Back' sx={{ borderRadius: '50%' }}>
                        <Avatar
                            variant='rounded'
                            sx={{
                                ...theme.typography.commonAvatar,
                                ...theme.typography.mediumAvatar,
                                transition: 'all .2s ease-in-out',
                                background: theme.palette.secondary.light,
                                color: theme.palette.secondary.dark,
                                '&:hover': {
                                    background: theme.palette.secondary.dark,
                                    color: theme.palette.secondary.light
                                }
                            }}
                            color='inherit'
                            onClick={() =>
                                isAgentflowV2
                                    ? navigate('/v2/agentflows')
                                    : isAgentCanvas
                                    ? navigate('/agentflows')
                                    : navigate('/chatflows')
                            }
                        >
                            <IconChevronLeft stroke={1.5} size='1.3rem' />
                        </Avatar>
                    </ButtonBase>
                    <Stack direction='row' alignItems='center'>
                        {isEditingFlowName ? (
                            <Stack direction='row' alignItems='center' spacing={1}>
                                <TextField
                                    size='small'
                                    inputRef={flowNameRef}
                                    defaultValue={flowName}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setEditingFlowName(false)
                                            submitFlowName()
                                        }
                                    }}
                                />
                                <ButtonBase title='Save' sx={{ borderRadius: '50%' }}>
                                    <Avatar
                                        variant='rounded'
                                        sx={{
                                            ...theme.typography.commonAvatar,
                                            ...theme.typography.mediumAvatar,
                                            transition: 'all .2s ease-in-out',
                                            background: theme.palette.success.light,
                                            color: theme.palette.success.dark,
                                            '&:hover': {
                                                background: theme.palette.success.dark,
                                                color: theme.palette.success.light
                                            }
                                        }}
                                        color='inherit'
                                        onClick={() => {
                                            setEditingFlowName(false)
                                            submitFlowName()
                                        }}
                                    >
                                        <IconCheck stroke={1.5} size='1.3rem' />
                                    </Avatar>
                                </ButtonBase>
                                <ButtonBase title='Cancel' sx={{ borderRadius: '50%' }}>
                                    <Avatar
                                        variant='rounded'
                                        sx={{
                                            ...theme.typography.commonAvatar,
                                            ...theme.typography.mediumAvatar,
                                            transition: 'all .2s ease-in-out',
                                            background: theme.palette.error.light,
                                            color: theme.palette.error.dark,
                                            '&:hover': {
                                                background: theme.palette.error.dark,
                                                color: theme.palette.error.light
                                            }
                                        }}
                                        color='inherit'
                                        onClick={() => setEditingFlowName(false)}
                                    >
                                        <IconX stroke={1.5} size='1.3rem' />
                                    </Avatar>
                                </ButtonBase>
                            </Stack>
                        ) : (
                            <Stack direction='row' alignItems='center' spacing={1}>
                                <Typography
                                    variant='h3'
                                    sx={{
                                        fontSize: '1.5rem',
                                        fontWeight: 400,
                                        marginRight: '10px'
                                    }}
                                >
                                    {flowName}
                                </Typography>
                                <ButtonBase title='Edit Name' sx={{ borderRadius: '50%' }}>
                                    <Avatar
                                        variant='rounded'
                                        sx={{
                                            ...theme.typography.commonAvatar,
                                            ...theme.typography.mediumAvatar,
                                            transition: 'all .2s ease-in-out',
                                            background: theme.palette.primary.light,
                                            color: theme.palette.primary.dark,
                                            '&:hover': {
                                                background: theme.palette.primary.dark,
                                                color: theme.palette.primary.light
                                            }
                                        }}
                                        color='inherit'
                                        onClick={() => setEditingFlowName(true)}
                                    >
                                        <IconPencil stroke={1.5} size='1.3rem' />
                                    </Avatar>
                                </ButtonBase>
                            </Stack>
                        )}
                    </Stack>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <StyledButton
                        variant='contained'
                        startIcon={<IconPlayerPlay />}
                        sx={{
                            height: 37,
                            borderRadius: 2
                        }}
                        onClick={handleRunClick}
                    >
                        运行
                    </StyledButton>
                    <ButtonBase title='API Code' sx={{ borderRadius: '50%', mr: 2 }}>
                        <Avatar
                            variant='rounded'
                            sx={{
                                ...theme.typography.commonAvatar,
                                ...theme.typography.mediumAvatar,
                                transition: 'all .2s ease-in-out',
                                background: theme.palette.primary.light,
                                color: theme.palette.primary.dark,
                                '&:hover': {
                                    background: theme.palette.primary.dark,
                                    color: theme.palette.primary.light
                                }
                            }}
                            color='inherit'
                            onClick={() => setAPIDialogOpen(true)}
                        >
                            <IconCode stroke={1.5} size='1.3rem' />
                        </Avatar>
                    </ButtonBase>
                    <ButtonBase title='Save' sx={{ borderRadius: '50%', mr: 2 }}>
                        <Avatar
                            variant='rounded'
                            sx={{
                                ...theme.typography.commonAvatar,
                                ...theme.typography.mediumAvatar,
                                transition: 'all .2s ease-in-out',
                                background: theme.palette.primary.light,
                                color: theme.palette.primary.dark,
                                '&:hover': {
                                    background: theme.palette.primary.dark,
                                    color: theme.palette.primary.light
                                }
                            }}
                            color='inherit'
                            onClick={onSaveChatflowClick}
                        >
                            <IconDeviceFloppy stroke={1.5} size='1.3rem' />
                        </Avatar>
                    </ButtonBase>
                    <ButtonBase ref={settingsRef} title='Settings' sx={{ borderRadius: '50%' }}>
                        <Avatar
                            variant='rounded'
                            sx={{
                                ...theme.typography.commonAvatar,
                                ...theme.typography.mediumAvatar,
                                transition: 'all .2s ease-in-out',
                                background: theme.palette.primary.light,
                                color: theme.palette.primary.dark,
                                '&:hover': {
                                    background: theme.palette.primary.dark,
                                    color: theme.palette.primary.light
                                }
                            }}
                            onClick={() => setSettingsOpen(!isSettingsOpen)}
                        >
                            <IconSettings stroke={1.5} size='1.3rem' />
                        </Avatar>
                    </ButtonBase>
                </Box>
            </Box>
            <Settings
                chatflow={chatflow}
                isSettingsOpen={isSettingsOpen}
                anchorEl={settingsRef.current}
                onClose={() => setSettingsOpen(false)}
                onSettingsItemClick={onSettingsItemClick}
                onUploadFile={onUploadFile}
                isAgentCanvas={isAgentCanvas}
            />
            <SaveChatflowDialog
                show={flowDialogOpen}
                dialogProps={{
                    title: `Save New ${title}`,
                    confirmButtonName: 'Save',
                    cancelButtonName: 'Cancel'
                }}
                onCancel={() => setFlowDialogOpen(false)}
                onConfirm={onConfirmSaveName}
            />
            {apiDialogOpen && <APICodeDialog show={apiDialogOpen} dialogProps={apiDialogProps} onCancel={() => setAPIDialogOpen(false)} />}
            <ViewMessagesDialog
                show={viewMessagesDialogOpen}
                dialogProps={viewMessagesDialogProps}
                onCancel={() => setViewMessagesDialogOpen(false)}
            />
            <ViewLeadsDialog show={viewLeadsDialogOpen} dialogProps={viewLeadsDialogProps} onCancel={() => setViewLeadsDialogOpen(false)} />
            {exportAsTemplateDialogOpen && (
                <ExportAsTemplateDialog
                    show={exportAsTemplateDialogOpen}
                    dialogProps={exportAsTemplateDialogProps}
                    onCancel={() => setExportAsTemplateDialogOpen(false)}
                />
            )}
            <UpsertHistoryDialog
                show={upsertHistoryDialogOpen}
                dialogProps={upsertHistoryDialogProps}
                onCancel={() => setUpsertHistoryDialogOpen(false)}
            />
            <ChatflowConfigurationDialog
                key='chatflowConfiguration'
                show={chatflowConfigurationDialogOpen}
                dialogProps={chatflowConfigurationDialogProps}
                onCancel={() => setChatflowConfigurationDialogOpen(false)}
                isAgentCanvas={isAgentCanvas}
            />

            <Dialog
                open={runDialogOpen}
                onClose={() => setRunDialogOpen(false)}
                fullWidth
                maxWidth='md'
                aria-labelledby='run-dialog-title'
                aria-describedby='run-dialog-description'
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant='h3'>Test Run#7</Typography>
                    <IconX style={{ cursor: 'pointer' }} onClick={() => setRunDialogOpen(false)} />
                </DialogTitle>
                <DialogContent>
                    <Tabs
                        value={activeTab}
                        onChange={(e, newValue) => setActiveTab(newValue)}
                        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                    >
                        <Tab label='输入' />
                        <Tab label='结果' />
                        <Tab label='详情' />
                        <Tab label='追踪' />
                    </Tabs>

                    {activeTab === 0 && (
                        <Box>
                            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(runResult.input, null, 2)}</pre>
                        </Box>
                    )}

                    {activeTab === 1 && (
                        <Box>
                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: '#f0f9f4',
                                    borderRadius: 1,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    mb: 2
                                }}
                            >
                                <Typography>状态: SUCCESS</Typography>
                                <Typography>运行时间: {runResult.details.runTime}</Typography>
                                <Typography>总 TOKEN 数: {runResult.details.totalTokens}</Typography>
                            </Box>
                        </Box>
                    )}

                    {activeTab === 2 && (
                        <Box>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>状态</Typography>
                                    <Typography>{runResult.details.status}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>执行人</Typography>
                                    <Typography>{runResult.details.executor}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>开始时间</Typography>
                                    <Typography>{runResult.details.startTime}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>运行时间</Typography>
                                    <Typography>{runResult.details.runTime}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>总 token 数</Typography>
                                    <Typography>{runResult.details.totalTokens}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>运行步数</Typography>
                                    <Typography>{runResult.details.steps}</Typography>
                                </Box>
                            </Stack>
                        </Box>
                    )}

                    {activeTab === 3 && (
                        <Box>
                            <Stack spacing={2}>
                                {runResult.trace.map((step, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            p: 2,
                                            bgcolor: '#f5f5f5',
                                            borderRadius: 1,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Typography>{step.node}</Typography>
                                        <Typography>{step.time}</Typography>
                                        <Box
                                            sx={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: '50%',
                                                bgcolor: step.status === 'success' ? '#4caf50' : '#f44336'
                                            }}
                                        />
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <StyledButton
                        variant='contained'
                        fullWidth
                        onClick={() => {}}
                        sx={{
                            height: 37,
                            borderRadius: 2,
                            bgcolor: theme.palette.primary.main,
                            '&:hover': {
                                bgcolor: theme.palette.primary.dark
                            }
                        }}
                    >
                        开始运行
                    </StyledButton>
                </DialogActions>
            </Dialog>
        </>
    )
}

CanvasHeader.propTypes = {
    chatflow: PropTypes.object,
    handleSaveFlow: PropTypes.func,
    handleDeleteFlow: PropTypes.func,
    handleLoadFlow: PropTypes.func,
    isAgentCanvas: PropTypes.bool,
    isAgentflowV2: PropTypes.bool
}

export default CanvasHeader
