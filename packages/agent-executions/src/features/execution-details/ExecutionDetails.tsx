import { useEffect, useState, useCallback } from 'react'
import moment from 'moment'
import { Typography, Box, Drawer, Chip, Tooltip, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import { IconRefresh, IconExternalLink, IconCopy, IconLoader, IconShare, IconWorld } from '@tabler/icons-react'
import { useConfigContext } from '@/infrastructure/store/ConfigContext'
import { useApiContext } from '@/infrastructure/store/ApiContext'
import { useApi } from '@/infrastructure/api/hooks'
import { ExecutionTreeView } from './ExecutionTreeView'
import { NodeExecutionDetails } from './NodeExecutionDetails'
import { ShareExecutionDialog } from './ShareExecutionDialog'
import { buildTreeData, getAllNodeIds, findNode, findFirstStoppedNode } from '@/utils/tree-builder'
import type { Execution, ExecutionTreeItem } from '@/core/types'

const MIN_DRAWER_WIDTH = 400
const DEFAULT_DRAWER_WIDTH = typeof window !== 'undefined' ? window.innerWidth - 400 : 800
const MAX_DRAWER_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 1200

const ExecutionDetailsContent: React.FC<{
    execution: Execution
    isPublic?: boolean
    onProceedSuccess?: () => void
    onUpdateSharing?: () => void
    onRefresh?: (executionId: string) => void
}> = ({ execution, isPublic, onProceedSuccess, onUpdateSharing, onRefresh }) => {
    const [executionTree, setExecutionTree] = useState<ExecutionTreeItem[]>([])
    const [expandedItems, setExpandedItems] = useState<string[]>([])
    const [selectedItem, setSelectedItem] = useState<ExecutionTreeItem | null>(null)
    const [showShareDialog, setShowShareDialog] = useState(false)
    const [copied, setCopied] = useState(false)
    const theme = useTheme()
    const config = useConfigContext()
    const { executionsApi } = useApiContext()
    const updateExecutionApi = useApi(executionsApi.updateExecution)

    // Use the updated data from the api if we have made an update
    const localExecution = updateExecutionApi.data ?? execution

    const copyToClipboard = () => {
        navigator.clipboard.writeText(localExecution.id || '')
        setCopied(true)
        config.onNotification?.('ID copied to clipboard', 'success')
        setTimeout(() => setCopied(false), 2000)
    }

    const onSharePublicly = async () => {
        const newIsPublic = !localExecution.isPublic
        await updateExecutionApi.request(localExecution.id, { isPublic: newIsPublic })
        config.onNotification?.(newIsPublic ? 'Execution shared publicly' : 'Execution is no longer public', 'success')
        onUpdateSharing?.()
    }

    useEffect(() => {
        const newTree = buildTreeData(execution.executionData)

        if (execution.state === 'STOPPED') {
            const stoppedNode = findFirstStoppedNode(newTree)
            if (stoppedNode) {
                setExpandedItems(getAllNodeIds(newTree))
                setSelectedItem(stoppedNode)
            } else {
                setExpandedItems(getAllNodeIds(newTree))
                if (newTree.length > 0) setSelectedItem(newTree[0])
            }
        } else {
            setExpandedItems(getAllNodeIds(newTree))
            if (newTree.length > 0) setSelectedItem(newTree[0])
        }
        setExecutionTree(newTree)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [execution])

    const handleNodeSelect = (_event: React.SyntheticEvent, itemId: string) => {
        const selectedNode = findNode(executionTree, itemId)
        setSelectedItem(selectedNode)
    }

    const handleExpandedItemsChange = (_event: React.SyntheticEvent, itemIds: string[]) => {
        setExpandedItems(itemIds)
    }

    return (
        <>
            <Box sx={{ display: 'flex', height: '100%', flexDirection: 'row' }}>
                <Box
                    sx={{
                        flex: '1 1 35%',
                        padding: 2,
                        borderRight: 1,
                        borderColor: 'divider',
                        overflow: 'auto'
                    }}
                >
                    <Box
                        sx={{
                            pb: 1,
                            mb: 2,
                            backgroundColor: (theme) => theme.palette.background.paper,
                            borderBottom: 1,
                            borderColor: 'divider'
                        }}
                    >
                        <Box>
                            {!isPublic && (
                                <Chip
                                    sx={{ pl: 1 }}
                                    icon={<IconExternalLink size={15} />}
                                    variant='outlined'
                                    label={localExecution?.agentflow?.name || localExecution?.agentflow?.id || 'Go to AgentFlow'}
                                    className={'button'}
                                    onClick={() => {
                                        const pattern = config.agentCanvasUrlPattern || '/v2/agentcanvas/:id'
                                        const url = pattern.replace(':id', localExecution?.agentflow?.id || '')
                                        window.open(url, '_blank')
                                    }}
                                />
                            )}

                            {!isPublic && (
                                <Tooltip
                                    title={`Execution ID: ${localExecution?.id || ''}`}
                                    placement='top'
                                    disableHoverListener={!localExecution?.id}
                                >
                                    <Chip
                                        sx={{ ml: 1, pl: 1 }}
                                        icon={<IconCopy size={15} />}
                                        variant='outlined'
                                        label={copied ? 'Copied!' : 'Copy ID'}
                                        className={'button'}
                                        onClick={copyToClipboard}
                                    />
                                </Tooltip>
                            )}

                            {!isPublic && !localExecution.isPublic && (
                                <Chip
                                    sx={{ ml: 1, pl: 1 }}
                                    icon={
                                        updateExecutionApi.loading ? (
                                            <IconLoader size={15} className='spin-animation' />
                                        ) : (
                                            <IconShare size={15} />
                                        )
                                    }
                                    variant='outlined'
                                    label={updateExecutionApi.loading ? 'Updating...' : 'Share'}
                                    className={'button'}
                                    onClick={() => onSharePublicly()}
                                    disabled={updateExecutionApi.loading}
                                />
                            )}

                            {!isPublic && localExecution.isPublic && (
                                <Chip
                                    sx={{ ml: 1, pl: 1 }}
                                    icon={
                                        updateExecutionApi.loading ? (
                                            <IconLoader size={15} className='spin-animation' />
                                        ) : (
                                            <IconWorld size={15} />
                                        )
                                    }
                                    variant='outlined'
                                    label={updateExecutionApi.loading ? 'Updating...' : 'Public'}
                                    className={'button'}
                                    onClick={() => setShowShareDialog(true)}
                                    disabled={updateExecutionApi.loading}
                                />
                            )}

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', alignContent: 'center' }}>
                                <Typography sx={{ flex: 1, mt: 1 }} color='text.primary'>
                                    {localExecution?.updatedDate ? moment(localExecution.updatedDate).format('MMM D, YYYY h:mm A') : 'N/A'}
                                </Typography>
                                <IconButton
                                    onClick={() => onRefresh?.(localExecution.id)}
                                    size='small'
                                    sx={{
                                        color: theme.palette.text.primary,
                                        '&:hover': { backgroundColor: (theme) => theme.palette.primary.main + '20' }
                                    }}
                                    title='Refresh execution data'
                                >
                                    <IconRefresh size={20} />
                                </IconButton>
                            </Box>
                        </Box>
                    </Box>
                    <ExecutionTreeView
                        items={executionTree}
                        expandedItems={expandedItems}
                        selectedItems={selectedItem ? [selectedItem.id] : []}
                        onExpandedItemsChange={handleExpandedItemsChange}
                        onSelectedItemsChange={handleNodeSelect}
                    />
                </Box>
                <Box sx={{ flex: '1 1 65%', padding: 2, overflow: 'auto' }}>
                    {selectedItem && selectedItem.data ? (
                        <NodeExecutionDetails
                            data={selectedItem.data}
                            label={selectedItem.label}
                            status={selectedItem.status}
                            agentflowId={localExecution.agentflowId}
                            sessionId={localExecution.sessionId}
                            isPublic={isPublic}
                            onProceedSuccess={onProceedSuccess}
                        />
                    ) : (
                        <Typography color='text.secondary'>No data available for this item</Typography>
                    )}
                </Box>
            </Box>
            <ShareExecutionDialog
                show={showShareDialog}
                executionId={localExecution.id}
                onClose={() => setShowShareDialog(false)}
                onUnshare={() => {
                    updateExecutionApi.request(localExecution.id, { isPublic: false }).then(() => {
                        setShowShareDialog(false)
                        onUpdateSharing?.()
                    })
                }}
            />
        </>
    )
}

ExecutionDetailsContent.displayName = 'ExecutionDetailsContent'

export const ExecutionDetails: React.FC<{
    open?: boolean
    isPublic?: boolean
    execution: Execution | null
    onClose?: () => void
    onProceedSuccess?: () => void
    onUpdateSharing?: () => void
    onRefresh?: (executionId: string) => void
}> = ({ open, isPublic, execution, onClose, onProceedSuccess, onUpdateSharing, onRefresh }) => {
    const [drawerWidth, setDrawerWidth] = useState(Math.min(DEFAULT_DRAWER_WIDTH, MAX_DRAWER_WIDTH))
    const config = useConfigContext()

    const handleMouseDown = () => {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const newWidth = document.body.offsetWidth - e.clientX
        if (newWidth >= MIN_DRAWER_WIDTH && newWidth <= MAX_DRAWER_WIDTH) {
            setDrawerWidth(newWidth)
        }
    }, [])

    const handleMouseUp = useCallback(() => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
    }, [handleMouseMove])

    const resizeHandle = (
        <button
            aria-label='Resize drawer'
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '8px',
                cursor: 'ew-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                border: 'none',
                background: 'transparent'
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
                    color: config.isDarkMode ? 'white' : 'action.disabled'
                }}
            />
        </button>
    )

    const emptyState = (
        <Box
            sx={{
                display: 'flex',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2
            }}
        >
            <Typography color='text.secondary' variant='h6'>
                No execution selected
            </Typography>
            <Typography color='text.secondary'>Select an execution to view details</Typography>
        </Box>
    )

    if (isPublic) {
        return (
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1300,
                    backgroundColor: (theme) => theme.palette.background.paper
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative' }}>
                    {execution ? (
                        <ExecutionDetailsContent
                            execution={execution}
                            isPublic={isPublic}
                            onProceedSuccess={onProceedSuccess}
                            onUpdateSharing={onUpdateSharing}
                            onRefresh={onRefresh}
                        />
                    ) : (
                        emptyState
                    )}
                </Box>
            </Box>
        )
    }

    return (
        <Drawer
            variant='temporary'
            anchor='right'
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': { width: drawerWidth, height: '100%' }
            }}
            open={open}
            onClose={onClose}
        >
            {resizeHandle}
            {execution ? (
                <ExecutionDetailsContent
                    execution={execution}
                    isPublic={isPublic}
                    onProceedSuccess={onProceedSuccess}
                    onUpdateSharing={onUpdateSharing}
                    onRefresh={onRefresh}
                />
            ) : (
                emptyState
            )}
        </Drawer>
    )
}

ExecutionDetails.displayName = 'ExecutionDetails'
