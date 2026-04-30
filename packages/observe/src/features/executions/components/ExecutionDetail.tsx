import { useState } from 'react'

import { Box, Chip, CircularProgress, IconButton, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconCopy, IconRefresh } from '@tabler/icons-react'

import { StatusIndicator } from '@/atoms'
import type { ExecutionDetailProps, ExecutionState, ExecutionTreeNode } from '@/core/types'

import { useExecutionPoll } from '../hooks/useExecutionPoll'
import { useExecutionTree } from '../hooks/useExecutionTree'
import { useResizableSidebar } from '../hooks/useResizableSidebar'

import { ExecutionTreeSidebar } from './ExecutionTreeSidebar'
import { NodeExecutionDetail } from './NodeExecutionDetail'

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 480
const DEFAULT_SIDEBAR_WIDTH_WIDE = 300
const DEFAULT_SIDEBAR_WIDTH_NARROW = 220

/**
 * Full execution detail view: resizable tree sidebar (left) + node detail panel (right).
 * Fetches the execution by ID and auto-polls while INPROGRESS.
 */
export function ExecutionDetail({
    executionId,
    pollInterval = 3000,
    onHumanInput,
    onClose: _onClose,
    onAgentflowClick
}: ExecutionDetailProps) {
    const theme = useTheme()
    const isNarrowViewport = useMediaQuery(theme.breakpoints.down('lg'))
    const defaultSidebarWidth = isNarrowViewport ? DEFAULT_SIDEBAR_WIDTH_NARROW : DEFAULT_SIDEBAR_WIDTH_WIDE
    const { execution, isLoading, error, refresh } = useExecutionPoll({ executionId, pollInterval })
    const tree = useExecutionTree(execution?.executionData ?? null)
    const [selectedNode, setSelectedNode] = useState<ExecutionTreeNode | null>(null)
    const { width: sidebarWidth, onMouseDown: onSidebarHandleMouseDown } = useResizableSidebar({
        defaultWidth: defaultSidebarWidth,
        minWidth: MIN_SIDEBAR_WIDTH,
        maxWidth: MAX_SIDEBAR_WIDTH
    })
    const [copied, setCopied] = useState(false)

    const copyId = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(executionId).catch((err) => {
                console.warn('[Observe] Clipboard copy failed:', err)
            })
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress size={32} />
            </Box>
        )
    }

    if (error || !execution) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color='error'>{error ?? 'Execution not found'}</Typography>
            </Box>
        )
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Toolbar */}
            <Stack
                direction='row'
                spacing={1}
                alignItems='center'
                sx={{ px: 2, py: 1, borderBottom: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}
            >
                <StatusIndicator state={execution.state as ExecutionState} size={16} />
                <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                    {execution.state}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : `ID: ${execution.id}`}>
                    <IconButton size='small' onClick={copyId}>
                        <IconCopy size={14} />
                    </IconButton>
                </Tooltip>
                {execution.agentflow &&
                    (onAgentflowClick ? (
                        <Chip
                            label={execution.agentflow.name}
                            size='small'
                            clickable
                            onClick={() => onAgentflowClick(execution.agentflowId)}
                        />
                    ) : (
                        <Typography variant='body2' color='text.secondary'>
                            {execution.agentflow.name}
                        </Typography>
                    ))}
                <Box sx={{ flex: 1 }} />
                <Tooltip title='Refresh'>
                    <IconButton size='small' onClick={refresh}>
                        <IconRefresh size={14} />
                    </IconButton>
                </Tooltip>
            </Stack>

            {/* Split pane */}
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <Box sx={{ width: sidebarWidth, flexShrink: 0, overflow: 'auto', borderRight: `1px solid ${theme.palette.divider}` }}>
                    <ExecutionTreeSidebar tree={tree} selectedId={selectedNode?.id ?? null} onSelect={setSelectedNode} />
                </Box>

                {/* Drag handle */}
                <Box
                    onMouseDown={onSidebarHandleMouseDown}
                    sx={{
                        width: 4,
                        cursor: 'col-resize',
                        flexShrink: 0,
                        backgroundColor: 'transparent',
                        '&:hover': { backgroundColor: theme.palette.primary.main }
                    }}
                />

                {/* Node detail panel */}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    {selectedNode ? (
                        <NodeExecutionDetail
                            node={selectedNode}
                            agentflowId={execution.agentflowId}
                            sessionId={execution.sessionId}
                            onHumanInput={onHumanInput}
                        />
                    ) : (
                        <Box sx={{ p: 3 }}>
                            <Typography variant='body2' color='text.secondary'>
                                Select a step to view details.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    )
}
