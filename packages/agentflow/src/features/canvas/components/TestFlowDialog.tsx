import { useCallback, useEffect, useRef, useState } from 'react'

import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import {
    Box,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    OutlinedInput,
    Paper,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconRefresh, IconSend, IconX } from '@tabler/icons-react'
import { v4 as uuidv4 } from 'uuid'

import type { ExecutionStatus } from '@/core/types'
import { useAgentflowContext, useApiContext } from '@/infrastructure/store'

interface ChatMessage {
    id: string
    type: 'user' | 'bot'
    text: string
    error?: string
}

interface NextAgentFlowPayload {
    nodeId: string
    status: ExecutionStatus
    error?: string
}

export interface TestFlowDialogProps {
    chatflowId: string
    open: boolean
    onClose: () => void
}

const WELCOME_MESSAGE = 'Hi there! How can I help?'

export function TestFlowDialog({ chatflowId, open, onClose }: TestFlowDialogProps) {
    const theme = useTheme()
    const { setNodeExecutionStatus, clearExecutionState } = useAgentflowContext()
    const { apiBaseUrl, token } = useApiContext()

    const [messages, setMessages] = useState<ChatMessage[]>([{ id: uuidv4(), type: 'bot', text: WELCOME_MESSAGE }])
    const [userInput, setUserInput] = useState('')
    const [loading, setLoading] = useState(false)
    const chatIdRef = useRef(uuidv4())

    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    const scrollToBottom = useCallback(() => {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    const handleClear = useCallback(() => {
        abortControllerRef.current?.abort()
        chatIdRef.current = uuidv4()
        setMessages([{ id: uuidv4(), type: 'bot', text: WELCOME_MESSAGE }])
        setUserInput('')
        setLoading(false)
        clearExecutionState()
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [clearExecutionState])

    const handleClose = useCallback(() => {
        abortControllerRef.current?.abort()
        onClose()
    }, [onClose])

    const handleSend = useCallback(async () => {
        const input = userInput.trim()
        if (!input || loading) return

        setUserInput('')
        setLoading(true)
        clearExecutionState()
        setMessages((prev) => [...prev, { id: uuidv4(), type: 'user', text: input }])

        const controller = new AbortController()
        abortControllerRef.current = controller

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-request-from': 'internal'
        }
        if (token) headers['Authorization'] = `Bearer ${token}`

        let botMsgAdded = false
        const ensureBotMsg = () => {
            if (!botMsgAdded) {
                botMsgAdded = true
                setMessages((prev) => [...prev, { id: uuidv4(), type: 'bot', text: '' }])
            }
        }

        try {
            await fetchEventSource(`${apiBaseUrl}/api/v1/internal-prediction/${chatflowId}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ question: input, chatId: chatIdRef.current, streaming: true }),
                signal: controller.signal,
                openWhenHidden: true,
                async onopen(response) {
                    if (!response.ok || !response.headers.get('content-type')?.startsWith(EventStreamContentType)) {
                        const text = await response.text()
                        throw new Error(text || `HTTP ${response.status}`)
                    }
                },
                onmessage(ev) {
                    let payload: { event: string; data: unknown }
                    try {
                        payload = JSON.parse(ev.data)
                    } catch {
                        return
                    }
                    switch (payload.event) {
                        case 'start':
                            ensureBotMsg()
                            break
                        case 'token':
                            ensureBotMsg()
                            setMessages((prev) => {
                                const last = prev[prev.length - 1]
                                if (!last || last.type !== 'bot') return prev
                                return [...prev.slice(0, -1), { ...last, text: last.text + (payload.data as string) }]
                            })
                            break
                        case 'nextAgentFlow': {
                            const { nodeId, status, error } = payload.data as NextAgentFlowPayload
                            setNodeExecutionStatus(nodeId, status, error)
                            break
                        }
                        case 'end':
                            setLoading(false)
                            setTimeout(() => inputRef.current?.focus(), 100)
                            break
                        case 'error':
                            ensureBotMsg()
                            setMessages((prev) => {
                                const last = prev[prev.length - 1]
                                if (!last || last.type !== 'bot') return prev
                                return [...prev.slice(0, -1), { ...last, error: String(payload.data) }]
                            })
                            setLoading(false)
                            break
                        case 'abort':
                            setLoading(false)
                            break
                    }
                    scrollToBottom()
                },
                onclose() {
                    setLoading(false)
                },
                onerror(err) {
                    if (err?.name === 'AbortError') return
                    ensureBotMsg()
                    setMessages((prev) => {
                        const last = prev[prev.length - 1]
                        if (!last || last.type !== 'bot') return prev
                        return [...prev.slice(0, -1), { ...last, error: err?.message || 'Connection error' }]
                    })
                    setLoading(false)
                    throw err // prevent fetchEventSource from retrying
                }
            })
        } catch (err) {
            if ((err as Error)?.name !== 'AbortError') {
                setLoading(false)
            }
        }
    }, [userInput, loading, apiBaseUrl, chatflowId, token, setNodeExecutionStatus, clearExecutionState, scrollToBottom])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && userInput.trim()) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth='sm'
            PaperProps={{ sx: { height: '70vh', maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, px: 2 }}>
                <Typography variant='h4' component='span'>
                    Test Flow
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size='small' onClick={handleClear} title='Clear chat'>
                        <IconRefresh size={18} />
                    </IconButton>
                    <IconButton size='small' onClick={handleClose} title='Close'>
                        <IconX size={18} />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    p: 2
                }}
            >
                {messages.map((msg) => (
                    <Box key={msg.id} sx={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
                        <Paper
                            elevation={0}
                            sx={{
                                px: 2,
                                py: 1,
                                maxWidth: '80%',
                                backgroundColor: msg.error
                                    ? theme.palette.error.light
                                    : msg.type === 'user'
                                    ? theme.palette.primary.main
                                    : theme.palette.action.hover,
                                color: msg.error ? theme.palette.error.contrastText : msg.type === 'user' ? '#fff' : 'inherit',
                                borderRadius: msg.type === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap'
                            }}
                        >
                            {msg.error ? (
                                <Typography variant='body2'>Error: {msg.error}</Typography>
                            ) : msg.text ? (
                                <Typography variant='body2'>{msg.text}</Typography>
                            ) : loading && msg.type === 'bot' ? (
                                <CircularProgress size={16} />
                            ) : null}
                        </Paper>
                    </Box>
                ))}
                <div ref={bottomRef} />
            </DialogContent>

            <Box sx={{ p: 2, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
                <OutlinedInput
                    inputRef={inputRef}
                    fullWidth
                    size='small'
                    multiline
                    maxRows={4}
                    placeholder='Type a message...'
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    endAdornment={
                        <InputAdornment position='end'>
                            {loading ? (
                                <CircularProgress size={20} />
                            ) : (
                                <IconButton size='small' onClick={handleSend} disabled={!userInput.trim()} edge='end'>
                                    <IconSend size={18} />
                                </IconButton>
                            )}
                        </InputAdornment>
                    }
                />
            </Box>
        </Dialog>
    )
}
