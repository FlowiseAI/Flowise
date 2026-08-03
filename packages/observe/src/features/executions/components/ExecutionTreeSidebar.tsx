import { forwardRef, useMemo } from 'react'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import { Box, Typography } from '@mui/material'
import { alpha, keyframes, styled, useTheme } from '@mui/material/styles'
import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import {
    TreeItem2Checkbox,
    TreeItem2Content,
    TreeItem2GroupTransition,
    TreeItem2IconContainer,
    TreeItem2Label,
    TreeItem2Root
} from '@mui/x-tree-view/TreeItem2'
import { TreeItem2DragAndDropOverlay } from '@mui/x-tree-view/TreeItem2DragAndDropOverlay'
import { TreeItem2Icon } from '@mui/x-tree-view/TreeItem2Icon'
import { TreeItem2Provider } from '@mui/x-tree-view/TreeItem2Provider'
import { useTreeItem2 } from '@mui/x-tree-view/useTreeItem2'
import { IconCircleXFilled, IconLoader } from '@tabler/icons-react'

import { AGENTFLOW_ICONS } from '@/core/primitives'
import type { ExecutionState, ExecutionTreeNode } from '@/core/types'

interface ExecutionTreeSidebarProps {
    tree: ExecutionTreeNode[]
    selectedId: string | null
    onSelect: (node: ExecutionTreeNode) => void
    expandedIds: string[]
    onExpandedChange: (ids: string[]) => void
}

// `RichTreeView` is typed against a structural item shape; we hand it our
// ExecutionTreeNode tree and project id/label via `getItemId` / `getItemLabel`.
// This narrowed view exposes the only fields the tree code reads through the
// `items` prop, so the cast is centralized in one place instead of leaking
// `as unknown as …` into every callback.
type RichTreeViewItem = { id: string; nodeLabel: string; children?: RichTreeViewItem[] }

function toRichItems(nodes: ExecutionTreeNode[]): RichTreeViewItem[] {
    return nodes as unknown as RichTreeViewItem[]
}

/** Recursive map indexed by item id — used inside the slot to resolve raw node fields. */
function indexTree(nodes: ExecutionTreeNode[], out: Map<string, ExecutionTreeNode> = new Map()): Map<string, ExecutionTreeNode> {
    for (const node of nodes) {
        out.set(node.id, node)
        if (node.children.length > 0) indexTree(node.children, out)
    }
    return out
}

/**
 * Sidebar tree built on `@mui/x-tree-view`'s `RichTreeView`. Visual parity with
 * legacy `ExecutionDetails.jsx`: per-branch border (3px solid when the parent
 * is selected, 1px dashed otherwise) colored from `AGENTFLOW_ICONS`, status
 * icons on the right, virtual iteration nodes use the iteration icon.
 */
export function ExecutionTreeSidebar({ tree, selectedId, onSelect, expandedIds, onExpandedChange }: ExecutionTreeSidebarProps) {
    // Declared before the early return so the hook count stays stable across renders.
    const indexed = useMemo(() => indexTree(tree), [tree])

    if (tree.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant='body2' color='text.secondary'>
                    No execution steps recorded.
                </Typography>
            </Box>
        )
    }

    const handleSelect = (_: unknown, itemId: string | null) => {
        if (!itemId) return
        const node = indexed.get(itemId)
        if (!node) return
        onSelect(node)
    }

    const handleExpandedChange = (_: unknown, ids: string[]) => onExpandedChange(ids)

    return (
        <RichTreeView
            items={toRichItems(tree)}
            getItemId={(item) => item.id}
            getItemLabel={(item) => item.nodeLabel}
            expandedItems={expandedIds}
            onExpandedItemsChange={handleExpandedChange}
            selectedItems={selectedId ?? null}
            onSelectedItemsChange={handleSelect}
            slots={{ item: CustomTreeItem }}
        />
    )
}

// ---------------------------------------------------------------------------
// Slot: custom tree item with status icon, branch border, DnD overlay
// ---------------------------------------------------------------------------

const StyledTreeItemRoot = styled(TreeItem2Root)(({ theme }) => ({
    color: theme.palette.grey[400]
}))

