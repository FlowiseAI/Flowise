import { useCallback, useEffect, useState } from 'react'

import DragHandleIcon from '@mui/icons-material/DragHandle'
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Drawer,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TablePagination,
    TextField,
    Typography
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

import type { Execution, ExecutionFilters, ExecutionState, ExecutionsViewerProps } from '@/core/types'
import { useObserveApi } from '@/infrastructure/store'

import { useDrawerWidths } from '../hooks/useDrawerWidths'
import { useResizableSidebar } from '../hooks/useResizableSidebar'

import { ExecutionDetail } from './ExecutionDetail'
import { ExecutionsListTable } from './ExecutionsListTable'

const DEFAULT_PAGE_SIZE = 12

const EXECUTION_STATES: Array<ExecutionState | ''> = ['', 'INPROGRESS', 'FINISHED', 'ERROR', 'TERMINATED', 'TIMEOUT', 'STOPPED']

/**
 * Top-level executions list + detail drawer.
 * When agentflowId is provided: scoped view (M1 — hides agentflow name column).
 * When agentflowId is omitted: full cross-agent list (M2).
 */
export function ExecutionsViewer({
    agentflowId,
    allowDelete = false,
    pollInterval = 3000,
    onHumanInput,
    onAgentflowClick,
    initialFilters,
    drawer
}: ExecutionsViewerProps) {
    const theme = useTheme()
    const { executions: api } = useObserveApi()

    // List state
    const [rows, setRows] = useState<Execution[]>([])
    const [total, setTotal] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Pagination
    const [page, setPage] = useState(0) // MUI TablePagination is 0-based
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

    // Filters
    const [filters, setFilters] = useState<ExecutionFilters>({
        state: '',
        startDate: null,
        endDate: null,
        sessionId: '',
        agentflowName: '',
        ...initialFilters
    })

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Detail drawer
    const [drawerExecution, setDrawerExecution] = useState<Execution | null>(null)
    const drawerWidths = useDrawerWidths(drawer)
    const { width: drawerWidth, onMouseDown: onDrawerHandleMouseDown } = useResizableSidebar({
        ...drawerWidths,
        // Right-anchored drawer: handle on the LEFT edge, drag-left grows.
        inverted: true
    })

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Execution | null>(null)

    const fetchExecutions = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await api.getAllExecutions({
                page: page + 1, // API is 1-based
                limit: pageSize,
                agentflowId: agentflowId ?? filters.agentflowId,
                ...filters
            })
            setRows(result.data)
            setTotal(result.total)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load executions')
        } finally {
            setIsLoading(false)
        }
    }, [api, page, pageSize, agentflowId, filters])

    useEffect(() => {
        fetchExecutions()
    }, [fetchExecutions])

    const handleSelectId = (id: string, checked: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (checked) next.add(id)
            else next.delete(id)
            return next
        })
    }

    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? new Set(rows.map((r) => r.id)) : new Set())
    }

    const handleDelete = async (execution: Execution) => {
        try {
            await api.deleteExecutions([execution.id])
            setDeleteTarget(null)
            setSelectedIds((prev) => {
                const next = new Set(prev)
                next.delete(execution.id)
                return next
            })
            fetchExecutions()
        } catch (err) {
            console.error('[Observe] Failed to delete execution', err)
        }
    }

    const handleBulkDelete = async () => {
        try {
            await api.deleteExecutions(Array.from(selectedIds))
            setSelectedIds(new Set())
            fetchExecutions()
        } catch (err) {
            console.error('[Observe] Failed to bulk delete executions', err)
        }
    }

    const isScoped = !!agentflowId

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Filters */}
            <Stack
                direction='row'
                spacing={1.5}
                flexWrap='wrap'
                alignItems='center'
                sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}
            >
                <FormControl size='small' sx={{ minWidth: 140 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        label='Status'
                        value={filters.state ?? ''}
                        onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value as ExecutionState | '' }))}
                    >
                        {EXECUTION_STATES.map((s) => (
                            <MenuItem key={s} value={s}>
                                {s || 'All'}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    size='small'
                    label='Session ID'
                    value={filters.sessionId ?? ''}
                    onChange={(e) => setFilters((f) => ({ ...f, sessionId: e.target.value }))}
                    sx={{ width: 200 }}
                />

                {!isScoped && (
                    <TextField
                        size='small'
                        label='Agentflow Name'
                        value={filters.agentflowName ?? ''}
                        onChange={(e) => setFilters((f) => ({ ...f, agentflowName: e.target.value }))}
                        sx={{ width: 200 }}
                    />
                )}

                <Box sx={{ flex: 1 }} />

                {selectedIds.size > 0 && (
                    <Stack direction='row' spacing={1} alignItems='center'>
                        <Chip label={`${selectedIds.size} selected`} size='small' />
                        <Button size='small' color='error' variant='outlined' onClick={handleBulkDelete}>
                            Delete selected
                        </Button>
                    </Stack>
                )}
            </Stack>

            {/* Table */}
            <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                {isLoading && (
                    <Box
                        sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
                    >
                        <CircularProgress />
                    </Box>
                )}
                {error && (
                    <Box sx={{ p: 3 }}>
                        <Typography color='error'>{error}</Typography>
                    </Box>
                )}
                {!isLoading && !error && rows.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color='text.secondary'>No executions found.</Typography>
                    </Box>
                )}
                {rows.length > 0 && (
                    <ExecutionsListTable
                        executions={rows}
                        selectedIds={selectedIds}
                        onSelectId={handleSelectId}
                        onSelectAll={handleSelectAll}
                        onRowClick={setDrawerExecution}
                        onDelete={(e) => setDeleteTarget(e)}
                        allowDelete={allowDelete}
                        scoped={isScoped}
                    />
                )}
            </Box>

            {/* Pagination */}
            <TablePagination
                component='div'
                count={total}
                page={page}
                rowsPerPage={pageSize}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10))
                    setPage(0)
                }}
                rowsPerPageOptions={[12, 25, 50]}
                sx={{ borderTop: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}
            />

            {/* Detail Drawer */}
            <Drawer
                anchor='right'
                open={!!drawerExecution}
                onClose={() => setDrawerExecution(null)}
                PaperProps={{ sx: { width: drawerWidth, overflow: 'hidden' } }}
            >
                {/* Drag-handle on the LEFT edge — resizes the drawer (parity with legacy ExecutionDetails resizeHandle). */}
                {/* No `role="button"` / `aria-label`: drag-only widgets can't be operated by keyboard, so screen readers shouldn't announce one. */}
                <Box
                    role='separator'
                    aria-orientation='vertical'
                    onMouseDown={onDrawerHandleMouseDown}
                    sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 8,
                        cursor: 'ew-resize',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                        '&:hover': { background: alpha(theme.palette.text.primary, 0.05) }
                    }}
                >
                    <DragHandleIcon sx={{ transform: 'rotate(90deg)', fontSize: 20, color: 'action.disabled' }} />
                </Box>

                {drawerExecution && (
                    <ExecutionDetail
                        // Reset internal state when the user switches rows without closing the drawer.
                        key={drawerExecution.id}
                        executionId={drawerExecution.id}
                        pollInterval={pollInterval}
                        onHumanInput={onHumanInput}
                        onAgentflowClick={onAgentflowClick}
                        onClose={() => setDrawerExecution(null)}
                        // Seed the header chip with the agentflow info already on the row —
                        // the server's getExecutionById doesn't perform the join, only getAllExecutions does.
                        agentflow={drawerExecution.agentflow}
                    />
                )}
            </Drawer>

            {/* Delete confirmation */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth='xs' fullWidth>
                <DialogTitle>Delete Execution</DialogTitle>
                <DialogContent>
                    <DialogContentText>This action cannot be undone.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button color='error' variant='contained' onClick={() => deleteTarget && handleDelete(deleteTarget)}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
