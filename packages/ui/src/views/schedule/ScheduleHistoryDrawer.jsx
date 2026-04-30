import { useEffect, useMemo, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import moment from 'moment'

// MUI
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Drawer,
    FormControlLabel,
    IconButton,
    Paper,
    Skeleton,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography
} from '@mui/material'
import { tableCellClasses } from '@mui/material/TableCell'
import { alpha, styled, useTheme } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { IconCircleMinus, IconClock, IconLoader, IconRefresh, IconX, IconCalendar, IconTrash } from '@tabler/icons-react'
import DragHandleIcon from '@mui/icons-material/DragHandle'

// project import
import chatflowsApi from '@/api/chatflows'
import executionsApi from '@/api/executions'
import useApi from '@/hooks/useApi'
import useNotifier from '@/utils/useNotifier'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'
import { ExecutionDetails } from '@/views/agentexecutions/ExecutionDetails'

const PAGE_SIZE_STORAGE_KEY = 'scheduleHistoryPageSize'

// Drag-to-resize bounds (left-edge handle)
const MIN_DRAWER_WIDTH = 480
const DEFAULT_DRAWER_WIDTH = 720
const MAX_DRAWER_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 1920

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_META = {
    SUCCEEDED: { label: 'OK', color: 'success.dark', Icon: CheckCircleIcon },
    FAILED: { label: 'Failed', color: 'error.main', Icon: ErrorIcon },
    SKIPPED: { label: 'Skipped', color: 'grey.500', Icon: IconCircleMinus },
    QUEUED: { label: 'Queued', color: 'info.main', Icon: IconClock },
    RUNNING: { label: 'Running', color: 'warning.dark', Icon: IconLoader }
}

const StatusCell = ({ status }) => {
    const theme = useTheme()
    const meta = STATUS_META[status] ?? STATUS_META.QUEUED
    const isSpin = status === 'RUNNING'
    const Icon = meta.Icon
    return (
        <Stack direction='row' alignItems='center' spacing={1}>
            <Box sx={{ color: meta.color, display: 'flex', alignItems: 'center' }}>
                <Icon
                    size={18}
                    className={isSpin ? 'spin-animation' : undefined}
                    style={{ color: theme.palette[meta.color.split('.')[0]]?.[meta.color.split('.')[1]] }}
                />
            </Box>
            <Typography variant='body2' sx={{ color: meta.color, fontWeight: 500 }}>
                {meta.label}
            </Typography>
        </Stack>
    )
}

StatusCell.propTypes = {
    status: PropTypes.string.isRequired
}

// ─── Styled table cells ──────────────────────────────────────────────────────

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + '25',
    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900],
        fontWeight: 600
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
        height: 56
    }
}))

const StyledTableRow = styled(TableRow)(({ theme, clickable }) => ({
    cursor: clickable ? 'pointer' : 'default',
    '&:hover': clickable
        ? {
              backgroundColor: theme.palette.action.hover
          }
        : {}
}))

// ─── Time formatters ─────────────────────────────────────────────────────────

const relTime = (date) => (date ? moment(date).fromNow() : '—')
const fmtDate = (date) => (date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : '—')

// Formats a date in the given IANA timezone using Intl (no moment-timezone dependency).
// Falls back to local-time formatting if the timezone is invalid or omitted.
const fmtDateInTz = (date, timezone) => {
    if (!date) return '—'
    const d = new Date(date)
    if (isNaN(d.getTime())) return '—'
    try {
        const fmt = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone || undefined,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        })
        // en-CA produces "YYYY-MM-DD, HH:mm:ss" — strip the comma for a cleaner timestamp.
        return fmt.format(d).replace(',', '')
    } catch {
        return fmtDate(date)
    }
}

