import { useCallback, useEffect, useRef, useState } from 'react'

import { Box, Chip, CircularProgress, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconCopy, IconRefresh } from '@tabler/icons-react'

import { StatusIndicator } from '@/atoms'
import type { ExecutionDetailProps, ExecutionState, ExecutionTreeNode } from '@/core/types'

import { useExecutionPoll } from '../hooks/useExecutionPoll'
import { useExecutionTree } from '../hooks/useExecutionTree'

import { NodeExecutionDetail } from './NodeExecutionDetail'

const MIN_SIDEBAR_WIDTH = 240
const MAX_SIDEBAR_WIDTH = 480
const DEFAULT_SIDEBAR_WIDTH = 300

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
    const { execution, isLoading, error, refresh } = useExecutionPoll({ executionId, pollInterval })
    const tree = useExecutionTree(execution?.executionData ?? null)
    const [selectedNode, setSelectedNode] = useState<ExecutionTreeNode | null>(null)
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
    const [copied, setCopied] = useState(false)
    const isDragging = useRef(false)
    const dragStartX = useRef(0)
    const dragStartWidth = useRef(DEFAULT_SIDEBAR_WIDTH)

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true
        dragStartX.current = e.clientX
        dragStartWidth.current = sidebarWidth
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current) return
        const delta = e.clientX - dragStartX.current
        const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, dragStartWidth.current + delta))
        setSidebarWidth(newWidth)
    }, [])

    const handleMouseUp = useCallback(() => {
        isDragging.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
    }, [handleMouseMove])

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [handleMouseMove, handleMouseUp])

    const copyId = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(executionId)
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
                {/* Tree sidebar */}
                <Box sx={{ width: sidebarWidth, flexShrink: 0, overflow: 'auto', borderRight: `1px solid ${theme.palette.divider}` }}>
                    {tree.length === 0 ? (
                        <Box sx={{ p: 2 }}>
                            <Typography variant='body2' color='text.secondary'>
                                No execution steps recorded.
                            </Typography>
                        </Box>
                    ) : (
                        <TreeNodeList nodes={tree} selectedId={selectedNode?.id ?? null} onSelect={setSelectedNode} depth={0} />
                    )}
                </Box>

                {/* Drag handle */}
                <Box
                    onMouseDown={handleMouseDown}
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

// ============================================================================
// Tree rendering — recursive node list
// ============================================================================

interface TreeNodeListProps {
    nodes: ExecutionTreeNode[]
    selectedId: string | null
    onSelect: (node: ExecutionTreeNode) => void
    depth: number
}

function TreeNodeList({ nodes, selectedId, onSelect, depth }: TreeNodeListProps) {
    return (
        <>
            {nodes.map((node) => (
                <TreeNodeItem key={node.id} node={node} selectedId={selectedId} onSelect={onSelect} depth={depth} />
            ))}
        </>
    )
}

interface TreeNodeItemProps {
    node: ExecutionTreeNode
    selectedId: string | null
    onSelect: (node: ExecutionTreeNode) => void
    depth: number
}

function TreeNodeItem({ node, selectedId, onSelect, depth }: TreeNodeItemProps) {
    const theme = useTheme()
    const [expanded, setExpanded] = useState(true)
    const isSelected = node.id === selectedId
    const hasChildren = node.children.length > 0

    return (
        <>
            <Box
                onClick={() => {
                    if (!node.isVirtualNode) onSelect(node)
                    if (hasChildren) setExpanded((v) => !v)
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    pl: 1.5 + depth * 1.5,
                    pr: 1.5,
                    py: 0.75,
                    cursor: node.isVirtualNode ? 'default' : 'pointer',
                    backgroundColor: isSelected ? theme.palette.action.selected : 'transparent',
                    '&:hover': { backgroundColor: theme.palette.action.hover },
                    borderBottom: `1px solid ${theme.palette.divider}`
                }}
            >
                {node.isVirtualNode ? (
                    <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                        {node.nodeLabel}
                    </Typography>
                ) : (
                    <>
                        <StatusIndicator state={node.status as ExecutionState} size={12} />
                        <Typography variant='body2' sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.nodeLabel}
                        </Typography>
                    </>
                )}
            </Box>
            {hasChildren && expanded && (
                <>
                    <Divider />
                    <TreeNodeList nodes={node.children} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
                </>
            )}
        </>
    )
}
