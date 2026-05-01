import { useState } from 'react'

import { Box, Divider, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { NodeIcon, StatusIndicator } from '@/atoms'
import type { ExecutionState, ExecutionTreeNode } from '@/core/types'
import { useObserveConfig } from '@/infrastructure/store'

interface ExecutionTreeSidebarProps {
    tree: ExecutionTreeNode[]
    selectedId: string | null
    onSelect: (node: ExecutionTreeNode) => void
}

/**
 * Recursive tree of nodes for the left pane of `ExecutionDetail`. Virtual
 * iteration container nodes render as italic captions and are not selectable.
 */
export function ExecutionTreeSidebar({ tree, selectedId, onSelect }: ExecutionTreeSidebarProps) {
    if (tree.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant='body2' color='text.secondary'>
                    No execution steps recorded.
                </Typography>
            </Box>
        )
    }

    return <TreeNodeList nodes={tree} selectedId={selectedId} onSelect={onSelect} depth={0} />
}

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
    const { apiBaseUrl } = useObserveConfig()
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
                        <NodeIcon name={node.name} size={22} apiBaseUrl={apiBaseUrl} />
                        <Typography variant='body2' sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.nodeLabel}
                        </Typography>
                        <StatusIndicator state={node.status as ExecutionState} size={14} />
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