const fmtNextRun = (date) => {
    if (!date) return { text: '—', overdue: false }
    const m = moment(date)
    if (m.isBefore(moment())) return { text: 'due now', overdue: true }
    return { text: m.fromNow(), overdue: false }
}
const fmtDuration = (ms) => {
    if (ms == null) return '—'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s`
}

// ─── Cron → human readable (best-effort, falls back to expression) ───────────

const cronHumanize = (cron, timezone) => {
    if (!cron) return '—'
    const parts = cron.trim().split(/\s+/)
    const tz = timezone && timezone !== 'UTC' ? ` (${timezone})` : ' (UTC)'
    try {
        // common patterns only; otherwise show the raw cron
        if (parts.length === 5) {
            const [m, h, dom, mon, dow] = parts
            if (dom === '*' && mon === '*' && dow === '*' && m !== '*' && h !== '*') {
                return `Every day at ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${tz}`
            }
            if (dom === '*' && mon === '*' && dow === '1-5' && m !== '*' && h !== '*') {
                return `Every weekday at ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${tz}`
            }
            if (m === '0' && h === '*' && dom === '*' && mon === '*' && dow === '*') {
                return `Every hour${tz}`
            }
            if (m === '*' && h === '*' && dom === '*' && mon === '*' && dow === '*') {
                return `Every minute${tz}`
            }
        }
    } catch {
        /* noop */
    }
    return `cron: ${cron}${tz}`
}

// ─── Main drawer ─────────────────────────────────────────────────────────────

const ScheduleHistoryDrawer = ({ open, chatflowid, onClose }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    // ─── Drag-to-resize ──────────────────────────────────────────────────────
    const [drawerWidth, setDrawerWidth] = useState(Math.min(DEFAULT_DRAWER_WIDTH, MAX_DRAWER_WIDTH))

    const handleMouseMove = useCallback((e) => {
        const newWidth = document.body.offsetWidth - e.clientX
        if (newWidth >= MIN_DRAWER_WIDTH && newWidth <= MAX_DRAWER_WIDTH) {
            setDrawerWidth(newWidth)
        }
    }, [])

    const handleMouseUp = useCallback(() => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
    }, [handleMouseMove])

    const handleMouseDown = useCallback(() => {
        // Disable text-selection + set cursor so the cursor stays "ew-resize" while dragging
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'ew-resize'
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }, [handleMouseMove, handleMouseUp])

    // Clean up if drawer unmounts mid-drag
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.body.style.userSelect = ''
            document.body.style.cursor = ''
        }
    }, [handleMouseMove, handleMouseUp])

    // schedule status (cron, timezone, enabled, next-run)
    const statusApi = useApi(chatflowsApi.getScheduleStatus)
    const [statusData, setStatusData] = useState(null)

    // trigger logs
    const logsApi = useApi(chatflowsApi.getScheduleTriggerLogs)
    const [logs, setLogs] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(() => {
        const stored = parseInt(localStorage.getItem(PAGE_SIZE_STORAGE_KEY) || '', 10)
        return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_ITEMS_PER_PAGE
    })

    // auto-refresh
    const [autoRefresh, setAutoRefresh] = useState(true)

    // selection + delete
    const [selectedIds, setSelectedIds] = useState([])
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // execution detail drawer (nested)
    const execApi = useApi(executionsApi.getExecutionById)
    const [executionOpen, setExecutionOpen] = useState(false)
    const [executionData, setExecutionData] = useState(null)
    const [executionMetadata, setExecutionMetadata] = useState(null)

    // error modal (for rows without executionId)
    const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '' })

    // snackbar plumbing
    useNotifier()
    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const fetchAll = useCallback(() => {
        if (!chatflowid || !open) return
        statusApi.request(chatflowid)
        logsApi.request(chatflowid, { page, limit })
    }, [chatflowid, open, page, limit, statusApi, logsApi])

    // initial + page/limit change
    useEffect(() => {
        if (open) fetchAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, page, limit, chatflowid])

    const handlePaginationChange = (nextPage, nextLimit) => {
        if (nextLimit !== limit) {
            localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(nextLimit))
            setLimit(nextLimit)
            setPage(1)
            // selections refer to the previous page's row ids — drop them on page-size change
            setSelectedIds([])
        } else {
            setPage(nextPage)
            // optional: persist selection across pagination — for now drop to avoid stale state
            setSelectedIds([])
        }
    }

    // poll — 10s default, 2s when any row is RUNNING
    const hasRunning = useMemo(() => logs.some((l) => l.status === 'RUNNING'), [logs])
    useEffect(() => {
        if (!open || !autoRefresh) return
        const intervalMs = hasRunning ? 2000 : 10000
        const handle = setInterval(() => fetchAll(), intervalMs)
        return () => clearInterval(handle)
    }, [open, autoRefresh, hasRunning, fetchAll])

    useEffect(() => {
        if (statusApi.data) setStatusData(statusApi.data)
    }, [statusApi.data])

    useEffect(() => {
        if (logsApi.data) {
            setLogs(logsApi.data.data ?? [])
            setTotal(logsApi.data.total ?? 0)
        }
    }, [logsApi.data])

    // ─── Row click → execution details or error modal ────────────────────────

    const handleRowClick = async (row) => {
        if (row.executionId) {
            try {
                const resp = await executionsApi.getExecutionById(row.executionId)
                const execution = resp.data
                // executionData is stored as a JSON string in the DB; the ExecutionDetails
                // component expects the pre-parsed array (same shape as agentexecutions/index.jsx).
                const parsedExecutionData =
                    typeof execution?.executionData === 'string' ? JSON.parse(execution.executionData) : execution?.executionData
                setExecutionData(parsedExecutionData)
                setExecutionMetadata({
                    id: execution?.id,
                    sessionId: execution?.sessionId,
                    createdDate: execution?.createdDate,
                    updatedDate: execution?.updatedDate,
                    state: execution?.state,
                    agentflow: execution?.agentflow
                })
                setExecutionOpen(true)
            } catch (e) {
                setErrorModal({
                    open: true,
                    title: 'Could not load execution',
                    message: e?.response?.data?.message || e?.message || 'Unknown error'
                })
            }
        } else if (row.status === 'FAILED' || row.status === 'SKIPPED') {
            setErrorModal({
                open: true,
                title: row.status === 'FAILED' ? 'Run failed before execution started' : 'Run was skipped',
                message:
                    row.error ||
                    (row.status === 'SKIPPED'
                        ? 'The schedule was skipped (commonly: disabled, past end date, or invalid input).'
                        : 'No further details available.')
            })
        }
    }

    // ─── Selection helpers ───────────────────────────────────────────────────

    const visibleIds = useMemo(() => logs.map((l) => l.id), [logs])
    const allOnPageSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
    const someOnPageSelected = visibleIds.some((id) => selectedIds.includes(id))

    const toggleRowSelected = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    }

    const toggleSelectAllOnPage = () => {
        if (allOnPageSelected) {
            // deselect every row from the current page
            setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
        } else {
            // add any not-already-selected rows from the current page
            setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
        }
    }

    const handleConfirmDelete = async () => {
        if (selectedIds.length === 0) return
        setDeleting(true)
        try {
            const resp = await chatflowsApi.deleteScheduleTriggerLogs(chatflowid, selectedIds)
            const data = resp?.data ?? {}
            enqueueSnackbar({
                message: `Deleted ${data.deletedLogs ?? selectedIds.length} log${
                    (data.deletedLogs ?? selectedIds.length) === 1 ? '' : 's'
                }${data.deletedExecutions ? ` and ${data.deletedExecutions} execution${data.deletedExecutions === 1 ? '' : 's'}` : ''}`,
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
            setSelectedIds([])
            setDeleteDialogOpen(false)
            fetchAll()
        } catch (e) {
            enqueueSnackbar({
                message: e?.response?.data?.message || e?.message || 'Failed to delete logs',
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
        } finally {
            setDeleting(false)
        }
    }

    // ─── Header derived values ───────────────────────────────────────────────

    const record = statusData?.record
    const enabled = !!statusData?.enabled
    const cronHuman = cronHumanize(record?.cronExpression, record?.timezone)
    const nextRunAt = record?.nextRunAt
    const lastLog = logs[0]

    return (
        <>
            <Drawer
                anchor='right'
                open={open}
                onClose={onClose}
                variant='temporary'
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        maxWidth: '100vw',
                        height: '100%',
                        p: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
            >
                {/* Left-edge drag handle: click-and-drag to resize */}
                <button
                    aria-label='Resize drawer'
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 8,
                        cursor: 'ew-resize',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        zIndex: 1
                    }}
                    onMouseDown={handleMouseDown}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleMouseDown()
                        }
                    }}
                >
                    <DragHandleIcon
                        sx={{
                            transform: 'rotate(90deg)',
                            fontSize: '20px',
                            color: customization?.isDarkMode ? 'white' : 'action.disabled'
                        }}
                    />
                </button>
                {/* Header */}
                <Box
                    sx={{
                        px: 3,
                        py: 2,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.background.default
                    }}
                >
                    <Stack direction='row' alignItems='center' justifyContent='space-between'>
                        <Stack direction='row' alignItems='center' spacing={1.5}>
                            <IconCalendar size={20} />
                            <Typography variant='h4' sx={{ m: 0 }}>
                                Schedule History
                            </Typography>
                        </Stack>
                        <IconButton onClick={onClose} size='small' aria-label='close'>
                            <IconX size={18} />
                        </IconButton>
                    </Stack>

                    <Stack direction='row' alignItems='center' spacing={1.5} sx={{ mt: 2 }}>
                        <Chip
                            label={enabled ? 'Active' : 'Disabled'}
                            size='small'
                            sx={{
                                bgcolor: enabled
                                    ? customization?.isDarkMode
                                        ? 'success.dark'
                                        : 'success.light'
                                    : customization?.isDarkMode
                                    ? 'grey.800'
                                    : 'grey.300',
                                color: enabled
                                    ? customization?.isDarkMode
                                        ? 'success.light'
                                        : 'success.dark'
                                    : customization?.isDarkMode
                                    ? 'grey.400'
                                    : 'grey.700',
                                fontWeight: 600
                            }}
                        />
                        <Typography variant='body2' color='text.secondary' sx={{ flex: 1 }}>
                            {cronHuman}
                        </Typography>
                    </Stack>

                    <Stack direction='row' spacing={3} sx={{ mt: 1 }}>
                        <Box>
                            <Typography variant='caption' color='text.secondary'>
                                Last run
                            </Typography>
                            <Tooltip title={lastLog ? fmtDate(lastLog.scheduledAt) : ''}>
                                <Typography variant='body2'>{lastLog ? relTime(lastLog.scheduledAt) : '—'}</Typography>
                            </Tooltip>
                        </Box>
                        <Box>
                            <Typography variant='caption' color='text.secondary'>
                                Next run
                            </Typography>
                            {(() => {
                                if (!enabled || !nextRunAt) {
                                    return <Typography variant='body2'>—</Typography>
                                }
                                const { text, overdue } = fmtNextRun(nextRunAt)
                                const tz = record?.timezone || 'UTC'
                                const exactInTz = fmtDateInTz(nextRunAt, tz)
                                const exactLocal = fmtDate(nextRunAt)
                                return (
                                    <Tooltip
                                        title={
                                            overdue
                                                ? `Expected: ${exactInTz} (${tz}) — scheduler may be lagging or the next fire is imminent`
                                                : `Local time: ${exactLocal}`
                                        }
                                    >
                                        <Box>
                                            <Typography variant='body2' sx={{ color: overdue ? 'warning.main' : 'text.primary' }}>
                                                {text}
                                            </Typography>
                                            <Typography
                                                variant='caption'
                                                sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}
                                            >
                                                {exactInTz} <span style={{ opacity: 0.7 }}>({tz})</span>
                                            </Typography>
                                        </Box>
                                    </Tooltip>
                                )
                            })()}
                        </Box>
                    </Stack>

                    <Stack direction='row' alignItems='center' spacing={1} sx={{ mt: 2 }}>
                        <Tooltip title='Refresh'>
                            <IconButton size='small' onClick={fetchAll} disabled={logsApi.loading}>
                                <IconRefresh size={16} color={customization?.isDarkMode ? 'white' : undefined} />
                            </IconButton>
                        </Tooltip>
                        <FormControlLabel
                            sx={{ m: 0 }}
                            control={<Switch size='small' checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
                            label={<Typography variant='caption'>Auto-refresh</Typography>}
                        />
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title={selectedIds.length === 0 ? 'Select rows to delete' : `Delete ${selectedIds.length} selected`}>
                            {/* span wrapper so Tooltip works on a disabled button */}
                            <span>
                                <IconButton
                                    size='small'
                                    color='error'
                                    onClick={() => setDeleteDialogOpen(true)}
                                    disabled={selectedIds.length === 0 || deleting}
                                >
                                    <IconTrash size={16} />
                                </IconButton>
                            </span>
                        </Tooltip>
                        {logsApi.loading && <CircularProgress size={14} sx={{ ml: 1 }} />}
                    </Stack>

                    {!enabled && statusData?.reason && (
                        <Alert
                            severity='info'
                            icon={false}
                            sx={{
                                mt: 2,
                                py: 0.5,
                                ...(customization?.isDarkMode && {
                                    bgcolor: (t) => alpha(t.palette.info.main, 0.15),
                                    color: 'info.light',
                                    border: (t) => `1px solid ${alpha(t.palette.info.main, 0.3)}`,
                                    '& .MuiAlert-message': { color: 'info.light' }
                                })
                            }}
                        >
                            <Typography variant='caption'>{statusData.reason}</Typography>
                        </Alert>
                    )}
                </Box>

                {/* Table */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {logsApi.loading && logs.length === 0 ? (
                        <Box sx={{ p: 3 }}>
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} height={48} sx={{ my: 0.5 }} />
                            ))}
                        </Box>
                    ) : logs.length === 0 ? (
                        <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
                            <IconClock size={40} style={{ opacity: 0.4 }} />
                            <Typography variant='body2' sx={{ mt: 2 }}>
                                No runs yet.
                                {enabled && nextRunAt ? ` Next fire ${relTime(nextRunAt)}.` : ''}
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                            <Table size='small' stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <StyledTableCell padding='checkbox'>
                                            <Checkbox
                                                size='small'
                                                indeterminate={!allOnPageSelected && someOnPageSelected}
                                                checked={allOnPageSelected}
                                                onChange={toggleSelectAllOnPage}
                                                inputProps={{ 'aria-label': 'Select all rows on page' }}
                                            />
                                        </StyledTableCell>
                                        <StyledTableCell>Status</StyledTableCell>
                                        <StyledTableCell>Scheduled At</StyledTableCell>
                                        <StyledTableCell>Duration</StyledTableCell>
                                        <StyledTableCell>Error</StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {logs.map((row) => {
                                        const clickable = !!row.executionId || row.status === 'FAILED' || row.status === 'SKIPPED'
                                        const isSelected = selectedIds.includes(row.id)
                                        return (
                                            <StyledTableRow key={row.id} clickable={clickable ? 1 : 0} hover selected={isSelected}>
                                                <StyledTableCell padding='checkbox' onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        size='small'
                                                        checked={isSelected}
                                                        onChange={() => toggleRowSelected(row.id)}
                                                        inputProps={{ 'aria-label': `Select row ${row.id}` }}
                                                    />
                                                </StyledTableCell>
                                                <StyledTableCell onClick={clickable ? () => handleRowClick(row) : undefined}>
                                                    <StatusCell status={row.status} />
                                                </StyledTableCell>
                                                <StyledTableCell onClick={clickable ? () => handleRowClick(row) : undefined}>
                                                    <Tooltip title={fmtDate(row.scheduledAt)}>
                                                        <span>{relTime(row.scheduledAt)}</span>
                                                    </Tooltip>
                                                </StyledTableCell>
                                                <StyledTableCell onClick={clickable ? () => handleRowClick(row) : undefined}>
                                                    {fmtDuration(row.elapsedTimeMs)}
                                                </StyledTableCell>
                                                <StyledTableCell
                                                    onClick={clickable ? () => handleRowClick(row) : undefined}
                                                    sx={{
                                                        maxWidth: 240,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        color: 'error.main'
                                                    }}
                                                >
                                                    {row.error ? (
                                                        <Tooltip title={row.error}>
                                                            <span>{row.error}</span>
                                                        </Tooltip>
                                                    ) : (
                                                        <span style={{ color: theme.palette.text.disabled }}>—</span>
                                                    )}
                                                </StyledTableCell>
                                            </StyledTableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>

                {/* Footer: items-per-page + page selector + total count (mirrors Agent Executions pattern) */}
                {total > 0 && (
                    <Box
                        sx={{
                            borderTop: `1px solid ${theme.palette.divider}`,
                            px: 2,
                            py: 1
                        }}
                    >
                        <TablePagination currentPage={page} limit={limit} total={total} onChange={handlePaginationChange} />
                    </Box>
                )}
            </Drawer>

            {/* Nested execution drawer — executionData is already the parsed array */}
            {executionOpen && executionData && (
                <ExecutionDetails
                    open={executionOpen}
                    execution={executionData}
                    metadata={executionMetadata}
                    onClose={() => setExecutionOpen(false)}
                    onRefresh={() => execApi.request(executionMetadata?.id)}
                    isPublic={false}
                />
            )}

            {/* Bulk-delete confirmation */}
            <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)} maxWidth='sm' fullWidth>
                <DialogTitle>
                    Delete {selectedIds.length} log{selectedIds.length === 1 ? '' : 's'}?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will also permanently delete the linked execution traces. Schedule trigger logs that never produced an
                        execution (skipped or pre-execution failures) are deleted but have no associated execution to remove. This action
                        cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmDelete} color='error' disabled={deleting} variant='contained'>
                        {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Error modal for rows without an executionId */}
            <Dialog open={errorModal.open} onClose={() => setErrorModal({ open: false, title: '', message: '' })} maxWidth='sm' fullWidth>
                <DialogTitle>{errorModal.title}</DialogTitle>
                <DialogContent>
                    <Typography
                        variant='body2'
                        sx={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            bgcolor: 'action.hover',
                            p: 2,
                            borderRadius: 1,
                            color: 'error.main'
                        }}
                    >
                        {errorModal.message}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <IconButton onClick={() => setErrorModal({ open: false, title: '', message: '' })} size='small'>
                        <IconX size={16} />
                    </IconButton>
                </DialogActions>
            </Dialog>
        </>
    )
}

ScheduleHistoryDrawer.propTypes = {
    open: PropTypes.bool.isRequired,
    chatflowid: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired
}

export default ScheduleHistoryDrawer
