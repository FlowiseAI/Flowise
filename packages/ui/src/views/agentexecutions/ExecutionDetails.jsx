import { useEffect, useState, useCallback, forwardRef } from 'react'
import PropTypes from 'prop-types'
import moment from 'moment'
import { useSelector } from 'react-redux'

// MUI
import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import { Typography, Box, Drawer, Chip } from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import { useTreeItem2 } from '@mui/x-tree-view/useTreeItem2'
import {
    TreeItem2Content,
    TreeItem2IconContainer,
    TreeItem2GroupTransition,
    TreeItem2Label,
    TreeItem2Root,
    TreeItem2Checkbox
} from '@mui/x-tree-view/TreeItem2'
import { TreeItem2Icon } from '@mui/x-tree-view/TreeItem2Icon'
import { TreeItem2Provider } from '@mui/x-tree-view/TreeItem2Provider'
import { TreeItem2DragAndDropOverlay } from '@mui/x-tree-view/TreeItem2DragAndDropOverlay'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { IconButton } from '@mui/material'
import { IconRefresh, IconExternalLink, IconCopy, IconLoader, IconCircleXFilled } from '@tabler/icons-react'

// Project imports
import { useTheme } from '@mui/material/styles'
import { FLOWISE_CREDENTIAL_ID, AGENTFLOW_ICONS } from '@/store/constant'
import { NodeExecutionDetails } from '@/views/agentexecutions/NodeExecutionDetails'

const getIconColor = (status) => {
    switch (status) {
        case 'FINISHED':
            return 'success.dark'
        case 'ERROR':
        case 'TIMEOUT':
            return 'error.main'
        case 'TERMINATED':
        case 'STOPPED':
            return 'error.main'
        case 'INPROGRESS':
            return 'warning.dark'
    }
}

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
    [`&.Mui-expanded `]: {
        '&:not(.Mui-focused, .Mui-selected, .Mui-selected.Mui-focused) .labelIcon': {
            color: theme.palette.primary.dark,
            ...theme.applyStyles('light', {
                color: theme.palette.primary.main
            })
        },
        '&::before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            left: '16px',
            top: '44px',
            height: 'calc(100% - 48px)',
            width: '1.5px',
            backgroundColor: theme.palette.grey[700],
            ...theme.applyStyles('light', {
                backgroundColor: theme.palette.grey[300]
            })
        }
    },
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        color: 'white',
        ...theme.applyStyles('light', {
            color: theme.palette.primary.main
        })
    },
    [`&.Mui-focused, &.Mui-selected, &.Mui-selected.Mui-focused`]: {
        backgroundColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText,
        ...theme.applyStyles('light', {
            backgroundColor: theme.palette.primary.main
        })
    }
}))

const StyledTreeItemLabelText = styled(Typography)(({ theme }) => ({
    color: theme.palette.text.primary
}))

