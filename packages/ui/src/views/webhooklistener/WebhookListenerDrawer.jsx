import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { keyframes } from '@mui/system'

// MUI
import { Box, Button, Chip, Collapse, Divider, Drawer, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
    IconAntennaBars5,
    IconArrowsMaximize,
    IconArrowsMinimize,
    IconChevronRight,
    IconCircleCheck,
    IconCopy,
    IconLoader2,
    IconRefresh,
    IconX
} from '@tabler/icons-react'
import DragHandleIcon from '@mui/icons-material/DragHandle'

// project
import { baseURL } from '@/store/constant'
import { flowContext } from '@/store/context/ReactFlowContext'
import webhookListenerApi from '@/api/webhooklistener'
import { MemoizedReactMarkdown } from '@/ui-component/markdown/MemoizedReactMarkdown'
import AgentExecutedDataCard from '@/views/chatmessage/AgentExecutedDataCard'

// ─── Geometry ─────────────────────────────────────────────────────────────────
const MIN_W = 380
const DEFAULT_W = 460
const MAX_W = typeof window !== 'undefined' ? Math.min(900, window.innerWidth - 80) : 900

// Mono stack tuned for code blocks; inherits weight/size from the parent.
const MONO_STACK = `'SFMono-Regular', ui-monospace, Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace`

// ─── Animations ───────────────────────────────────────────────────────────────
const sonar = keyframes`
    0% { transform: scale(0.4); opacity: 0.9; }
    100% { transform: scale(2.4); opacity: 0; }
`
const subtleBlink = keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
`
const spin = keyframes`
    to { transform: rotate(360deg); }
