import { useEffect, useState, useCallback } from 'react'
import moment from 'moment'
import { Typography, Box, Drawer, Chip, Button, Tooltip, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import { IconRefresh, IconExternalLink, IconCopy, IconLoader, IconShare, IconWorld, IconX } from '@tabler/icons-react'
import { useConfigContext } from '../../infrastructure/store/ConfigContext'
import { useApiContext } from '../../infrastructure/store/ApiContext'
import { useApi } from '../../infrastructure/api/hooks'
import { ExecutionTreeView } from './ExecutionTreeView'
import { NodeExecutionDetails } from './NodeExecutionDetails'
import { ShareExecutionDialog } from './ShareExecutionDialog'
import { buildTreeData, getAllNodeIds, findNode, findFirstStoppedNode } from '../../utils/tree-builder'
import type { ExecutionNode, ExecutionMetadata, ExecutionTreeItem } from '../../types'

const MIN_DRAWER_WIDTH = 400
const DEFAULT_DRAWER_WIDTH = typeof window !== 'undefined' ? window.innerWidth - 400 : 800
const MAX_DRAWER_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 1200

interface ExecutionDetailsProps {
    open?: boolean
    isPublic?: boolean
    execution?: ExecutionNode[] | null
    metadata?: ExecutionMetadata
    onClose?: () => void
    onProceedSuccess?: () => void
    onUpdateSharing?: () => void
    onRefresh?: (executionId: string) => void
}

export const ExecutionDetails = ({
    open,
    isPublic,
    execution,
    metadata,
    onClose,
    onProceedSuccess,
    onUpdateSharing,
    onRefresh
}: ExecutionDetailsProps) => {
    const [drawerWidth, setDrawerWidth] = useState(Math.min(DEFAULT_DRAWER_WIDTH, MAX_DRAWER_WIDTH))
    const [executionTree, setExecutionTree] = useState<ExecutionTreeItem[]>([])
    const [expandedItems, setExpandedItems] = useState<string[]>([])
    const [selectedItem, setSelectedItem] = useState<ExecutionTreeItem | null>(null)
    const [showShareDialog, setShowShareDialog] = useState(false)
    const [copied, setCopied] = useState(false)
    const [localMetadata, setLocalMetadata] = useState<ExecutionMetadata>({} as ExecutionMetadata)
    const theme = useTheme()
    const config = useConfigContext()
    const { executionsApi } = useApiContext()
    const updateExecutionApi = useApi(executionsApi.updateExecution)

    useEffect(() => {
        if (metadata) {
            setLocalMetadata(metadata)
        }
    }, [metadata])

    const copyToClipboard = () => {
        navigator.clipboard.writeText(localMetadata?.id || '')
        setCopied(true)
        config.onNotification?.('ID copied to clipboard', 'success')
        setTimeout(() => setCopied(false), 2000)
    }

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

    const onSharePublicly = () => {
        const newIsPublic = !localMetadata.isPublic
        updateExecutionApi.request(localMetadata.id, { isPublic: newIsPublic }).then(() => {
            setLocalMetadata((prev) => ({ ...prev, isPublic: newIsPublic }))
            config.onNotification?.(newIsPublic ? 'Execution shared publicly' : 'Execution is no longer public', 'success')
            onUpdateSharing?.()
        })
    }

    useEffect(() => {
        if (execution) {
            const newTree = buildTreeData(execution)

            if (metadata?.state === 'STOPPED') {
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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [execution, metadata])

    const handleNodeSelect = (_event: React.SyntheticEvent, itemId: string) => {
        const selectedNode = findNode(executionTree, itemId)
        setSelectedItem(selectedNode)
    }

    const handleExpandedItemsChange = (_event: React.SyntheticEvent, itemIds: string[]) => {
        setExpandedItems(itemIds)
    }

    const contentComponent = (
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
                                label={localMetadata?.agentflow?.name || localMetadata?.agentflow?.id || 'Go to AgentFlow'}
                                className={'button'}
                                onClick={() => {
                                    const pattern = config.agentCanvasUrlPattern || '/v2/agentcanvas/:id'
                                    const url = pattern.replace(':id', localMetadata?.agentflow?.id || '')
                                    window.open(url, '_blank')
                                }}
                            />
                        )}

                        {!isPublic && (
                            <Tooltip
                                title={`Execution ID: ${localMetadata?.id || ''}`}
                                placement='top'
                                disableHoverListener={!localMetadata?.id}
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

                        {!isPublic && !localMetadata.isPublic && (
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

                        {!isPublic && localMetadata.isPublic && (
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
                                {metadata?.updatedDate ? moment(metadata.updatedDate).format('MMM D, YYYY h:mm A') : 'N/A'}
                            </Typography>
                            <IconButton
                                onClick={() => onRefresh?.(localMetadata?.id)}
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
                        metadata={metadata}
                        isPublic={isPublic}
                        onProceedSuccess={onProceedSuccess}
                    />
                ) : (
                    <Typography color='text.secondary'>No data available for this item</Typography>
                )}
            </Box>
        </Box>
    )

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
                    {contentComponent}
                </Box>
            </Box>
        )
    }

    return (
        <>
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
                {contentComponent}
            </Drawer>
            <ShareExecutionDialog
                show={showShareDialog}
                executionId={localMetadata?.id}
                onClose={() => setShowShareDialog(false)}
                onUnshare={() => {
                    updateExecutionApi.request(localMetadata.id, { isPublic: false }).then(() => {
                        setLocalMetadata((prev) => ({ ...prev, isPublic: false }))
                        setShowShareDialog(false)
                        onUpdateSharing?.()
                    })
                }}
            />
        </>
    )
}

ExecutionDetails.displayName = 'ExecutionDetails'
