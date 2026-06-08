import { Box, Checkbox, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconTrash } from '@tabler/icons-react'

import { StatusIndicator } from '@/atoms'
import type { Execution } from '@/core/types'

interface ExecutionsListTableProps {
    executions: Execution[]
    selectedIds: Set<string>
    onSelectId: (id: string, checked: boolean) => void
    onSelectAll: (checked: boolean) => void
    onRowClick: (execution: Execution) => void
    onDelete?: (execution: Execution) => void
    allowDelete?: boolean
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function truncate(str: string, max = 24): string {
    return str.length > max ? `${str.slice(0, max)}…` : str
}

export function ExecutionsListTable({
    executions,
    selectedIds,
    onSelectId,
    onSelectAll,
    onRowClick,
    onDelete,
    allowDelete = false
}: ExecutionsListTableProps) {
    const theme = useTheme()
    const allSelected = executions.length > 0 && executions.every((e) => selectedIds.has(e.id))
    const someSelected = executions.some((e) => selectedIds.has(e.id))

    return (
        <Table size='small' stickyHeader>
            <TableHead>
                <TableRow>
                    <TableCell padding='checkbox'>
                        <Checkbox
                            size='small'
                            checked={allSelected}
                            indeterminate={someSelected && !allSelected}
                            onChange={(_, checked) => onSelectAll(checked)}
                        />
                    </TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Updated</TableCell>
                    <TableCell>Agentflow</TableCell>
                    <TableCell>Session ID</TableCell>
                    <TableCell>Created</TableCell>
                    {allowDelete && <TableCell padding='checkbox' />}
                </TableRow>
            </TableHead>
            <TableBody>
                {executions.map((execution) => (
                    <TableRow
                        key={execution.id}
                        hover
                        selected={selectedIds.has(execution.id)}
                        onClick={() => onRowClick(execution)}
                        sx={{ cursor: 'pointer' }}
                    >
                        <TableCell padding='checkbox' onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                                size='small'
                                checked={selectedIds.has(execution.id)}
                                onChange={(_, checked) => onSelectId(execution.id, checked)}
                            />
                        </TableCell>
                        <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <StatusIndicator state={execution.state} size={14} />
                                <Typography variant='caption' color='text.secondary'>
                                    {execution.state}
                                </Typography>
                            </Box>
                        </TableCell>
                        <TableCell>
                            <Typography variant='body2'>{formatDate(execution.updatedDate)}</Typography>
                        </TableCell>
                        <TableCell>
                            <Typography variant='body2'>{execution.agentflow?.name ?? '—'}</Typography>
                        </TableCell>
                        <TableCell>
                            <Tooltip title={execution.sessionId}>
                                <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                    {truncate(execution.sessionId)}
                                </Typography>
                            </Tooltip>
                        </TableCell>
                        <TableCell>
                            <Typography variant='body2' color='text.secondary'>
                                {formatDate(execution.createdDate)}
                            </Typography>
                        </TableCell>
                        {allowDelete && (
                            <TableCell padding='checkbox' onClick={(e) => e.stopPropagation()}>
                                <Tooltip title='Delete execution'>
                                    <IconButton
                                        size='small'
                                        onClick={() => onDelete?.(execution)}
                                        sx={{ color: theme.palette.error.main, opacity: 0.6, '&:hover': { opacity: 1 } }}
                                    >
                                        <IconTrash size={14} />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