function CustomLabel({ icon: Icon, itemStatus, children, name, ...other }) {
    return (
        <TreeItem2Label
            {...other}
            sx={{
                display: 'flex',
                alignItems: 'center'
            }}
        >
            {(() => {
                const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === name)
                if (foundIcon) {
                    return (
                        <Box
                            sx={{
                                mr: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <foundIcon.icon size={20} color={foundIcon.color} />
                        </Box>
                    )
                }
                return null
            })()}

            <StyledTreeItemLabelText sx={{ flex: 1 }}>{children}</StyledTreeItemLabelText>

            {Icon && <Box component={Icon} className='labelIcon' color={getIconColor(itemStatus)} sx={{ ml: 1, fontSize: '1.2rem' }} />}
        </TreeItem2Label>
    )
}

CustomLabel.propTypes = {
    icon: PropTypes.func,
    itemStatus: PropTypes.string,
    children: PropTypes.node,
    name: PropTypes.string
}

CustomLabel.displayName = 'CustomLabel'

const isExpandable = (reactChildren) => {
    if (Array.isArray(reactChildren)) {
        return reactChildren.length > 0 && reactChildren.some(isExpandable)
    }
    return Boolean(reactChildren)
}

const getIconFromStatus = (status, theme) => {
    switch (status) {
        case 'FINISHED':
            return CheckCircleIcon
        case 'ERROR':
        case 'TIMEOUT':
            return ErrorIcon
        case 'TERMINATED':
            // eslint-disable-next-line react/display-name
            return (props) => {
                const IconWrapper = (props) => <IconCircleXFilled {...props} color={theme.palette.error.main} />
                IconWrapper.displayName = 'TerminatedIcon'
                return <IconWrapper {...props} />
            }
        case 'STOPPED':
            return StopCircleIcon
        case 'INPROGRESS':
            // eslint-disable-next-line react/display-name
            return (props) => {
                const IconWrapper = (props) => (
                    // eslint-disable-next-line
                    <IconLoader {...props} color={theme.palette.warning.dark} className={`spin-animation ${props.className || ''}`} />
                )
                IconWrapper.displayName = 'InProgressIcon'
                return <IconWrapper {...props} />
            }
    }
}

const CustomTreeItem = forwardRef(function CustomTreeItem(props, ref) {
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

    const item = publicAPI.getItem(itemId)
    const expandable = isExpandable(children)
    let icon
    if (item.status) {
        icon = getIconFromStatus(item.status, theme)
    }

    return (
        <TreeItem2Provider itemId={itemId}>
            <StyledTreeItemRoot {...getRootProps(other)}>
                <CustomTreeItemContent {...getContentProps()}>
                    <TreeItem2IconContainer {...getIconContainerProps()}>
                        <TreeItem2Icon status={status} />
                    </TreeItem2IconContainer>
                    <TreeItem2Checkbox {...getCheckboxProps()} />
                    <CustomLabel
                        {...getLabelProps({
                            icon,
                            itemStatus: item.status,
                            expandable: expandable && status.expanded,
                            name: item.name || item.id?.split('_')[0]
                        })}
                    />
                    <TreeItem2DragAndDropOverlay {...getDragAndDropOverlayProps()} />
                </CustomTreeItemContent>
                {children && (
                    <TreeItem2GroupTransition
                        {...getGroupTransitionProps()}
                        style={{
                            borderLeft: `${status.selected ? '3px solid' : '1px dashed'} ${(() => {
                                const nodeName = item.name || item.id?.split('_')[0]
                                const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === nodeName)
                                return foundIcon ? foundIcon.color : theme.palette.primary.main
                            })()}`,
                            marginLeft: '13px',
                            paddingLeft: '8px'
                        }}
                    />
                )}
            </StyledTreeItemRoot>
        </TreeItem2Provider>
    )
})

CustomTreeItem.propTypes = {
    id: PropTypes.string,
    itemId: PropTypes.string,
    label: PropTypes.string,
    disabled: PropTypes.bool,
    children: PropTypes.node,
    className: PropTypes.string
}

const MIN_DRAWER_WIDTH = 400
const DEFAULT_DRAWER_WIDTH = window.innerWidth - 400
const MAX_DRAWER_WIDTH = window.innerWidth

export const ExecutionDetails = ({ open, execution, metadata, onClose, onProceedSuccess }) => {
    const [drawerWidth, setDrawerWidth] = useState(Math.min(DEFAULT_DRAWER_WIDTH, MAX_DRAWER_WIDTH))
    const [executionTree, setExecution] = useState([])
    const [expandedItems, setExpandedItems] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const handleMouseDown = () => {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }

    const handleMouseMove = useCallback((e) => {
        const newWidth = document.body.offsetWidth - e.clientX
        if (newWidth >= MIN_DRAWER_WIDTH && newWidth <= MAX_DRAWER_WIDTH) {
            setDrawerWidth(newWidth)
        }
    }, [])

    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
    }

    const getAllNodeIds = (nodes) => {
        let ids = []
        nodes.forEach((node) => {
            ids.push(node.id)
            if (node.children && node.children.length > 0) {
                ids = [...ids, ...getAllNodeIds(node.children)]
            }
        })
        return ids
    }

    // Transform the execution data into a tree structure
    const buildTreeData = (nodes) => {
        // for each node, loop through each and every nested key of node.data, and remove the key if it is equal to FLOWISE_CREDENTIAL_ID
        nodes.forEach((node) => {
            const removeFlowiseCredentialId = (data) => {
                for (const key in data) {
                    if (key === FLOWISE_CREDENTIAL_ID) {
                        delete data[key]
                    }
                    if (typeof data[key] === 'object') {
                        removeFlowiseCredentialId(data[key])
                    }
                }
            }
            removeFlowiseCredentialId(node.data)
        })

        // Create a map for quick node lookup
        // Use execution index to make each node instance unique
        const nodeMap = new Map()
        nodes.forEach((node, index) => {
            const uniqueNodeId = `${node.nodeId}_${index}`
            nodeMap.set(uniqueNodeId, { ...node, uniqueNodeId, children: [], executionIndex: index })
        })

        // Root nodes have no previous nodes
        const rootNodes = []

        // Build the tree structure
        nodes.forEach((node, index) => {
            const uniqueNodeId = `${node.nodeId}_${index}`
            const treeNode = nodeMap.get(uniqueNodeId)

            if (node.previousNodeIds.length === 0) {
                rootNodes.push(treeNode)
            } else {
                // Find the most recent previous node instances
                // For each previous node ID, find the most recent instance that occurred before this node
                node.previousNodeIds.forEach((parentId) => {
                    let mostRecentParentIndex = -1

                    // Find the most recent instance of the parent node that occurred before this node
                    for (let i = 0; i < index; i++) {
                        if (nodes[i].nodeId === parentId) {
                            mostRecentParentIndex = i
                        }
                    }

                    if (mostRecentParentIndex !== -1) {
                        const parentUniqueId = `${parentId}_${mostRecentParentIndex}`
                        const parentNode = nodeMap.get(parentUniqueId)
                        if (parentNode) {
                            parentNode.children.push(treeNode)
                        }
                    }
                })
            }
        })

        // Transform to the required format
        const transformNode = (node) => ({
            id: node.uniqueNodeId,
            label: node.nodeLabel,
            name: node.data?.name,
            status: node.status,
            data: node.data,
            children: node.children.map(transformNode)
        })

        return rootNodes.map(transformNode)
    }

    const handleExpandedItemsChange = (event, itemIds) => {
        setExpandedItems(itemIds)
    }

    useEffect(() => {
        if (execution) {
            const newTree = buildTreeData(execution)

            // Find first stopped item if metadata state is STOPPED
            if (metadata?.state === 'STOPPED') {
                const findFirstStoppedNode = (nodes) => {
                    for (const node of nodes) {
                        if (node.status === 'STOPPED') return node
                        if (node.children) {
                            const found = findFirstStoppedNode(node.children)
                            if (found) return found
                        }
                    }
                    return null
                }
                const stoppedNode = findFirstStoppedNode(newTree)

                if (stoppedNode) {
                    setExpandedItems(getAllNodeIds(newTree))
                    setSelectedItem(stoppedNode)
                } else {
                    setExpandedItems(getAllNodeIds(newTree))
                    // Set the first item as default selected item
                    if (newTree.length > 0) {
                        setSelectedItem(newTree[0])
                    }
                }
            } else {
                setExpandedItems(getAllNodeIds(newTree))
                // Set the first item as default selected item
                if (newTree.length > 0) {
                    setSelectedItem(newTree[0])
                }
            }
            setExecution(newTree)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [execution, metadata])

    const handleNodeSelect = (event, itemId) => {
        const findNode = (nodes, id) => {
            for (const node of nodes) {
                if (node.id === id) return node
                if (node.children) {
                    const found = findNode(node.children, id)
                    if (found) return found
                }
            }
            return null
        }
        const selectedNode = findNode(executionTree, itemId)
        setSelectedItem(selectedNode)
    }

    const handleRefresh = () => {
        // TODO: Implement refresh logic
    }

    return (
        <Drawer
            variant='temporary'
            anchor='right'
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: drawerWidth,
                    height: '100%'
                }
            }}
            open={open}
            onClose={onClose}
        >
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
                    background: 'transparent',
                    '&:hover': {
                        background: 'rgba(0, 0, 0, 0.1)'
                    }
                }}
                onMouseDown={handleMouseDown}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        // Start resize mode
                        handleMouseDown()
                    }
                }}
            >
                <DragHandleIcon
                    sx={{
                        transform: 'rotate(90deg)',
                        fontSize: '20px',
                        color: customization.isDarkMode ? 'white' : 'action.disabled'
                    }}
                />
            </button>
            <Box sx={{ display: 'flex', height: '100%', flexDirection: 'row' }}>
                <Box
                    sx={{
                        flex: '1 1 35%',
                        padding: 2,
                        borderRight: 1,
                        borderColor: 'divider'
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
                            <Chip
                                icon={<IconExternalLink size={15} />}
                                variant='outlined'
                                label={metadata?.agentflow?.name || metadata?.agentflow?.id || 'Go to AgentFlow'}
                                className={'button'}
                                onClick={() => window.open(`/v2/agentcanvas/${metadata?.agentflow?.id}`, '_blank')}
                            />

                            <Chip
                                sx={{ ml: 1 }}
                                icon={<IconCopy size={15} />}
                                variant='outlined'
                                label={'Copy ID'}
                                className={'button'}
                                onClick={() => navigator.clipboard.writeText(metadata?.id)}
                            />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', alignContent: 'center' }}>
                                <Typography sx={{ flex: 1, mt: 1 }} color='text.primary'>
                                    {metadata?.updatedDate ? moment(metadata.updatedDate).format('MMM D, YYYY h:mm A') : 'N/A'}
                                </Typography>
                                <IconButton
                                    onClick={handleRefresh}
                                    size='small'
                                    sx={{
                                        color: theme.palette.text.primary,
                                        '&:hover': {
                                            backgroundColor: (theme) => theme.palette.primary.main + '20'
                                        }
                                    }}
                                    title='Refresh execution data'
                                >
                                    <IconRefresh size={20} />
                                </IconButton>
                            </Box>
                        </Box>
                    </Box>
                    <RichTreeView
                        expandedItems={expandedItems}
                        onExpandedItemsChange={handleExpandedItemsChange}
                        selectedItems={selectedItem ? [selectedItem.id] : []}
                        onSelectedItemsChange={handleNodeSelect}
                        items={executionTree}
                        slots={{
                            item: CustomTreeItem
                        }}
                    />
                </Box>
                <Box
                    sx={{
                        flex: '1 1 65%',
                        padding: 2,
                        overflow: 'auto'
                    }}
                >
                    {selectedItem && selectedItem.data ? (
                        <NodeExecutionDetails
                            data={selectedItem.data}
                            label={selectedItem.label}
                            status={selectedItem.status}
                            metadata={metadata}
                            onProceedSuccess={onProceedSuccess}
                        />
                    ) : (
                        <Typography color='text.secondary'>No data available for this item</Typography>
                    )}
                </Box>
            </Box>
        </Drawer>
    )
}

ExecutionDetails.propTypes = {
    open: PropTypes.bool,
    execution: PropTypes.array,
    metadata: PropTypes.object,
    onClose: PropTypes.func,
    onProceedSuccess: PropTypes.func
}

ExecutionDetails.displayName = 'ExecutionDetails'
