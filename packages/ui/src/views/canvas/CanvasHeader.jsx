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
import axios from 'axios'

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
            input: {},
            output: {},
            details: {
                status: '',
                executor: 'System',
                startTime: new Date().toLocaleString(),
                runTime: '0.000s',
                totalTokens: '0 Tokens',
                steps: 0
            },
            trace: []
        })
        setRunDialogOpen(true)
    }

    const handleStartRun = async () => {
        try {
            const response = await axios.post(`/api/v1/prediction/${chatflow.id}`, {
                question: '',
                chatId: Date.now().toString(),
                overrideConfig: {}
            })

            // 获取 EndFunction 节点的结果
            let endFunctionOutput = {}
            try {
                if (response.data.results && Array.isArray(response.data.results)) {
                    const endFunctionResults = response.data.results.filter((result) => {
                        return result.nodeName === 'endFunction'
                    })

                    if (endFunctionResults && endFunctionResults.length > 0 && endFunctionResults[0].result) {
                        endFunctionOutput = endFunctionResults[0].result
                    }
                }
            } catch (error) {
                console.warn('获取 EndFunction 结果时出错:', error)
            }

            setRunResult({
                input: response.data.input || {},
                output: endFunctionOutput || {},
                details: {
                    status: response.data.status || 'SUCCESS',
                    executor: response.data.executor || 'System',
                    startTime: new Date().toLocaleString(),
                    runTime: response.data.runTime || '0.000s',
                    totalTokens: response.data.totalTokens || '0 Tokens',
                    steps: response.data.steps || 0
                },
                trace: response.data.trace || []
            })
        } catch (error) {
            console.error('Error running prediction:', error)
            setRunResult({
                ...runResult,
                details: {
                    ...runResult.details,
                    status: 'ERROR',
                    error: error.message
                }
            })
        }
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

    useEffect(() => {
        // 建立 WebSocket 连接
        if (chatflow?.id) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            // 使用当前页面的 host 和 port
            const wsUrl = `${protocol}//${window.location.host}/api/v1/ws?chatflowid=${chatflow.id}`
            console.log('Attempting to connect WebSocket:', wsUrl)

            let ws = null
            let reconnectTimeout = null
            let retryCount = 0
            const maxRetries = 10
            const initialRetryDelay = 1000
            const maxRetryDelay = 10000

            const getRetryDelay = () => {
                // 指数退避策略
                return Math.min(initialRetryDelay * Math.pow(2, retryCount), maxRetryDelay)
            }

            const clearReconnectTimeout = () => {
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout)
                    reconnectTimeout = null
                }
            }

            const connect = () => {
                try {
                    clearReconnectTimeout()

                    if (ws) {
                        ws.close()
                    }

                    ws = new WebSocket(wsUrl)

                    // 启用 ping 自动响应
                    ws.onopen = () => {
                        console.log('WebSocket connection established')
                        retryCount = 0 // 重置重试计数
                        // 发送一个测试消息
                        ws.send(
                            JSON.stringify({
                                type: 'system',
                                message: 'Client connected'
                            })
                        )
                    }

                    ws.onclose = (event) => {
                        console.log('WebSocket connection closed:', event.code, event.reason)

                        // 如果不是正常关闭且未达到最大重试次数，则尝试重连
                        if (event.code !== 1000 && retryCount < maxRetries) {
                            retryCount++
                            const delay = getRetryDelay()
                            console.log(`Retrying connection (${retryCount}/${maxRetries}) in ${delay}ms...`)
                            reconnectTimeout = setTimeout(connect, delay)
                        }
                    }

                    ws.onerror = (error) => {
                        console.error('WebSocket connection error:', error)
                    }

                    ws.onmessage = (event) => {
                        try {
                            // 如果是字符串消息，尝试解析为 JSON
                            if (typeof event.data === 'string') {
                                const data = JSON.parse(event.data)
                                console.log('Parsed WebSocket message:', data)
                                // 处理接收到的消息
                                if (data.type === 'loopIteration') {
                                    // 处理循环迭代消息
                                    console.log('Loop iteration update:', data.data)
                                } else if (data.type === 'system') {
                                    // 处理系统消息
                                    console.log('System message:', data.message)
                                }
                            }
                            // ping 消息会自动触发浏览器的 pong 响应，不需要我们手动处理
                        } catch (error) {
                            console.error('Error handling WebSocket message:', error)
                        }
                    }
                } catch (error) {
                    console.error('Error creating WebSocket connection:', error)
                    if (retryCount < maxRetries) {
                        retryCount++
                        const delay = getRetryDelay()
                        console.log(`Retrying connection (${retryCount}/${maxRetries}) in ${delay}ms...`)
                        reconnectTimeout = setTimeout(connect, delay)
                    }
                }
            }

            connect()

            // 清理函数
            return () => {
                clearReconnectTimeout()
                if (ws) {
                    ws.close(1000, 'Component unmounting')
                }
            }
        }
    }, [chatflow?.id])

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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                    <Typography variant='h3'>Test Run#7</Typography>
                    <IconX style={{ cursor: 'pointer' }} onClick={() => setRunDialogOpen(false)} />
                </Box>
                <DialogContent>
                    <Tabs
                        value={activeTab}
                        onChange={(e, newValue) => setActiveTab(newValue)}
                        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                    >
                        <Tab label='结果' />
                        <Tab label='详情' />
                        <Tab label='追踪' />
                    </Tabs>

                    {activeTab === 0 && (
                        <Box>
                            <pre style={{ whiteSpace: 'pre-wrap' }}>
                                {runResult.output &&
                                    typeof runResult.output === 'object' &&
                                    (Object.keys(runResult.output).length === 0
                                        ? '' // 如果是空对象，显示空字符串
                                        : 'result' in runResult.output
                                        ? JSON.stringify(runResult.output.result, null, 2)
                                        : JSON.stringify(runResult.output, null, 2))}
                            </pre>

                            {/* {runResult.output && typeof runResult.output === 'object' &&
                                Object.keys(runResult.output).length > 0 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 2 }}>
                                        <StyledButton
                                            variant="contained"
                                            onClick={() => {
                                                const resultData = 'result' in runResult.output
                                                    ? runResult.output.result
                                                    : runResult.output
                                                const dataStr = JSON.stringify(resultData, null, 2)
                                                const blob = new Blob([dataStr], { type: 'application/json' })
                                                const url = URL.createObjectURL(blob)
                                                const link = document.createElement('a')
                                                link.href = url
                                                link.download = `result_${new Date().getTime()}.json`
                                                document.body.appendChild(link)
                                                link.click()
                                                document.body.removeChild(link)
                                                URL.revokeObjectURL(url)
                                            }}
                                            sx={{
                                                height: 37,
                                                borderRadius: 2,
                                                bgcolor: theme.palette.primary.main,
                                                '&:hover': {
                                                    bgcolor: theme.palette.primary.dark
                                                }
                                            }}
                                        >
                                            下载结果
                                        </StyledButton>
                                    </Box>
                                )
                            } */}
                        </Box>
                    )}

                    {activeTab === 1 && (
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

                    {activeTab === 2 && (
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
                        onClick={handleStartRun}
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
