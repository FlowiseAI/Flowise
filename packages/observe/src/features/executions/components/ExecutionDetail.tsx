import { useEffect, useMemo, useRef, useState } from 'react'

import { Box, Chip, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconCopy, IconExternalLink, IconRefresh } from '@tabler/icons-react'
import { format as formatDate, parseISO } from 'date-fns'

import type { ExecutionDetailProps, ExecutionTreeNode } from '@/core/types'

import { useExecutionPoll } from '../hooks/useExecutionPoll'
import { useExecutionTree } from '../hooks/useExecutionTree'
import { useResizableSidebar } from '../hooks/useResizableSidebar'

import { ExecutionTreeSidebar } from './ExecutionTreeSidebar'
import { NodeExecutionDetail } from './NodeExecutionDetail'

const MIN_SIDEBAR_WIDTH = 240
const MAX_SIDEBAR_WIDTH = 480
const DEFAULT_SIDEBAR_WIDTH = 300

function findFirstStoppedNode(nodes: ExecutionTreeNode[]): ExecutionTreeNode | null {
    for (const node of nodes) {
        if (!node.isVirtualNode && node.status === 'STOPPED') return node
        const found = findFirstStoppedNode(node.children)
        if (found) return found
    }
    return null
}

function findFirstSelectableNode(nodes: ExecutionTreeNode[]): ExecutionTreeNode | null {
    for (const node of nodes) {
        if (!node.isVirtualNode) return node
        const found = findFirstSelectableNode(node.children)
        if (found) return found
    }
    return null
}

function collectAllIds(nodes: ExecutionTreeNode[]): string[] {
    const ids: string[] = []
    for (const node of nodes) {
        ids.push(node.id)
        if (node.children.length > 0) ids.push(...collectAllIds(node.children))
    }
    return ids
}

// PARITY: legacy uses moment(d).format('MMM D, YYYY h:mm A'). date-fns 'MMM d, yyyy h:mm a' produces the same en-US output.
function formatUpdatedDate(iso: string | undefined): string {
    if (!iso) return 'N/A'
    try {
        return formatDate(parseISO(iso), 'MMM d, yyyy h:mm a')
    } catch {
        return 'N/A'
    }
}

export function ExecutionDetail({
    executionId,
    pollInterval = 3000,
    onHumanInput,
    onClose: _onClose,
    onAgentflowClick,
    agentflow: agentflowProp
}: ExecutionDetailProps) {
    const theme = useTheme()
    const { execution, isLoading, error, refresh } = useExecutionPoll({ executionId, pollInterval })
    const tree = useExecutionTree(execution?.executionData ?? null)
    const [selectedNode, setSelectedNode] = useState<ExecutionTreeNode | null>(null)
    const [expandedIds, setExpandedIds] = useState<string[]>([])
    const { width: sidebarWidth, onMouseDown: onSidebarHandleMouseDown } = useResizableSidebar({
        defaultWidth: DEFAULT_SIDEBAR_WIDTH,
        minWidth: MIN_SIDEBAR_WIDTH,
        maxWidth: MAX_SIDEBAR_WIDTH
    })
    const [copied, setCopied] = useState(false)
    const hasInitializedRef = useRef(false)

    // PARITY: legacy ExecutionDetails opens with all nodes expanded and selects the first STOPPED node when state==='STOPPED', else the first top-level node — only on initial tree build so re-polls don't yank the selection.
    useEffect(() => {
        if (hasInitializedRef.current) return
        if (tree.length === 0) return
        const initial =
            execution?.state === 'STOPPED' ? findFirstStoppedNode(tree) ?? findFirstSelectableNode(tree) : findFirstSelectableNode(tree)
        if (initial) {
            setSelectedNode(initial)
            setExpandedIds(collectAllIds(tree))
            hasInitializedRef.current = true
        }
    }, [tree, execution?.state])

    const formattedUpdatedDate = useMemo(() => formatUpdatedDate(execution?.updatedDate), [execution?.updatedDate])

    useEffect(() => {
        if (!copied) return
        const timer = setTimeout(() => setCopied(false), 2000)
        return () => clearTimeout(timer)
    }, [copied])

    const copyId = () => {
        if (!navigator.clipboard) return
        navigator.clipboard
            .writeText(executionId)
            .then(() => setCopied(true))
            .catch((err) => {
                console.warn('[Observe] Clipboard copy failed:', err)
            })
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

    // The detail endpoint doesn't perform the agentflow join; fall back to the
    // optional prop (typically passed from ExecutionsViewer's list response).
    const agentflow = execution.agentflow ?? agentflowProp
    // PARITY: chained `||` (not `??`) so empty strings fall through to the next option, matching legacy.
    const agentflowChipLabel = agentflow?.name || agentflow?.id || 'Go to AgentFlow'

    return (
        <Box sx={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            <Box sx={{ width: sidebarWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header — chips + date/refresh row, rendered above the tree (parity with legacy). */}
                <Box
                    sx={{
                        p: 2,
                        pb: 1,
                        backgroundColor: theme.palette.background.paper,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        flexShrink: 0
                    }}
                >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {onAgentflowClick ? (
                            <Chip
                                sx={{ pl: 1 }}
                                icon={<IconExternalLink size={15} />}
                                variant='outlined'
                                label={agentflowChipLabel}
                                clickable
                                onClick={() => onAgentflowClick(execution.agentflowId)}
                            />
                        ) : (
                            <Chip variant='outlined' label={agentflowChipLabel} />
                        )}

                        <Tooltip
                            title={copied ? 'Copied!' : `Execution ID: ${execution.id}`}
                            placement='top'
                            disableHoverListener={!execution.id}
                        >
                            <Chip
                                sx={{ pl: 1 }}
                                icon={<IconCopy size={15} />}
                                variant='outlined'
                                label={copied ? 'Copied!' : 'Copy ID'}
                                clickable
                                onClick={copyId}
                            />
                        </Tooltip>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Typography sx={{ flex: 1 }} color='text.primary'>
                            {formattedUpdatedDate}
                        </Typography>
                        <Tooltip title='Refresh'>
                            <IconButton onClick={refresh} size='small'>
                                <IconRefresh size={20} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Tree — fills remaining sidebar height, scrolls independently. */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                    <ExecutionTreeSidebar
                        tree={tree}
                        selectedId={selectedNode?.id ?? null}
                        onSelect={setSelectedNode}
                        expandedIds={expandedIds}
                        onExpandedChange={setExpandedIds}
                    />
                </Box>
            </Box>

            {/* Drag handle */}
            <Box
                onMouseDown={onSidebarHandleMouseDown}
                sx={{
                    width: 4,
                    cursor: 'col-resize',
                    flexShrink: 0,
                    backgroundColor: 'transparent',
                    borderRight: `1px solid ${theme.palette.divider}`,
                    '&:hover': { backgroundColor: theme.palette.primary.main }
                }}
            />

            {/* Detail panel */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
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
    )
}
