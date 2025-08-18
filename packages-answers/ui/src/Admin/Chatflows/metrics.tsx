'use client'
import { useEffect, useState } from 'react'
import { Box, Typography, Grid, Chip, List, ListItem, ListItemText, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { format } from 'date-fns'
import 'react-datepicker/dist/react-datepicker.css'

// API imports
// @ts-ignore
import chatmessageApi from '@/api/chatmessage'
// @ts-ignore
import feedbackApi from '@/api/feedback'
import useApi from '@ui/hooks/useApi'

// Components
import DateRangePicker from '@ui/components/DateRangePicker'
import StatCard from '@ui/components/StatCard'

// Types
import { ChatMessage, ChatLog, Stats, MetricsProps } from './types'

const Metrics = ({ chatflowId }: MetricsProps) => {
    const theme = useTheme()

    const [chatlogs, setChatLogs] = useState<ChatLog[]>([])
    const [allChatlogs, setAllChatLogs] = useState<ChatMessage[]>([])
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [stats, setStats] = useState<Stats>({
        totalMessages: 0,
        totalFeedback: 0,
        positiveFeedback: 0,
        negativeFeedback: 0
    })
    const [selectedMessageIndex, setSelectedMessageIndex] = useState(0)
    const [selectedChatId, setSelectedChatId] = useState('')
    const [chatTypeFilter, setChatTypeFilter] = useState<string[]>([])
    const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string[]>([])
    const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)))
    const [endDate, setEndDate] = useState(new Date())
    const [leadEmail, setLeadEmail] = useState('')
    const [selectedChat, setSelectedChat] = useState<ChatLog | null>(null)
    const [isFilterExpanded, setIsFilterExpanded] = useState(true) // Default expanded for metrics

    // API hooks
    const {
        data: chatMessagesData,
        isLoading: chatMessagesLoading,
        isError: chatMessagesError,
        refresh: refreshChatMessages
    } = useApi(
        `/api/chatmessage/${chatflowId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&chatType=${chatTypeFilter.join(
            ','
        )}&feedbackType=${feedbackTypeFilter.join(',')}`,
        () =>
            chatmessageApi.getAllChatmessageFromChatflow(chatflowId, {
                startDate: startDate,
                endDate: endDate,
                chatType: chatTypeFilter.length ? chatTypeFilter : undefined,
                feedbackType: feedbackTypeFilter.length ? feedbackTypeFilter : undefined
            })
    )

    const {
        data: statsData,
        isLoading: statsLoading,
        isError: statsError,
        refresh: refreshStats
    } = useApi(
        `/api/stats/${chatflowId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&chatType=${chatTypeFilter.join(
            ','
        )}&feedbackType=${feedbackTypeFilter.join(',')}`,
        () =>
            feedbackApi.getStatsFromChatflow(chatflowId, {
                startDate: startDate,
                endDate: endDate,
                chatType: chatTypeFilter.length ? chatTypeFilter : undefined,
                feedbackType: feedbackTypeFilter.length ? feedbackTypeFilter : undefined
            })
    )

    const {
        data: selectedChatMessagesData,
        isLoading: selectedChatMessagesLoading,
        isError: selectedChatMessagesError,
        refresh: refreshSelectedChatMessages
    } = useApi(
        selectedChat
            ? `/api/chatmessage/${chatflowId}/selected?chatId=${selectedChat.chatId}&sessionId=${selectedChat.sessionId || ''}&memoryType=${
                  selectedChat.memoryType || ''
              }&feedbackType=${feedbackTypeFilter.join(',')}`
            : `/api/chatmessage/${chatflowId}/selected-empty`,
        () => {
            if (!selectedChat) return Promise.resolve({ data: [] })
            const params: any = { chatId: selectedChat.chatId }
            if (selectedChat.sessionId) params.sessionId = selectedChat.sessionId
            if (selectedChat.memoryType) params.memoryType = selectedChat.memoryType
            if (feedbackTypeFilter.length > 0) params.feedbackType = feedbackTypeFilter
            return chatmessageApi.getChatmessageFromPK(chatflowId, params)
        }
    )

    const onStartDateSelected = (date: Date) => {
        const updatedDate = new Date(date)
        updatedDate.setHours(0, 0, 0, 0)
        setStartDate(updatedDate)
        refreshChatMessages()
        refreshStats()
    }

    const onEndDateSelected = (date: Date) => {
        const updatedDate = new Date(date)
        updatedDate.setHours(23, 59, 59, 999)
        setEndDate(updatedDate)
        refreshChatMessages()
        refreshStats()
    }

    const onChatTypeSelected = (chatTypes: string[]) => {
        setChatTypeFilter(chatTypes)
        refreshChatMessages()
        refreshStats()
    }

    const onFeedbackTypeSelected = (feedbackTypes: string[]) => {
        setFeedbackTypeFilter(feedbackTypes)
        refreshChatMessages()
        refreshStats()
    }

    const handleItemClick = (chatlog: ChatLog, index: number) => {
        setSelectedMessageIndex(index)
        setSelectedChat(chatlog)
        refreshSelectedChatMessages()
    }

    const exportMessages = async () => {
        if (!allChatlogs.length) return

        const exportData = allChatlogs.map((msg) => ({
            content: msg.content,
            role: msg.role === 'apiMessage' ? 'bot' : 'user',
            time: msg.createdDate,
            chatId: msg.chatId,
            sessionId: msg.sessionId,
            memoryType: msg.memoryType,
            email: msg.leadEmail,
            sourceDocuments: msg.sourceDocuments,
            usedTools: msg.usedTools,
            feedback: msg.feedback,
            artifacts: msg.artifacts
        }))

        const dataStr = JSON.stringify(exportData, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const dataUri = URL.createObjectURL(blob)

        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', `${chatflowId}-messages.json`)
        linkElement.click()
    }

    const processChatLogs = (allChatMessages: ChatMessage[]) => {
        const seen: Record<string, any> = {}
        const filteredChatLogs: ChatLog[] = []

        for (let i = 0; i < allChatMessages.length; i += 1) {
            const chatmsg = allChatMessages[i]
            const PK = `${chatmsg.chatId}_${chatmsg.memoryType || 'null'}_${chatmsg.sessionId || 'null'}`

            if (!seen[PK]) {
                seen[PK] = {
                    counter: 1,
                    item: chatmsg
                }
            } else if (seen[PK].counter === 1) {
                seen[PK] = {
                    counter: 2,
                    item: {
                        ...seen[PK].item,
                        apiContent:
                            seen[PK].item.role === 'apiMessage' ? `Bot: ${seen[PK].item.content}` : `User: ${seen[PK].item.content}`,
                        userContent: chatmsg.role === 'apiMessage' ? `Bot: ${chatmsg.content}` : `User: ${chatmsg.content}`
                    }
                }
                filteredChatLogs.push(seen[PK].item)
            }
        }

        setChatLogs(filteredChatLogs)
        return filteredChatLogs.length ? filteredChatLogs[0] : null
    }

    const getChatMessages = (chatmessages: ChatMessage[]) => {
        let prevDate = ''
        const loadedMessages: ChatMessage[] = []

        for (let i = 0; i < chatmessages.length; i += 1) {
            const chatmsg = chatmessages[i]
            setSelectedChatId(chatmsg.chatId)

            if (!prevDate) {
                prevDate = chatmsg.createdDate.split('T')[0]
                loadedMessages.push({
                    id: `time-${i}`,
                    content: chatmsg.createdDate,
                    role: 'timeMessage',
                    createdDate: chatmsg.createdDate,
                    chatId: chatmsg.chatId,
                    chatflowid: chatmsg.chatflowid,
                    chatType: chatmsg.chatType
                })
            } else {
                const currentDate = chatmsg.createdDate.split('T')[0]
                if (currentDate !== prevDate) {
                    prevDate = currentDate
                    loadedMessages.push({
                        id: `time-${i}`,
                        content: chatmsg.createdDate,
                        role: 'timeMessage',
                        createdDate: chatmsg.createdDate,
                        chatId: chatmsg.chatId,
                        chatflowid: chatmsg.chatflowid,
                        chatType: chatmsg.chatType
                    })
                }
            }

            const obj = {
                ...chatmsg,
                message: chatmsg.content,
                type: chatmsg.role
            }
            loadedMessages.push(obj)
        }
        setChatMessages(loadedMessages)
    }

    // Handle API responses
    useEffect(() => {
        if (chatMessagesData) {
            setAllChatLogs(chatMessagesData)
            processChatLogs(chatMessagesData)
        }
    }, [chatMessagesData])

    useEffect(() => {
        if (statsData) {
            setStats(statsData)
        }
    }, [statsData])

    useEffect(() => {
        if (selectedChatMessagesData) {
            getChatMessages(selectedChatMessagesData)
        }
    }, [selectedChatMessagesData])

    // Extract lead email from chat messages
    useEffect(() => {
        const leadEmailFromChatMessages = chatMessages.filter((message) => message.type === 'userMessage' && message.leadEmail)
        if (leadEmailFromChatMessages.length) {
            setLeadEmail(leadEmailFromChatMessages[0].leadEmail || '')
        }
    }, [chatMessages, selectedMessageIndex])

    const renderMessageContent = (message: ChatMessage) => {
        if (message.type === 'timeMessage') {
            return (
                <Box
                    sx={{
                        background: theme.palette.grey[100],
                        p: 2,
                        textAlign: 'center',
                        color: theme.palette.text.secondary
                    }}
                >
                    {format(new Date(message.content), 'MMMM do yyyy, h:mm:ss a')}
                </Box>
            )
        }

        return (
            <Box
                sx={{
                    p: 2,
                    background: message.role === 'apiMessage' ? theme.palette.primary.light : theme.palette.background.paper,
                    borderBottom: `1px solid ${theme.palette.divider}`
                }}
            >
                <Typography variant='body2' sx={{ mb: 1, fontWeight: 'bold' }}>
                    {message.role === 'apiMessage' ? 'Bot' : 'User'}
                </Typography>
                <Typography variant='body2'>{message.content}</Typography>
                {message.feedback && (
                    <Box sx={{ mt: 1 }}>
                        <Chip
                            label={message.feedback.rating === 'THUMBS_UP' ? '👍' : '👎'}
                            size='small'
                            color={message.feedback.rating === 'THUMBS_UP' ? 'success' : 'error'}
                        />
                        {message.feedback.content && (
                            <Typography variant='caption' sx={{ ml: 1 }}>
                                {message.feedback.content}
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>
        )
    }

    return (
        <Box sx={{ p: 2, height: '100%', overflow: 'hidden' }}>
            {/* Header */}
            {/* <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IconButton
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': { color: 'rgba(255, 255, 255, 0.9)' },
                        transition: 'transform 0.2s ease-in-out',
                        transform: isFilterExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                >
                    <FilterListIcon />
                </IconButton>
            </Box> */}

            {/* Collapsible Filters */}
            <Box
                sx={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    bgcolor: 'rgba(0, 0, 0, 0.2)',

                    mb: 3
                }}
            >
                <Box
                    sx={{
                        maxHeight: isFilterExpanded ? '300px' : '0px',
                        overflow: 'hidden',
                        transition: 'max-height 0.3s ease-in-out',
                        borderBottom: isFilterExpanded ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                    }}
                >
                    <Box sx={{ p: 3 }}>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: 3,
                                alignItems: 'flex-start'
                            }}
                        >
                            <DateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onStartDateChange={onStartDateSelected}
                                onEndDateChange={onEndDateSelected}
                            />
                            <Box>
                                <Typography variant='body2' sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Source
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Chip
                                        label='UI'
                                        onClick={() => onChatTypeSelected(chatTypeFilter.includes('INTERNAL') ? [] : ['INTERNAL'])}
                                        color={chatTypeFilter.includes('INTERNAL') ? 'primary' : 'default'}
                                        variant={chatTypeFilter.includes('INTERNAL') ? 'filled' : 'outlined'}
                                    />
                                    <Chip
                                        label='API/Embed'
                                        onClick={() => onChatTypeSelected(chatTypeFilter.includes('EXTERNAL') ? [] : ['EXTERNAL'])}
                                        color={chatTypeFilter.includes('EXTERNAL') ? 'primary' : 'default'}
                                        variant={chatTypeFilter.includes('EXTERNAL') ? 'filled' : 'outlined'}
                                    />
                                </Box>
                            </Box>
                            <Box>
                                <Typography variant='body2' sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Feedback
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Chip
                                        label='Positive'
                                        onClick={() =>
                                            onFeedbackTypeSelected(feedbackTypeFilter.includes('THUMBS_UP') ? [] : ['THUMBS_UP'])
                                        }
                                        color={feedbackTypeFilter.includes('THUMBS_UP') ? 'success' : 'default'}
                                        variant={feedbackTypeFilter.includes('THUMBS_UP') ? 'filled' : 'outlined'}
                                    />
                                    <Chip
                                        label='Negative'
                                        onClick={() =>
                                            onFeedbackTypeSelected(feedbackTypeFilter.includes('THUMBS_DOWN') ? [] : ['THUMBS_DOWN'])
                                        }
                                        color={feedbackTypeFilter.includes('THUMBS_DOWN') ? 'error' : 'default'}
                                        variant={feedbackTypeFilter.includes('THUMBS_DOWN') ? 'filled' : 'outlined'}
                                    />
                                </Box>
                            </Box>
                            <Box>
                                <Typography variant='body2' sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Export
                                </Typography>
                                <IconButton
                                    onClick={exportMessages}
                                    disabled={!allChatlogs.length}
                                    sx={{
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        '&:hover': {
                                            color: 'rgba(255, 255, 255, 0.9)'
                                        },
                                        '&.Mui-disabled': {
                                            color: 'rgba(255, 255, 255, 0.3)'
                                        }
                                    }}
                                    title='Export Messages'
                                >
                                    <FileDownloadIcon />
                                </IconButton>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={3}>
                    <StatCard title='Total Messages' value={statsLoading ? '...' : stats.totalMessages} loading={statsLoading} />
                </Grid>
                <Grid item xs={3}>
                    <StatCard title='Total Chats' value={chatMessagesLoading ? '...' : chatlogs.length} loading={chatMessagesLoading} />
                </Grid>
                <Grid item xs={3}>
                    <StatCard title='Total Feedback' value={statsLoading ? '...' : stats.totalFeedback} loading={statsLoading} />
                </Grid>
                <Grid item xs={3}>
                    <StatCard
                        title='Positive Feedback'
                        value={statsLoading ? '...' : `${((stats.positiveFeedback / stats.totalFeedback) * 100 || 0).toFixed(1)}%`}
                        loading={statsLoading}
                    />
                </Grid>
            </Grid>

            {/* Content */}
            <Box sx={{ display: 'flex', height: 'calc(100vh - 400px)', gap: 2 }}>
                {/* Chat Logs */}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Typography variant='h6' sx={{ mb: 2, color: '#fff' }}>
                        Chat Sessions
                    </Typography>
                    <Box
                        sx={{
                            height: '100%',
                            overflow: 'auto',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 2,

                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        {chatMessagesLoading ? (
                            <Box sx={{ p: 2 }}>
                                <Typography>Loading chat sessions...</Typography>
                            </Box>
                        ) : chatlogs.length === 0 ? (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>No chat sessions found</Typography>
                            </Box>
                        ) : (
                            <List>
                                {chatlogs.map((chatlog, index) => (
                                    <ListItem
                                        key={index}
                                        button
                                        selected={selectedMessageIndex === index}
                                        onClick={() => handleItemClick(chatlog, index)}
                                        sx={{
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                            '&.Mui-selected': {
                                                background: 'rgba(255, 255, 255, 0.1)'
                                            }
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Typography variant='body2' sx={{ color: '#fff' }}>
                                                    {format(new Date(chatlog.createdDate), 'MMMM d, yyyy H:mm a')}
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography variant='caption' sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                                    Session ID: {chatlog?.sessionId ?? 'Unknown'}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Typography variant='h6' sx={{ mb: 2, color: '#fff' }}>
                        Messages
                    </Typography>
                    <Box
                        sx={{
                            height: '100%',
                            overflow: 'auto',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 2,
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        {selectedChatMessagesLoading ? (
                            <Box sx={{ p: 2 }}>
                                <Typography>Loading messages...</Typography>
                            </Box>
                        ) : chatMessages.length === 0 ? (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Select a chat session to view messages</Typography>
                            </Box>
                        ) : (
                            <Box>
                                {chatMessages.map((message, index) => (
                                    <Box key={index}>{renderMessageContent(message)}</Box>
                                ))}
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}

export default Metrics