const CustomTreeItemContent = styled(TreeItem2Content)(({ theme }) => ({
    flexDirection: 'row-reverse',
    borderRadius: theme.spacing(0.7),
    marginBottom: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    padding: theme.spacing(0.5),
    paddingRight: theme.spacing(1),
    fontWeight: 500,
    '&.Mui-expanded': {
        '&::before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            left: '16px',
            top: '44px',
            height: 'calc(100% - 48px)',
            width: '1.5px',
            backgroundColor: theme.palette.grey[700],
            ...theme.applyStyles?.('light', { backgroundColor: theme.palette.grey[300] })
        }
    },
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.1)
    },
    '&.Mui-focused, &.Mui-selected, &.Mui-selected.Mui-focused': {
        backgroundColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText,
        ...theme.applyStyles?.('light', { backgroundColor: theme.palette.primary.main })
    }
}))

const spin = keyframes({
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' }
})

interface StatusIconProps {
    state: ExecutionState | 'UNKNOWN'
}

function StatusIcon({ state }: StatusIconProps) {
    const theme = useTheme()
    const baseSx = { ml: 1, fontSize: '1.2rem' } as const

    switch (state) {
        case 'FINISHED':
            return <CheckCircleIcon sx={{ ...baseSx, color: 'success.dark' }} />
        case 'ERROR':
        case 'TIMEOUT':
            return <ErrorIcon sx={{ ...baseSx, color: 'error.main' }} />
        case 'STOPPED':
            return <StopCircleIcon sx={{ ...baseSx, color: 'error.main' }} />
        case 'TERMINATED':
            return (
                <Box sx={{ ml: 1, display: 'flex' }}>
                    <IconCircleXFilled size={18} color={theme.palette.error.main} />
                </Box>
            )
        case 'INPROGRESS':
            return (
                <Box sx={{ ml: 1, display: 'flex', animation: `${spin} 1s linear infinite` }}>
                    <IconLoader size={18} color={theme.palette.warning.dark} />
                </Box>
            )
        default:
            return null
    }
}

interface CustomTreeItemProps {
    id?: string
    itemId: string
    label?: React.ReactNode
    disabled?: boolean
    children?: React.ReactNode
}

const CustomTreeItem = forwardRef<HTMLLIElement, CustomTreeItemProps>(function CustomTreeItem(props, ref) {
    const { id, itemId, label, disabled, children, ...other } = props
    const theme = useTheme()

    const {
        getRootProps,
        getContentProps,
        getIconContainerProps,
        getCheckboxProps,
        getLabelProps,
        getGroupTransitionProps,
        getDragAndDropOverlayProps,
        status,
        publicAPI
    } = useTreeItem2({ id, itemId, children, label, disabled, rootRef: ref })

    const item = publicAPI.getItem(itemId) as unknown as ExecutionTreeNode | undefined
    if (!item) return null

    // PARITY: branch color follows the parent node type's AGENTFLOW_ICONS color, falling back to theme primary.
    const branchColor = AGENTFLOW_ICONS[item.name]?.color ?? theme.palette.primary.main

    return (
        <TreeItem2Provider itemId={itemId}>
            <StyledTreeItemRoot {...getRootProps(other)}>
                <CustomTreeItemContent {...getContentProps()}>
                    <TreeItem2IconContainer {...getIconContainerProps()}>
                        <TreeItem2Icon status={status} />
                    </TreeItem2IconContainer>
                    <TreeItem2Checkbox {...getCheckboxProps()} />
                    <CustomLabel {...getLabelProps()} item={item} />
                    <TreeItem2DragAndDropOverlay {...getDragAndDropOverlayProps()} />
                </CustomTreeItemContent>
                {children && (
                    <TreeItem2GroupTransition
                        {...getGroupTransitionProps()}
                        style={{
                            borderLeft: `${status.selected ? '3px solid' : '1px dashed'} ${branchColor}`,
                            marginLeft: '13px',
                            paddingLeft: '8px'
                        }}
                    />
                )}
            </StyledTreeItemRoot>
        </TreeItem2Provider>
    )
})

interface CustomLabelProps {
    children?: React.ReactNode
    item: ExecutionTreeNode
}

function CustomLabel({ item, children, ...other }: CustomLabelProps) {
    const entry = AGENTFLOW_ICONS[item.name]
    const NodeTypeIcon = entry?.icon

    return (
        <TreeItem2Label {...other} sx={{ display: 'flex', alignItems: 'center' }}>
            {NodeTypeIcon && (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <NodeTypeIcon size={20} color={entry.color} />
                </Box>
            )}
            <Typography sx={{ flex: 1, color: 'text.primary' }}>{children}</Typography>
            <StatusIcon state={item.status} />
        </TreeItem2Label>
    )
}