`

// ─── Status palette ───────────────────────────────────────────────────────────
const STATUS_META = {
    connecting: { label: 'CONNECTING', tone: 'info' },
    idle: { label: 'IDLE', tone: 'default' },
    listening: { label: 'LISTENING', tone: 'success' },
    running: { label: 'RUNNING', tone: 'warning' },
    done: { label: 'COMPLETED', tone: 'success' },
    stopped: { label: 'STOPPED', tone: 'info' },
    error: { label: 'ERROR', tone: 'error' }
}

const TONE_COLOR = (theme, tone) => {
    if (tone === 'success') return theme.palette.success.main
    if (tone === 'warning') return theme.palette.warning.main
    if (tone === 'error') return theme.palette.error.main
    if (tone === 'info') return theme.palette.info.main
    return theme.palette.grey[500]
}

// ─── Small atoms ──────────────────────────────────────────────────────────────
const Caption = ({ children }) => (
    <Typography
        component='div'
        sx={{
            fontFamily: MONO_STACK,
            fontSize: 10.5,
            letterSpacing: '0.14em',
            color: 'text.secondary',
            textTransform: 'uppercase',
            mb: 1
        }}
    >
        {children}
    </Typography>
)
Caption.propTypes = { children: PropTypes.node }

const StatusPill = ({ status }) => {
    const theme = useTheme()
    const meta = STATUS_META[status] ?? STATUS_META.idle
    const color = TONE_COLOR(theme, meta.tone)
    const animated = status === 'listening' || status === 'running'
    return (
        <Stack
            direction='row'
            alignItems='center'
            spacing={1}
            sx={{
                px: 1.25,
                py: 0.4,
                borderRadius: 999,
                bgcolor: alpha(color, 0.12),
                border: `1px solid ${alpha(color, 0.35)}`,
                color
            }}
        >
            <Box
                sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: color,
                    boxShadow: `0 0 8px ${alpha(color, 0.7)}`,
                    animation: animated ? `${subtleBlink} 1.4s ease-in-out infinite` : 'none'
                }}
            />
            <Typography sx={{ fontFamily: MONO_STACK, fontSize: 10.5, letterSpacing: '0.12em', fontWeight: 600 }}>{meta.label}</Typography>
        </Stack>
    )
}
StatusPill.propTypes = { status: PropTypes.string.isRequired }

const SonarIdle = () => {
    const theme = useTheme()
    const accent = theme.palette.success.main
    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                py: 6
            }}
        >
            {[0, 0.5, 1].map((delay, i) => (
                <Box
                    key={i}
                    sx={{
                        position: 'absolute',
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        border: `2px solid ${alpha(accent, 0.6)}`,
                        animation: `${sonar} 2.4s ease-out infinite`,
                        animationDelay: `${delay}s`
                    }}
                />
            ))}
            <Box
                sx={{
                    position: 'relative',
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(accent, 0.28)} 0%, ${alpha(accent, 0)} 70%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: accent
                }}
            >
                <IconAntennaBars5 size={26} stroke={2.2} />
            </Box>
        </Box>
    )
}

// ─── Endpoint block ───────────────────────────────────────────────────────────

const EndpointBlock = ({ method, url, isDark, onCopy }) => {
    const theme = useTheme()
    const [showCurl, setShowCurl] = useState(false)
    const [copied, setCopied] = useState(false)
    const [copiedCurl, setCopiedCurl] = useState(false)
    const iconColor = isDark ? 'common.white' : 'text.primary'

    const curl = useMemo(
        () => `curl -X ${method} '${url}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{ "question": "Hello from cURL" }'`,
        [method, url]
    )

    const copy = (text, setter) => {
        if (!text) return
        navigator.clipboard.writeText(text).then(() => {
            setter(true)
            setTimeout(() => setter(false), 1500)
        })
        if (onCopy) onCopy()
    }

    return (
        <Box>
            <Box
                sx={{
                    fontFamily: MONO_STACK,
                    fontSize: 12,
                    bgcolor: alpha(theme.palette.text.primary, 0.04),
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}
            >
                <Chip
                    label={method}
                    size='small'
                    sx={{
                        height: 20,
                        fontFamily: MONO_STACK,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        '& .MuiChip-label': { px: 1 }
                    }}
                />
                <Box
                    sx={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'text.primary'
                    }}
                    title={url}
                >
                    {url}
                </Box>
                <Tooltip title={copied ? 'Copied' : 'Copy URL'}>
                    <IconButton size='small' onClick={() => copy(url, setCopied)} sx={{ p: 0.5, color: iconColor }}>
                        {copied ? <IconCircleCheck size={14} color={theme.palette.success.main} /> : <IconCopy size={14} />}
                    </IconButton>
                </Tooltip>
            </Box>

            <Box sx={{ mt: 1 }}>
                <Button
                    size='small'
                    onClick={() => setShowCurl((v) => !v)}
                    startIcon={
                        <IconChevronRight
                            size={14}
                            style={{ transform: showCurl ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}
                        />
                    }
                    sx={{
                        textTransform: 'none',
                        color: isDark ? alpha('#fff', 0.75) : 'text.secondary',
                        fontSize: 12,
                        py: 0.25,
                        '&:hover': { bgcolor: 'transparent', color: isDark ? 'common.white' : 'text.primary' }
                    }}
                >
                    cURL example
                </Button>
                <Collapse in={showCurl} timeout='auto' unmountOnExit>
                    <Box
                        sx={{
                            position: 'relative',
                            mt: 0.5,
                            fontFamily: MONO_STACK,
                            fontSize: 11.5,
                            lineHeight: 1.55,
                            bgcolor: alpha(theme.palette.text.primary, 0.06),
                            color: 'text.primary',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1.5,
                            p: 1.5,
                            pr: 4.5,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}
                    >
                        {curl}
                        <Tooltip title={copiedCurl ? 'Copied' : 'Copy cURL'}>
                            <IconButton
                                size='small'
                                onClick={() => copy(curl, setCopiedCurl)}
                                sx={{ position: 'absolute', top: 6, right: 6, p: 0.5, color: iconColor }}
                            >
                                {copiedCurl ? <IconCircleCheck size={14} color={theme.palette.success.main} /> : <IconCopy size={14} />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Collapse>
            </Box>
        </Box>
    )
}
EndpointBlock.propTypes = {
    method: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    isDark: PropTypes.bool,
    onCopy: PropTypes.func
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

const WebhookListenerDrawer = ({ open, chatflowid, onClose, onStatusChange }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const isDark = customization?.isDarkMode
    const { onAgentflowNodeStatusUpdate, clearAgentflowNodeStatus } = useContext(flowContext)

    // ── State machine: connecting → listening → running → done|stopped|error → listening (auto-reset)
    const [status, setStatus] = useState('idle')
    // Raw engine status from agentFlowEvent — passed to AgentExecutedDataCard for proper icon/state
    // (FINISHED / INPROGRESS / STOPPED / TERMINATED / ERROR / TIMEOUT)
    const [flowStatus, setFlowStatus] = useState(null)
    const [executionChatId, setExecutionChatId] = useState(null)
    const [finalMessage, setFinalMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState(null)
    const [executedData, setExecutedData] = useState(null)
    const [startedAt, setStartedAt] = useState(null)
    const [finishedAt, setFinishedAt] = useState(null)
    const [width, setWidth] = useState(DEFAULT_W)
    const [maximized, setMaximized] = useState(false)

    // Refs for lifecycle objects (the EventSource and abort controller)
    const abortRef = useRef(null)
    const listenerIdRef = useRef(null)

    // Keep parent FAB pulse in sync with internal status
    useEffect(() => {
        if (onStatusChange) onStatusChange(status)
    }, [status, onStatusChange])

    // ── Webhook URL (mirrors NodeInputHandler.jsx:843 derivation)
    const method = useMemo(() => {
        // Try to look up the webhookMethod from the loaded canvas; fall back to POST
        // This is best-effort — the user can always override by sending whatever the Start node accepts.
        return 'POST'
    }, [])
    const webhookUrl = chatflowid ? `${baseURL}/api/v1/webhook/${chatflowid}` : ''

    // ── Reset visible run state but keep the connection open and listening
    const resetRun = useCallback(() => {
        setFinalMessage('')
        setErrorMessage(null)
        setExecutedData(null)
        setFlowStatus(null)
        setExecutionChatId(null)
        setStartedAt(null)
        setFinishedAt(null)
        clearAgentflowNodeStatus?.()
    }, [clearAgentflowNodeStatus])

    // ── Forward per-node status updates to the canvas only — the drawer renders the trace
    // through AgentExecutedDataCard using the engine's executedData stream.
    const applyNodeStatus = useCallback(
        (data) => {
            if (!data || !data.nodeId) return
            try {
                onAgentflowNodeStatusUpdate?.(data)
            } catch {
                /* canvas might not be mounted yet — ignore */
            }
        },
        [onAgentflowNodeStatusUpdate]
    )

    // ── Open the SSE connection (call after register())
    const openStream = useCallback(
        async (id) => {
            const ctrl = new AbortController()
            abortRef.current = ctrl

            try {
                await fetchEventSource(`${baseURL}/api/v1/webhook-listener/${chatflowid}/stream/${id}`, {
                    openWhenHidden: true,
                    signal: ctrl.signal,
                    headers: { 'x-request-from': 'internal' },
                    async onopen() {
                        // Server sends `listenerReady` as the first event — flip to listening there
                    },
                    async onmessage(ev) {
                        if (!ev.data) return
                        let payload
                        try {
                            payload = JSON.parse(ev.data)
                        } catch {
                            return
                        }
                        switch (payload.event) {
                            case 'listenerReady':
                                setStatus('listening')
                                break
                            case 'metadata':
                                if (payload.data?.chatId) setExecutionChatId(payload.data.chatId)
                                break
                            case 'agentFlowEvent': {
                                const v = payload.data
                                setFlowStatus(v)
                                if (v === 'INPROGRESS') {
                                    resetRun()
                                    setFlowStatus('INPROGRESS')
                                    setStartedAt(Date.now())
                                    setStatus('running')
                                } else if (v === 'FINISHED') {
                                    setFinishedAt(Date.now())
                                    setStatus('done')
                                } else if (v === 'STOPPED' || v === 'TERMINATED') {
                                    // Human-input pause — the flow is paused, awaiting input. Not a failure.
                                    setFinishedAt(Date.now())
                                    setStatus('stopped')
                                } else if (v === 'ERROR' || v === 'TIMEOUT') {
                                    setFinishedAt(Date.now())
                                    setStatus('error')
                                }
                                break
                            }
                            case 'nextAgentFlow':
                                applyNodeStatus(payload.data)
                                break
                            case 'agentFlowExecutedData':
                                setExecutedData(payload.data)
                                // Pull the assistant text out of the last node's output, if present
                                if (Array.isArray(payload.data) && payload.data.length) {
                                    const last = payload.data[payload.data.length - 1]
                                    const text = last?.data?.output?.content ?? last?.data?.output?.text
                                    if (typeof text === 'string') setFinalMessage(text)
                                }
                                break
                            case 'token':
                                if (typeof payload.data === 'string') setFinalMessage((m) => m + payload.data)
                                break
                            case 'error':
                                setErrorMessage(typeof payload.data === 'string' ? payload.data : 'Execution error')
                                setStatus('error')
                                break
                            case 'executionEnd':
                                // Mirror finalize — promote to terminal state if we missed agentFlowEvent
                                setStatus((s) => (s === 'running' ? 'done' : s))
                                if (!finishedAt) setFinishedAt(Date.now())
                                break
                            case 'end':
                                // Source SSE closed — we ignore on the listener side; the listener stays open
                                break
                            default:
                                break
                        }
                    },
                    async onerror(err) {
                        // Surface as 'error' but let fetch-event-source retry connect transparently
                        // unless the user closed the drawer (signal aborted).
                        if (ctrl.signal.aborted) throw err
                    }
                })
            } catch (err) {
                if (!ctrl.signal.aborted) {
                    setErrorMessage(err?.message || 'Listener disconnected')
                    setStatus('error')
                }
            }
        },
        [chatflowid, applyNodeStatus, resetRun, finishedAt]
    )

    // ── Lifecycle: register listener on open, tear down on close
    useEffect(() => {
        if (!open || !chatflowid) return

        let cancelled = false
        setStatus('connecting')
        ;(async () => {
            try {
                const resp = await webhookListenerApi.register(chatflowid)
                const id = resp?.data?.listenerId
                if (cancelled || !id) return
                listenerIdRef.current = id
                openStream(id)
            } catch (err) {
                if (cancelled) return
                setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to register listener')
                setStatus('error')
            }
        })()

        return () => {
            cancelled = true
            abortRef.current?.abort()
            const id = listenerIdRef.current
            if (id) {
                webhookListenerApi.unregister(chatflowid, id).catch(() => {})
                listenerIdRef.current = null
            }
            setStatus('idle')
            resetRun()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, chatflowid])

    // ── Drag-to-resize (left edge)
    const onMouseMove = useCallback((e) => {
        const newWidth = document.body.offsetWidth - e.clientX
        if (newWidth >= MIN_W && newWidth <= MAX_W) setWidth(newWidth)
    }, [])
    const onMouseUp = useCallback(() => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
    }, [onMouseMove])
    const onMouseDown = useCallback(() => {
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'ew-resize'
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }, [onMouseMove, onMouseUp])

    const elapsed = useMemo(() => {
        if (!startedAt) return null
        const end = finishedAt ?? Date.now()
        const ms = end - startedAt
        if (ms < 1000) return `${ms}ms`
        return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 2)}s`
    }, [startedAt, finishedAt])

    const drawerWidth = maximized ? Math.min(720, MAX_W) : width

    return (
        <Drawer
            anchor='right'
            open={open}
            onClose={onClose}
            variant='persistent'
            hideBackdrop
            PaperProps={{
                sx: {
                    width: drawerWidth,
                    top: 70,
                    height: 'calc(100vh - 70px)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: `1px solid ${theme.palette.divider}`,
                    boxShadow: isDark ? '-8px 0 24px rgba(0,0,0,0.45)' : '-8px 0 24px rgba(15,23,42,0.06)',
                    bgcolor: isDark ? alpha('#0a0f1a', 0.95) : theme.palette.background.paper,
                    backdropFilter: 'saturate(140%) blur(8px)',
                    transition: 'width 180ms ease'
                }
            }}
            sx={{
                // The drawer renders inside its own positioning context — no Modal, so the canvas
                // remains fully interactive while the panel is open.
                pointerEvents: 'none',
                '& .MuiDrawer-paper': { pointerEvents: 'auto' }
            }}
        >
            {/* Resize handle */}
            <button
                aria-label='Resize panel'
                onMouseDown={onMouseDown}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 6,
                    cursor: 'ew-resize',
                    border: 'none',
                    background: 'transparent',
                    zIndex: 2,
                    padding: 0
                }}
            >
                <DragHandleIcon
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: -4,
                        transform: 'translateY(-50%) rotate(90deg)',
                        fontSize: 16,
                        color: 'text.disabled',
                        opacity: 0,
                        transition: 'opacity 120ms',
                        '*:hover > &': { opacity: 1 }
                    }}
                />
            </button>

            {/* ─── Header ───────────────────────────────────────────────── */}
            <Box
                sx={{
                    px: 2.5,
                    pt: 2,
                    pb: 1.75,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    background: isDark
                        ? `linear-gradient(180deg, ${alpha(theme.palette.success.dark, 0.08)} 0%, transparent 100%)`
                        : `linear-gradient(180deg, ${alpha(theme.palette.success.light, 0.18)} 0%, transparent 100%)`
                }}
            >
                <Stack direction='row' alignItems='center' spacing={1.25} sx={{ mb: 1.5 }}>
                    <Box
                        sx={{
                            width: 26,
                            height: 26,
                            borderRadius: '6px',
                            bgcolor: alpha(theme.palette.success.main, 0.18),
                            color: theme.palette.success.main,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <IconAntennaBars5 size={16} stroke={2.4} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            sx={{
                                fontFamily: MONO_STACK,
                                fontSize: 10,
                                letterSpacing: '0.18em',
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                lineHeight: 1
                            }}
                        >
                            Webhook Listener
                        </Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 0.25, color: 'text.primary' }}>Live observatory</Typography>
                    </Box>
                    <Tooltip title={maximized ? 'Restore width' : 'Expand'}>
                        <IconButton
                            size='small'
                            onClick={() => setMaximized((v) => !v)}
                            sx={{ color: isDark ? 'common.white' : 'text.primary' }}
                        >
                            {maximized ? <IconArrowsMinimize size={16} /> : <IconArrowsMaximize size={16} />}
                        </IconButton>
                    </Tooltip>
                    <IconButton size='small' onClick={onClose} aria-label='close' sx={{ color: isDark ? 'common.white' : 'text.primary' }}>
                        <IconX size={16} />
                    </IconButton>
                </Stack>

                <Stack direction='row' alignItems='center' spacing={1.5}>
                    <StatusPill status={status} />
                    {elapsed && <Typography sx={{ fontFamily: MONO_STACK, fontSize: 11, color: 'text.secondary' }}>{elapsed}</Typography>}
                    {executionChatId && (
                        <Tooltip title={`chatId: ${executionChatId}`}>
                            <Typography
                                sx={{
                                    fontFamily: MONO_STACK,
                                    fontSize: 10.5,
                                    color: 'text.disabled',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 140
                                }}
                            >
                                {executionChatId.slice(0, 8)}…
                            </Typography>
                        </Tooltip>
                    )}
                </Stack>
            </Box>

            {/* ─── Body ─────────────────────────────────────────────────── */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
                {/* Endpoint */}
                <Box sx={{ mb: 3 }}>
                    <Caption>Endpoint</Caption>
                    <EndpointBlock method={method} url={webhookUrl} isDark={isDark} />
                </Box>

                <Divider sx={{ my: 2.5, opacity: 0.6 }} />

                {/* Process flow — same expandable tree the chat panel uses, with per-node JSON drilldown */}
                <Box sx={{ mb: 3 }}>
                    <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 1 }}>
                        <Caption>Process flow</Caption>
                        {status === 'running' && (
                            <Typography sx={{ fontFamily: MONO_STACK, fontSize: 10, color: 'warning.main' }}>streaming…</Typography>
                        )}
                    </Stack>

                    {executedData && Array.isArray(executedData) && executedData.length > 0 ? (
                        <AgentExecutedDataCard
                            status={flowStatus}
                            execution={executedData}
                            agentflowId={chatflowid}
                            sessionId={executionChatId}
                        />
                    ) : status === 'listening' ? (
                        <Box sx={{ textAlign: 'center' }}>
                            <SonarIdle />
                            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>
                                Waiting for an incoming webhook request…
                            </Typography>
                            <Typography sx={{ fontFamily: MONO_STACK, fontSize: 10.5, color: 'text.disabled', mt: 0.5 }}>
                                Send a {method} to the endpoint above to trigger the flow.
                            </Typography>
                        </Box>
                    ) : status === 'connecting' ? (
                        <Stack direction='row' alignItems='center' spacing={1} sx={{ color: 'text.secondary' }}>
                            <IconLoader2 size={14} style={{ animation: `${spin} 0.9s linear infinite` }} />
                            <Typography sx={{ fontSize: 12 }}>Opening event stream…</Typography>
                        </Stack>
                    ) : status === 'running' ? (
                        <Stack direction='row' alignItems='center' spacing={1} sx={{ color: 'text.secondary' }}>
                            <IconLoader2 size={14} style={{ animation: `${spin} 0.9s linear infinite` }} />
                            <Typography sx={{ fontSize: 12 }}>Flow started — first node executing…</Typography>
                        </Stack>
                    ) : status === 'error' ? (
                        <Box
                            sx={{
                                border: `1px solid ${alpha(theme.palette.error.main, 0.4)}`,
                                bgcolor: alpha(theme.palette.error.main, 0.08),
                                color: 'error.main',
                                borderRadius: 1.5,
                                px: 1.5,
                                py: 1,
                                fontSize: 12,
                                fontFamily: MONO_STACK
                            }}
                        >
                            {errorMessage || 'Listener error'}
                        </Box>
                    ) : (
                        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>
                    )}
                </Box>

                {/* Final response */}
                {(finalMessage || ((status === 'done' || status === 'stopped') && executedData)) && (
                    <>
                        <Divider sx={{ my: 2.5, opacity: 0.6 }} />
                        <Box>
                            <Caption>Response</Caption>
                            <Box
                                sx={{
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: 1.5,
                                    p: 1.75,
                                    bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.015),
                                    fontSize: 13,
                                    lineHeight: 1.55,
                                    color: 'text.primary',
                                    '& p:first-of-type': { mt: 0 },
                                    '& p:last-of-type': { mb: 0 },
                                    '& pre': {
                                        fontFamily: MONO_STACK,
                                        fontSize: 11.5,
                                        bgcolor: alpha(theme.palette.text.primary, 0.06),
                                        borderRadius: 1,
                                        p: 1,
                                        overflow: 'auto'
                                    },
                                    '& code': { fontFamily: MONO_STACK, fontSize: '0.95em' }
                                }}
                            >
                                {finalMessage ? (
                                    <MemoizedReactMarkdown chatflowid={chatflowid}>{finalMessage}</MemoizedReactMarkdown>
                                ) : (
                                    <Typography sx={{ fontFamily: MONO_STACK, fontSize: 12, color: 'text.secondary' }}>
                                        Flow completed without a text response.
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </>
                )}

                {/* Error band when status is error but we already have some context */}
                {status === 'error' && executedData && errorMessage && (
                    <>
                        <Divider sx={{ my: 2.5, opacity: 0.6 }} />
                        <Box>
                            <Caption>Error</Caption>
                            <Box
                                sx={{
                                    border: `1px solid ${alpha(theme.palette.error.main, 0.4)}`,
                                    bgcolor: alpha(theme.palette.error.main, 0.08),
                                    color: 'error.main',
                                    borderRadius: 1.5,
                                    px: 1.5,
                                    py: 1,
                                    fontSize: 12,
                                    fontFamily: MONO_STACK,
                                    wordBreak: 'break-word'
                                }}
                            >
                                {errorMessage}
                            </Box>
                        </Box>
                    </>
                )}
            </Box>

            {/* ─── Footer ───────────────────────────────────────────────── */}
            <Box
                sx={{
                    borderTop: `1px solid ${theme.palette.divider}`,
                    px: 2.5,
                    py: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: isDark ? alpha('#000', 0.25) : alpha('#000', 0.015)
                }}
            >
                <Button
                    size='small'
                    onClick={resetRun}
                    disabled={status === 'idle' || status === 'connecting' || (!executedData && !finalMessage)}
                    startIcon={<IconRefresh size={14} />}
                    sx={{
                        textTransform: 'none',
                        fontSize: 12,
                        color: isDark ? alpha('#fff', 0.75) : 'text.secondary',
                        '&:hover': { color: isDark ? 'common.white' : 'text.primary', bgcolor: 'transparent' }
                    }}
                >
                    Reset trace
                </Button>
            </Box>
        </Drawer>
    )
}

WebhookListenerDrawer.propTypes = {
    open: PropTypes.bool.isRequired,
    chatflowid: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onStatusChange: PropTypes.func
}

export default WebhookListenerDrawer
