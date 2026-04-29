import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import {
    Box,
    Button,
    Chip,
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
import { IconPlayerStop, IconRefresh, IconSend, IconX } from '@tabler/icons-react'
import remarkGfm from 'remark-gfm'
import { v4 as uuidv4 } from 'uuid'

import type { ExecutionStatus } from '@/core/types'
import { useAgentflowContext, useApiContext } from '@/infrastructure/store'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionElement {
    label: string
    type: string
}

interface ActionPayload {
    id?: string
    elements?: ActionElement[]
    data?: unknown
}

interface ChatMessage {
    id: string
    type: 'user' | 'bot'
    text: string
    error?: string
    action?: ActionPayload
}

interface NextAgentFlowPayload {
    nodeId: string
    status: ExecutionStatus
    error?: string
}

interface ExecutionDataItem {
    nodeId: string
    nodeLabel: string
    data: {
        name?: string
        input?: { question?: string; [k: string]: unknown }
        output?: { content?: string; question?: string; [k: string]: unknown }
        error?: string
    }
    status?: string
}

export interface TestFlowDialogProps {
    chatflowId: string
    open: boolean
    onClose: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE = 'Hi there! How can I help?'
const HISTORY_LIMIT = 10

// ─── Component ────────────────────────────────────────────────────────────────

export function TestFlowDialog({ chatflowId, open, onClose }: TestFlowDialogProps) {
    const theme = useTheme()
    const { setNodeExecutionStatus, clearExecutionState } = useAgentflowContext()
    const { apiBaseUrl, token, chatflowsApi, executionsApi } = useApiContext()

    const [messages, setMessages] = useState<ChatMessage[]>([{ id: uuidv4(), type: 'bot', text: WELCOME_MESSAGE }])
    const [userInput, setUserInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [followUpPrompts, setFollowUpPrompts] = useState<string[]>([])
    const [historyLoaded, setHistoryLoaded] = useState(false)

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

    // ── Load chat history on open ─────────────────────────────────────────────

    useEffect(() => {
        if (!open || historyLoaded) return

        async function loadHistory() {
            try {
                const page = await executionsApi.getAllExecutions({ agentflowId: chatflowId, limit: HISTORY_LIMIT })
                const executions = page.data
                if (!executions?.length) return

                // Restore the most recent session's chatId so the user continues it
                const latestSessionId = executions[0]?.sessionId
                if (latestSessionId) chatIdRef.current = latestSessionId

                const historyMessages: ChatMessage[] = []
                // executions arrive newest-first; reverse to show oldest first
                for (const execution of [...executions].reverse()) {
                    let executionData: ExecutionDataItem[] = []
                    try {
                        executionData =
                            typeof execution.executionData === 'string' ? (JSON.parse(execution.executionData) as ExecutionDataItem[]) : []
                    } catch {
                        continue
                    }

                    const startNode = executionData.find((e) => e.data?.name === 'startAgentflow')
                    const question = (startNode?.data?.input?.question ?? startNode?.data?.output?.question) as string | undefined

                    const lastWithContent = [...executionData].reverse().find((e) => e.data?.output?.content || e.data?.output?.question)
                    const answer = (lastWithContent?.data?.output?.content ?? lastWithContent?.data?.output?.question) as string | undefined

                    if (question) {
                        historyMessages.push({ id: `${execution.id}-user`, type: 'user', text: question })
                        if (answer && answer !== question) {
                            historyMessages.push({ id: `${execution.id}-bot`, type: 'bot', text: answer })
                        }
                    }
                }

                if (historyMessages.length > 0) {
                    setMessages((prev) => [...prev, ...historyMessages])
                }
            } catch {
                // history load is best-effort
            } finally {
                setHistoryLoaded(true)
            }
        }

        void loadHistory()
    }, [open, chatflowId, executionsApi, historyLoaded])

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleClear = useCallback(() => {
        abortControllerRef.current?.abort()
        chatIdRef.current = uuidv4()
        setMessages([{ id: uuidv4(), type: 'bot', text: WELCOME_MESSAGE }])
        setUserInput('')
        setLoading(false)
        setFollowUpPrompts([])
        setHistoryLoaded(false)
        clearExecutionState()
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [clearExecutionState])

    const handleClose = useCallback(() => {
        abortControllerRef.current?.abort()
        onClose()
    }, [onClose])

    const handleStop = useCallback(async () => {
        abortControllerRef.current?.abort()
        setLoading(false)
        try {
            await chatflowsApi.abortMessage(chatflowId, chatIdRef.current)
        } catch {
            // best-effort server abort
        }
    }, [chatflowId, chatflowsApi])

    const handleActionClick = useCallback(
        (elem: ActionElement, action: ActionPayload) => {
            // Clear the action buttons from the last bot message
            setMessages((prev) => {
                const last = prev[prev.length - 1]
                if (!last || last.type !== 'bot') return prev
                return [...prev.slice(0, -1), { ...last, action: undefined }]
            })
            void handleSendCore(elem.label, action)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    const handleSend = useCallback(() => {
        const input = userInput.trim()
        if (!input || loading) return
        setFollowUpPrompts([])
        void handleSendCore(input)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInput, loading])

    // Core SSE send — shared by handleSend, handleActionClick, follow-up prompt clicks
    const handleSendCore = useCallback(
        async (input: string, action?: ActionPayload) => {
            setUserInput('')
            setLoading(true)
            clearExecutionState()
            setMessages((prev) => [...prev, { id: uuidv4(), type: 'user', text: input }])

            const controller = new AbortController()
            abortControllerRef.current = controller

            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (token) {
                // API key auth: server validates via Authorization header
                headers['Authorization'] = `Bearer ${token}`
            } else {
                // Session cookie auth: server validates the JWT cookie
                headers['x-request-from'] = 'internal'
            }

            let botMsgAdded = false
            let nonStreamHandled = false

            const ensureBotMsg = () => {
                if (!botMsgAdded) {
                    botMsgAdded = true
                    setMessages((prev) => [...prev, { id: uuidv4(), type: 'bot', text: '' }])
                }
            }

            const body: Record<string, unknown> = { question: input, chatId: chatIdRef.current, streaming: true }
            if (action) body['action'] = action

            try {
                await fetchEventSource(`${apiBaseUrl}/api/v1/internal-prediction/${chatflowId}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                    signal: controller.signal,
                    openWhenHidden: true,

                    async onopen(response) {
                        if (!response.ok) {
                            const text = await response.text()
                            throw new Error(text || `HTTP ${response.status}`)
                        }
                        const contentType = response.headers.get('content-type') ?? ''
                        if (!contentType.startsWith(EventStreamContentType)) {
                            // Non-streaming response: parse the whole body as a message
                            const text = await response.text()
                            let answer = text
                            try {
                                const json = JSON.parse(text) as Record<string, unknown>
                                answer = (json['text'] as string) || (json['answer'] as string) || (json['content'] as string) || text
                            } catch {
                                // raw text
                            }
                            nonStreamHandled = true
                            ensureBotMsg()
                            setMessages((prev) => {
                                const last = prev[prev.length - 1]
                                if (!last || last.type !== 'bot') return prev
                                return [...prev.slice(0, -1), { ...last, text: answer }]
                            })
                            setLoading(false)
                            controller.abort()
                        }
                    },

                    onmessage(ev) {
                        let payload: { event: string; data: unknown }
                        try {
                            payload = JSON.parse(ev.data) as typeof payload
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

                            case 'agentFlowEvent': {
                                const flowPayload = payload.data as { status?: string }
                                const terminalStates = ['FINISHED', 'ERROR', 'STOPPED', 'TERMINATED']
                                if (flowPayload?.status && terminalStates.includes(flowPayload.status)) {
                                    setLoading(false)
                                }
                                break
                            }

                            case 'action':
                                setMessages((prev) => {
                                    const last = prev[prev.length - 1]
                                    if (!last || last.type !== 'bot') return prev
                                    return [...prev.slice(0, -1), { ...last, action: payload.data as ActionPayload }]
                                })
                                break

                            case 'metadata': {
                                const meta = payload.data as { chatId?: string; followUpPrompts?: string; chatMessageId?: string }
                                if (meta?.chatId) chatIdRef.current = meta.chatId
                                if (meta?.followUpPrompts) {
                                    try {
                                        const parsed: unknown = JSON.parse(meta.followUpPrompts)
                                        const prompts = typeof parsed === 'string' ? (JSON.parse(parsed) as string[]) : (parsed as string[])
                                        setFollowUpPrompts(Array.isArray(prompts) ? prompts : [])
                                    } catch {
                                        // ignore malformed follow-up prompts
                                    }
                                }
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
                        if (nonStreamHandled || err?.name === 'AbortError') return
                        ensureBotMsg()
                        setMessages((prev) => {
                            const last = prev[prev.length - 1]
                            if (!last || last.type !== 'bot') return prev
                            return [...prev.slice(0, -1), { ...last, error: (err as Error)?.message || 'Connection error' }]
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
        },
        [apiBaseUrl, chatflowId, token, setNodeExecutionStatus, clearExecutionState, scrollToBottom]
    )

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && userInput.trim()) {
            e.preventDefault()
            handleSend()
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

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
                                msg.type === 'bot' ? (
                                    <Typography variant='body2' component='div' sx={{ '& p': { m: 0 }, '& p + p': { mt: 1 } }}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                                    </Typography>
                                ) : (
                                    <Typography variant='body2'>{msg.text}</Typography>
                                )
                            ) : loading && msg.type === 'bot' ? (
                                <CircularProgress size={16} />
                            ) : null}

                            {msg.action?.elements && msg.action.elements.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                                    {msg.action.elements.map((elem, i) => (
                                        <Button
                                            key={i}
                                            size='small'
                                            variant='outlined'
                                            onClick={() => handleActionClick(elem, msg.action!)}
                                        >
                                            {elem.label}
                                        </Button>
                                    ))}
                                </Box>
                            )}
                        </Paper>
                    </Box>
                ))}

                {followUpPrompts.length > 0 && !loading && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pl: 1 }}>
                        {followUpPrompts.map((prompt, i) => (
                            <Chip
                                key={i}
                                label={prompt}
                                size='small'
                                variant='outlined'
                                onClick={() => {
                                    setFollowUpPrompts([])
                                    void handleSendCore(prompt)
                                }}
                                sx={{ cursor: 'pointer' }}
                            />
                        ))}
                    </Box>
                )}

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
                                <IconButton size='small' onClick={() => void handleStop()} title='Stop'>
                                    <IconPlayerStop size={18} />
                                </IconButton>
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
