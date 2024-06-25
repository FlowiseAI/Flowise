import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useState, useEffect, forwardRef } from 'react'
import PropTypes from 'prop-types'
import moment from 'moment'
import rehypeMathjax from 'rehype-mathjax'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import axios from 'axios'

// material-ui
import {
    Button,
    Tooltip,
    ListItemButton,
    Box,
    Stack,
    Dialog,
    DialogContent,
    DialogTitle,
    ListItem,
    ListItemText,
    Chip,
    Card,
    CardMedia,
    CardContent
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import DatePicker from 'react-datepicker'

import robotPNG from '@/assets/images/robot.png'
import userPNG from '@/assets/images/account.png'
import msgEmptySVG from '@/assets/images/message_empty.svg'
import multiagent_supervisorPNG from '@/assets/images/multiagent_supervisor.png'
import multiagent_workerPNG from '@/assets/images/multiagent_worker.png'
import { IconFileExport, IconEraser, IconX, IconDownload } from '@tabler/icons-react'

// Project import
import { MemoizedReactMarkdown } from '@/ui-component/markdown/MemoizedReactMarkdown'
import { CodeBlock } from '@/ui-component/markdown/CodeBlock'
import SourceDocDialog from '@/ui-component/dialog/SourceDocDialog'
import { MultiDropdown } from '@/ui-component/dropdown/MultiDropdown'
import { StyledButton } from '@/ui-component/button/StyledButton'
import StatsCard from '@/ui-component/cards/StatsCard'
import Feedback from '@/ui-component/extended/Feedback'

// store
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

// API
import chatmessageApi from '@/api/chatmessage'
import feedbackApi from '@/api/feedback'
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// Utils
import { getOS, isValidURL, removeDuplicateURL } from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'
import { baseURL } from '@/store/constant'

import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

import '@/views/chatmessage/ChatMessage.css'
import 'react-datepicker/dist/react-datepicker.css'

const DatePickerCustomInput = forwardRef(function DatePickerCustomInput({ value, onClick }, ref) {
    return (
        <ListItemButton style={{ borderRadius: 15, border: '1px solid #e0e0e0' }} onClick={onClick} ref={ref}>
            {value}
        </ListItemButton>
    )
})

DatePickerCustomInput.propTypes = {
    value: PropTypes.string,
    onClick: PropTypes.func
}

const messageImageStyle = {
    width: '128px',
    height: '128px',
    objectFit: 'cover'
}

const ViewMessagesDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const { confirm } = useConfirm()

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [chatlogs, setChatLogs] = useState([])
    const [allChatlogs, setAllChatLogs] = useState([])
    const [chatMessages, setChatMessages] = useState([])
    const [stats, setStats] = useState([])
    const [selectedMessageIndex, setSelectedMessageIndex] = useState(0)
    const [selectedChatId, setSelectedChatId] = useState('')
    const [sourceDialogOpen, setSourceDialogOpen] = useState(false)
    const [sourceDialogProps, setSourceDialogProps] = useState({})
    const [chatTypeFilter, setChatTypeFilter] = useState([])
    const [startDate, setStartDate] = useState(new Date().setMonth(new Date().getMonth() - 1))
    const [endDate, setEndDate] = useState(new Date())
    const [leadEmail, setLeadEmail] = useState('')

    const getChatmessageApi = useApi(chatmessageApi.getAllChatmessageFromChatflow)
    const getChatmessageFromPKApi = useApi(chatmessageApi.getChatmessageFromPK)
    const getStatsApi = useApi(feedbackApi.getStatsFromChatflow)
    const getStoragePathFromServer = useApi(chatmessageApi.getStoragePath)
    let storagePath = ''

    const onStartDateSelected = (date) => {
        setStartDate(date)
        getChatmessageApi.request(dialogProps.chatflow.id, {
            startDate: date,
            endDate: endDate,
            chatType: chatTypeFilter.length ? chatTypeFilter : undefined
        })
        getStatsApi.request(dialogProps.chatflow.id, {
            startDate: date,
            endDate: endDate,
            chatType: chatTypeFilter.length ? chatTypeFilter : undefined
        })
    }

    const onEndDateSelected = (date) => {
        setEndDate(date)
        getChatmessageApi.request(dialogProps.chatflow.id, {
            endDate: date,
            startDate: startDate,
            chatType: chatTypeFilter.length ? chatTypeFilter : undefined
        })
        getStatsApi.request(dialogProps.chatflow.id, {
            endDate: date,
            startDate: startDate,
            chatType: chatTypeFilter.length ? chatTypeFilter : undefined
        })
    }

    const onChatTypeSelected = (chatTypes) => {
        setChatTypeFilter(chatTypes)
        getChatmessageApi.request(dialogProps.chatflow.id, {
            chatType: chatTypes.length ? chatTypes : undefined,
            startDate: startDate,
            endDate: endDate
        })
        getStatsApi.request(dialogProps.chatflow.id, {
            chatType: chatTypes.length ? chatTypes : undefined,
            startDate: startDate,
            endDate: endDate
        })
    }

    const exportMessages = async () => {
        if (!storagePath && getStoragePathFromServer.data) {
            storagePath = getStoragePathFromServer.data.storagePath
        }
        const obj = {}
        let fileSeparator = '/'
        if ('windows' === getOS()) {
            fileSeparator = '\\'
        }
        for (let i = 0; i < allChatlogs.length; i += 1) {
            const chatmsg = allChatlogs[i]
            const chatPK = getChatPK(chatmsg)
            let filePaths = []
            if (chatmsg.fileUploads) {
                chatmsg.fileUploads = JSON.parse(chatmsg.fileUploads)
                chatmsg.fileUploads.forEach((file) => {
                    if (file.type === 'stored-file') {
                        filePaths.push(
                            `${storagePath}${fileSeparator}${chatmsg.chatflowid}${fileSeparator}${chatmsg.chatId}${fileSeparator}${file.name}`
                        )
                    }
                })
            }
            const msg = {
                content: chatmsg.content,
                role: chatmsg.role === 'apiMessage' ? 'bot' : 'user',
                time: chatmsg.createdDate
            }
            if (filePaths.length) msg.filePaths = filePaths
            if (chatmsg.sourceDocuments) msg.sourceDocuments = JSON.parse(chatmsg.sourceDocuments)
            if (chatmsg.usedTools) msg.usedTools = JSON.parse(chatmsg.usedTools)
            if (chatmsg.fileAnnotations) msg.fileAnnotations = JSON.parse(chatmsg.fileAnnotations)
            if (chatmsg.feedback) msg.feedback = chatmsg.feedback?.content
            if (chatmsg.agentReasoning) msg.agentReasoning = JSON.parse(chatmsg.agentReasoning)

            if (!Object.prototype.hasOwnProperty.call(obj, chatPK)) {
                obj[chatPK] = {
                    id: chatmsg.chatId,
                    source: chatmsg.chatType === 'INTERNAL' ? 'UI' : 'API/Embed',
                    sessionId: chatmsg.sessionId ?? null,
                    memoryType: chatmsg.memoryType ?? null,
                    email: chatmsg.leadEmail ?? null,
                    messages: [msg]
                }
            } else if (Object.prototype.hasOwnProperty.call(obj, chatPK)) {
                obj[chatPK].messages = [...obj[chatPK].messages, msg]
            }
        }

        const exportMessages = []
        for (const key in obj) {
            exportMessages.push({
                ...obj[key]
            })
        }

        for (let i = 0; i < exportMessages.length; i += 1) {
            exportMessages[i].messages = exportMessages[i].messages.reverse()
        }

        const dataStr = JSON.stringify(exportMessages, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

        const exportFileDefaultName = `${dialogProps.chatflow.id}-Message.json`

        let linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()
    }

    const clearChat = async (chatmsg) => {
        const description =
            chatmsg.sessionId && chatmsg.memoryType
                ? `Are you sure you want to clear session id: ${chatmsg.sessionId} from ${chatmsg.memoryType}?`
                : `Are you sure you want to clear messages?`
        const confirmPayload = {
            title: `Clear Session`,
            description,
            confirmButtonName: 'Clear',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        const chatflowid = dialogProps.chatflow.id
        if (isConfirmed) {
            try {
                const obj = { chatflowid, isClearFromViewMessageDialog: true }
                if (chatmsg.chatId) obj.chatId = chatmsg.chatId
                if (chatmsg.chatType) obj.chatType = chatmsg.chatType
                if (chatmsg.memoryType) obj.memoryType = chatmsg.memoryType
                if (chatmsg.sessionId) obj.sessionId = chatmsg.sessionId

                await chatmessageApi.deleteChatmessage(chatflowid, obj)
                const description =
                    chatmsg.sessionId && chatmsg.memoryType
                        ? `Succesfully cleared session id: ${chatmsg.sessionId} from ${chatmsg.memoryType}`
                        : `Succesfully cleared messages`
                enqueueSnackbar({
                    message: description,
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
                getChatmessageApi.request(chatflowid)
                getStatsApi.request(chatflowid) // update stats
            } catch (error) {
                enqueueSnackbar({
                    message: typeof error.response.data === 'object' ? error.response.data.message : error.response.data,
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
            }
        }
    }

    const getChatMessages = (chatmessages) => {
        let prevDate = ''
        const loadedMessages = []
        for (let i = 0; i < chatmessages.length; i += 1) {
            const chatmsg = chatmessages[i]
            setSelectedChatId(chatmsg.chatId)
            if (!prevDate) {
                prevDate = chatmsg.createdDate.split('T')[0]
                loadedMessages.push({
                    message: chatmsg.createdDate,
                    type: 'timeMessage'
                })
            } else {
                const currentDate = chatmsg.createdDate.split('T')[0]
                if (currentDate !== prevDate) {
                    prevDate = currentDate
                    loadedMessages.push({
                        message: chatmsg.createdDate,
                        type: 'timeMessage'
                    })
                }
            }
            if (chatmsg.fileUploads) {
                chatmsg.fileUploads = JSON.parse(chatmsg.fileUploads)
                chatmsg.fileUploads.forEach((file) => {
                    if (file.type === 'stored-file') {
                        file.data = `${baseURL}/api/v1/get-upload-file?chatflowId=${chatmsg.chatflowid}&chatId=${chatmsg.chatId}&fileName=${file.name}`
                    }
                })
            }
            const obj = {
                ...chatmsg,
                message: chatmsg.content,
                type: chatmsg.role
            }
            if (chatmsg.sourceDocuments) obj.sourceDocuments = JSON.parse(chatmsg.sourceDocuments)
            if (chatmsg.usedTools) obj.usedTools = JSON.parse(chatmsg.usedTools)
            if (chatmsg.fileAnnotations) obj.fileAnnotations = JSON.parse(chatmsg.fileAnnotations)
            if (chatmsg.agentReasoning) obj.agentReasoning = JSON.parse(chatmsg.agentReasoning)

            loadedMessages.push(obj)
        }
        setChatMessages(loadedMessages)
    }

    const getChatPK = (chatmsg) => {
        const chatId = chatmsg.chatId
        const memoryType = chatmsg.memoryType ?? 'null'
        const sessionId = chatmsg.sessionId ?? 'null'
        return `${chatId}_${memoryType}_${sessionId}`
    }

    const transformChatPKToParams = (chatPK) => {
        let [c1, c2, ...rest] = chatPK.split('_')
        const chatId = c1
        const memoryType = c2
        const sessionId = rest.join('_')

        const params = { chatId }
        if (memoryType !== 'null') params.memoryType = memoryType
        if (sessionId !== 'null') params.sessionId = sessionId

        return params
    }

    const processChatLogs = (allChatMessages) => {
        const seen = {}
        const filteredChatLogs = []
        for (let i = 0; i < allChatMessages.length; i += 1) {
            const PK = getChatPK(allChatMessages[i])

            const item = allChatMessages[i]
            if (!Object.prototype.hasOwnProperty.call(seen, PK)) {
                seen[PK] = {
                    counter: 1,
                    item: allChatMessages[i]
                }
            } else if (Object.prototype.hasOwnProperty.call(seen, PK) && seen[PK].counter === 1) {
                seen[PK] = {
                    counter: 2,
                    item: {
                        ...seen[PK].item,
                        apiContent:
                            seen[PK].item.role === 'apiMessage' ? `Bot: ${seen[PK].item.content}` : `User: ${seen[PK].item.content}`,
                        userContent: item.role === 'apiMessage' ? `Bot: ${item.content}` : `User: ${item.content}`
                    }
                }
                filteredChatLogs.push(seen[PK].item)
            }
        }
        setChatLogs(filteredChatLogs)
        if (filteredChatLogs.length) return getChatPK(filteredChatLogs[0])
        return undefined
    }

    const handleItemClick = (idx, chatmsg) => {
        setSelectedMessageIndex(idx)
        getChatmessageFromPKApi.request(dialogProps.chatflow.id, transformChatPKToParams(getChatPK(chatmsg)))
    }

    const onURLClick = (data) => {
        window.open(data, '_blank')
    }

    const downloadFile = async (fileAnnotation) => {
        try {
            const response = await axios.post(
                `${baseURL}/api/v1/openai-assistants-file/download`,
                { fileName: fileAnnotation.fileName, chatflowId: dialogProps.chatflow.id, chatId: selectedChatId },
                { responseType: 'blob' }
            )
            const blob = new Blob([response.data], { type: response.headers['content-type'] })
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = fileAnnotation.fileName
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error('Download failed:', error)
        }
    }

    const onSourceDialogClick = (data, title) => {
        setSourceDialogProps({ data, title })
        setSourceDialogOpen(true)
    }

    useEffect(() => {
        const leadEmailFromChatMessages = chatMessages.filter((message) => message.type === 'userMessage' && message.leadEmail)
        if (leadEmailFromChatMessages.length) {
            setLeadEmail(leadEmailFromChatMessages[0].leadEmail)
        }
    }, [chatMessages, selectedMessageIndex])

    useEffect(() => {
        if (getChatmessageFromPKApi.data) {
            getChatMessages(getChatmessageFromPKApi.data)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChatmessageFromPKApi.data])

    useEffect(() => {
        if (getChatmessageApi.data) {
            getStoragePathFromServer.request()

            setAllChatLogs(getChatmessageApi.data)
            const chatPK = processChatLogs(getChatmessageApi.data)
            setSelectedMessageIndex(0)
            if (chatPK) getChatmessageFromPKApi.request(dialogProps.chatflow.id, transformChatPKToParams(chatPK))
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getChatmessageApi.data])

    useEffect(() => {
        if (getStatsApi.data) {
            setStats(getStatsApi.data)
        }
    }, [getStatsApi.data])

    useEffect(() => {
        if (dialogProps.chatflow) {
            getChatmessageApi.request(dialogProps.chatflow.id)
            getStatsApi.request(dialogProps.chatflow.id)
        }

        return () => {
            setChatLogs([])
            setAllChatLogs([])
            setChatMessages([])
            setChatTypeFilter([])
            setSelectedMessageIndex(0)
            setSelectedChatId('')
            setStartDate(new Date().setMonth(new Date().getMonth() - 1))
            setEndDate(new Date())
            setStats([])
            setLeadEmail('')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth={chatlogs && chatlogs.length == 0 ? 'md' : 'lg'}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {dialogProps.title}
                    <div style={{ flex: 1 }} />
                    <Button variant='outlined' onClick={() => exportMessages()} startIcon={<IconFileExport />}>
                        Export
                    </Button>
                </div>
            </DialogTitle>
            <DialogContent>
                <>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 16,
                            marginLeft: 8,
                            marginRight: 8
                        }}
                    >
                        <div style={{ marginRight: 10 }}>
                            <b style={{ marginRight: 10 }}>From Date</b>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => onStartDateSelected(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                customInput={<DatePickerCustomInput />}
                            />
                        </div>
                        <div style={{ marginRight: 10 }}>
                            <b style={{ marginRight: 10 }}>To Date</b>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => onEndDateSelected(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                maxDate={new Date()}
                                customInput={<DatePickerCustomInput />}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', minWidth: '200px', marginRight: 10 }}>
                            <b style={{ marginRight: 10 }}>Source</b>
                            <MultiDropdown
                                key={JSON.stringify(chatTypeFilter)}
                                name='chatType'
                                options={[
                                    {
                                        label: 'UI',
                                        name: 'INTERNAL'
                                    },
                                    {
                                        label: 'API/Embed',
                                        name: 'EXTERNAL'
                                    }
                                ]}
                                onSelect={(newValue) => onChatTypeSelected(newValue)}
                                value={chatTypeFilter}
                                formControlSx={{ mt: 0 }}
                            />
                        </div>
                        <div style={{ flex: 1 }}></div>
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: 10,
                            marginBottom: 16,
                            marginLeft: 8,
                            marginRight: 8
                        }}
                    >
                        <StatsCard title='Total Messages' stat={`${stats.totalMessages}`} />
                        <StatsCard title='Total Feedback Received' stat={`${stats.totalFeedback}`} />
                        <StatsCard
                            title='Positive Feedback'
                            stat={`${((stats.positiveFeedback / stats.totalFeedback) * 100 || 0).toFixed(2)}%`}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        {chatlogs && chatlogs.length == 0 && (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center', width: '100%' }} flexDirection='column'>
                                <Box sx={{ p: 5, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={msgEmptySVG}
                                        alt='msgEmptySVG'
                                    />
                                </Box>
                                <div>No Messages</div>
                            </Stack>
                        )}
                        {chatlogs && chatlogs.length > 0 && (
                            <div style={{ flexBasis: '40%' }}>
                                <Box
                                    sx={{
                                        overflowY: 'auto',
                                        display: 'flex',
                                        flexGrow: 1,
                                        flexDirection: 'column',
                                        maxHeight: 'calc(100vh - 260px)'
                                    }}
                                >
                                    {chatlogs.map((chatmsg, index) => (
                                        <ListItemButton
                                            key={index}
                                            sx={{
                                                p: 0,
                                                borderRadius: `${customization.borderRadius}px`,
                                                boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
                                                mt: 1,
                                                ml: 1,
                                                mr: 1,
                                                mb: index === chatlogs.length - 1 ? 1 : 0
                                            }}
                                            selected={selectedMessageIndex === index}
                                            onClick={() => handleItemClick(index, chatmsg)}
                                        >
                                            <ListItem alignItems='center'>
                                                <ListItemText
                                                    primary={
                                                        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                                                            <span>{chatmsg?.userContent}</span>
                                                            <div
                                                                style={{
                                                                    maxHeight: '100px',
                                                                    maxWidth: '400px',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}
                                                            >
                                                                {chatmsg?.apiContent}
                                                            </div>
                                                        </div>
                                                    }
                                                    secondary={moment(chatmsg.createdDate).format('MMMM Do YYYY, h:mm:ss a')}
                                                />
                                            </ListItem>
                                        </ListItemButton>
                                    ))}
                                </Box>
                            </div>
                        )}
                        {chatlogs && chatlogs.length > 0 && (
                            <div style={{ flexBasis: '60%', paddingRight: '30px' }}>
                                {chatMessages && chatMessages.length > 1 && (
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <div style={{ flex: 1, marginLeft: '20px', marginBottom: '15px', marginTop: '10px' }}>
                                            {chatMessages[1].sessionId && (
                                                <div>
                                                    Session Id:&nbsp;<b>{chatMessages[1].sessionId}</b>
                                                </div>
                                            )}
                                            {chatMessages[1].chatType && (
                                                <div>
                                                    Source:&nbsp;<b>{chatMessages[1].chatType === 'INTERNAL' ? 'UI' : 'API/Embed'}</b>
                                                </div>
                                            )}
                                            {chatMessages[1].memoryType && (
                                                <div>
                                                    Memory:&nbsp;<b>{chatMessages[1].memoryType}</b>
                                                </div>
                                            )}
                                            {leadEmail && (
                                                <div>
                                                    Email:&nbsp;<b>{leadEmail}</b>
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignContent: 'center',
                                                alignItems: 'end'
                                            }}
                                        >
                                            <StyledButton
                                                sx={{ height: 'max-content', width: 'max-content' }}
                                                variant='outlined'
                                                color='error'
                                                title='Clear Message'
                                                onClick={() => clearChat(chatMessages[1])}
                                                startIcon={<IconEraser />}
                                            >
                                                Clear
                                            </StyledButton>
                                            {chatMessages[1].sessionId && (
                                                <Tooltip
                                                    title={
                                                        'At your left 👈 you will see the Memory node that was used in this conversation. You need to have the matching Memory node with same parameters in the canvas, in order to delete the session conversations stored on the Memory node'
                                                    }
                                                    placement='bottom'
                                                >
                                                    <h5 style={{ cursor: 'pointer', color: theme.palette.primary.main }}>
                                                        Why my session is not deleted?
                                                    </h5>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        marginLeft: '20px',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: `${customization.borderRadius}px`
                                    }}
                                    className='cloud-message'
                                >
                                    <div style={{ width: '100%', height: '100%' }}>
                                        {chatMessages &&
                                            chatMessages.map((message, index) => {
                                                if (message.type === 'apiMessage' || message.type === 'userMessage') {
                                                    return (
                                                        <Box
                                                            sx={{
                                                                background:
                                                                    message.type === 'apiMessage' ? theme.palette.asyncSelect.main : '',
                                                                py: '1rem',
                                                                px: '1.5rem'
                                                            }}
                                                            key={index}
                                                            style={{ display: 'flex', justifyContent: 'center', alignContent: 'center' }}
                                                        >
                                                            {/* Display the correct icon depending on the message type */}
                                                            {message.type === 'apiMessage' ? (
                                                                <img
                                                                    style={{ marginLeft: '10px' }}
                                                                    src={robotPNG}
                                                                    alt='AI'
                                                                    width='25'
                                                                    height='25'
                                                                    className='boticon'
                                                                />
                                                            ) : (
                                                                <img
                                                                    style={{ marginLeft: '10px' }}
                                                                    src={userPNG}
                                                                    alt='Me'
                                                                    width='25'
                                                                    height='25'
                                                                    className='usericon'
                                                                />
                                                            )}
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    width: '100%'
                                                                }}
                                                            >
                                                                {message.usedTools && (
                                                                    <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                                                                        {message.usedTools.map((tool, index) => {
                                                                            return (
                                                                                <Chip
                                                                                    size='small'
                                                                                    key={index}
                                                                                    label={tool.tool}
                                                                                    component='a'
                                                                                    sx={{ mr: 1, mt: 1 }}
                                                                                    variant='outlined'
                                                                                    clickable
                                                                                    onClick={() => onSourceDialogClick(tool, 'Used Tools')}
                                                                                />
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {message.fileUploads && message.fileUploads.length > 0 && (
                                                                    <div
                                                                        style={{
                                                                            display: 'flex',
                                                                            flexWrap: 'wrap',
                                                                            flexDirection: 'column',
                                                                            width: '100%',
                                                                            gap: '8px'
                                                                        }}
                                                                    >
                                                                        {message.fileUploads.map((item, index) => {
                                                                            return (
                                                                                <>
                                                                                    {item.mime.startsWith('image/') ? (
                                                                                        <Card
                                                                                            key={index}
                                                                                            sx={{
                                                                                                p: 0,
                                                                                                m: 0,
                                                                                                maxWidth: 128,
                                                                                                marginRight: '10px',
                                                                                                flex: '0 0 auto'
                                                                                            }}
                                                                                        >
                                                                                            <CardMedia
                                                                                                component='img'
                                                                                                image={item.data}
                                                                                                sx={{ height: 64 }}
                                                                                                alt={'preview'}
                                                                                                style={messageImageStyle}
                                                                                            />
                                                                                        </Card>
                                                                                    ) : (
                                                                                        // eslint-disable-next-line jsx-a11y/media-has-caption
                                                                                        <audio controls='controls'>
                                                                                            Your browser does not support the &lt;audio&gt;
                                                                                            tag.
                                                                                            <source src={item.data} type={item.mime} />
                                                                                        </audio>
                                                                                    )}
                                                                                </>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {message.agentReasoning && (
                                                                    <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                                                                        {message.agentReasoning.map((agent, index) => {
                                                                            return (
                                                                                <Card
                                                                                    key={index}
                                                                                    sx={{
                                                                                        border: '1px solid #e0e0e0',
                                                                                        borderRadius: `${customization.borderRadius}px`,
                                                                                        mb: 1
                                                                                    }}
                                                                                >
                                                                                    <CardContent>
                                                                                        <Stack
                                                                                            sx={{
                                                                                                alignItems: 'center',
                                                                                                justifyContent: 'flex-start',
                                                                                                width: '100%'
                                                                                            }}
                                                                                            flexDirection='row'
                                                                                        >
                                                                                            <Box sx={{ height: 'auto', pr: 1 }}>
                                                                                                <img
                                                                                                    style={{
                                                                                                        objectFit: 'cover',
                                                                                                        height: '25px',
                                                                                                        width: 'auto'
                                                                                                    }}
                                                                                                    src={
                                                                                                        agent.instructions
                                                                                                            ? multiagent_supervisorPNG
                                                                                                            : multiagent_workerPNG
                                                                                                    }
                                                                                                    alt='agentPNG'
                                                                                                />
                                                                                            </Box>
                                                                                            <div>{agent.agentName}</div>
                                                                                        </Stack>
                                                                                        {agent.messages.length > 0 && (
                                                                                            <MemoizedReactMarkdown
                                                                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                                                                rehypePlugins={[rehypeMathjax, rehypeRaw]}
                                                                                                components={{
                                                                                                    code({
                                                                                                        inline,
                                                                                                        className,
                                                                                                        children,
                                                                                                        ...props
                                                                                                    }) {
                                                                                                        const match = /language-(\w+)/.exec(
                                                                                                            className || ''
                                                                                                        )
                                                                                                        return !inline ? (
                                                                                                            <CodeBlock
                                                                                                                key={Math.random()}
                                                                                                                chatflowid={chatflowid}
                                                                                                                isDialog={isDialog}
                                                                                                                language={
                                                                                                                    (match && match[1]) ||
                                                                                                                    ''
                                                                                                                }
                                                                                                                value={String(
                                                                                                                    children
                                                                                                                ).replace(/\n$/, '')}
                                                                                                                {...props}
                                                                                                            />
                                                                                                        ) : (
                                                                                                            <code
                                                                                                                className={className}
                                                                                                                {...props}
                                                                                                            >
                                                                                                                {children}
                                                                                                            </code>
                                                                                                        )
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                {agent.messages.length > 1
                                                                                                    ? agent.messages.join('\\n')
                                                                                                    : agent.messages[0]}
                                                                                            </MemoizedReactMarkdown>
                                                                                        )}
                                                                                        {agent.instructions && <p>{agent.instructions}</p>}
                                                                                        {agent.messages.length === 0 &&
                                                                                            !agent.instructions && <p>Finished</p>}
                                                                                    </CardContent>
                                                                                </Card>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}
                                                                <div className='markdownanswer'>
                                                                    {/* Messages are being rendered in Markdown format */}
                                                                    <MemoizedReactMarkdown
                                                                        remarkPlugins={[remarkGfm, remarkMath]}
                                                                        rehypePlugins={[rehypeMathjax, rehypeRaw]}
                                                                        components={{
                                                                            code({ inline, className, children, ...props }) {
                                                                                const match = /language-(\w+)/.exec(className || '')
                                                                                return !inline ? (
                                                                                    <CodeBlock
                                                                                        key={Math.random()}
                                                                                        chatflowid={dialogProps.chatflow.id}
                                                                                        isDialog={true}
                                                                                        language={(match && match[1]) || ''}
                                                                                        value={String(children).replace(/\n$/, '')}
                                                                                        {...props}
                                                                                    />
                                                                                ) : (
                                                                                    <code className={className} {...props}>
                                                                                        {children}
                                                                                    </code>
                                                                                )
                                                                            }
                                                                        }}
                                                                    >
                                                                        {message.message}
                                                                    </MemoizedReactMarkdown>
                                                                </div>
                                                                {message.fileAnnotations && (
                                                                    <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                                                                        {message.fileAnnotations.map((fileAnnotation, index) => {
                                                                            return (
                                                                                <Button
                                                                                    sx={{
                                                                                        fontSize: '0.85rem',
                                                                                        textTransform: 'none',
                                                                                        mb: 1,
                                                                                        mr: 1
                                                                                    }}
                                                                                    key={index}
                                                                                    variant='outlined'
                                                                                    onClick={() => downloadFile(fileAnnotation)}
                                                                                    endIcon={
                                                                                        <IconDownload color={theme.palette.primary.main} />
                                                                                    }
                                                                                >
                                                                                    {fileAnnotation.fileName}
                                                                                </Button>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {message.sourceDocuments && (
                                                                    <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                                                                        {removeDuplicateURL(message).map((source, index) => {
                                                                            const URL =
                                                                                source.metadata && source.metadata.source
                                                                                    ? isValidURL(source.metadata.source)
                                                                                    : undefined
                                                                            return (
                                                                                <Chip
                                                                                    size='small'
                                                                                    key={index}
                                                                                    label={
                                                                                        URL
                                                                                            ? URL.pathname.substring(0, 15) === '/'
                                                                                                ? URL.host
                                                                                                : `${URL.pathname.substring(0, 15)}...`
                                                                                            : `${source.pageContent.substring(0, 15)}...`
                                                                                    }
                                                                                    component='a'
                                                                                    sx={{ mr: 1, mb: 1 }}
                                                                                    variant='outlined'
                                                                                    clickable
                                                                                    onClick={() =>
                                                                                        URL
                                                                                            ? onURLClick(source.metadata.source)
                                                                                            : onSourceDialogClick(source)
                                                                                    }
                                                                                />
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {message.type === 'apiMessage' && message.feedback ? (
                                                                    <Feedback
                                                                        content={message.feedback?.content || ''}
                                                                        rating={message.feedback?.rating}
                                                                    />
                                                                ) : null}
                                                            </div>
                                                        </Box>
                                                    )
                                                } else {
                                                    return (
                                                        <Box
                                                            sx={{
                                                                background: theme.palette.timeMessage.main,
                                                                p: 2
                                                            }}
                                                            key={index}
                                                            style={{ display: 'flex', justifyContent: 'center', alignContent: 'center' }}
                                                        >
                                                            {moment(message.message).format('MMMM Do YYYY, h:mm:ss a')}
                                                        </Box>
                                                    )
                                                }
                                            })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <SourceDocDialog show={sourceDialogOpen} dialogProps={sourceDialogProps} onCancel={() => setSourceDialogOpen(false)} />
                </>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ViewMessagesDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default ViewMessagesDialog
