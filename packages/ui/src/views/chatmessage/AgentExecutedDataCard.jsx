import { useEffect, useState, useCallback, forwardRef } from 'react'
import PropTypes from 'prop-types'

// MUI
import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import {
    Typography,
    Box,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
    Button,
    Dialog,
    DialogContent,
    DialogActions
} from '@mui/material'
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { IconButton } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { IconArrowsMaximize, IconLoader, IconCircleXFilled } from '@tabler/icons-react'

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

function CustomLabel({ icon: Icon, itemStatus, children, name, label, data, metadata, ...other }) {
    const [openDialog, setOpenDialog] = useState(false)

    const handleOpenDialog = (event) => {
        // Stop propagation to prevent parent elements from capturing the click
        event.stopPropagation()
        setOpenDialog(true)
    }

    const handleCloseDialog = () => setOpenDialog(false)

    return (
        <TreeItem2Label
            {...other}
            sx={{
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'column'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
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
                <IconButton
                    onClick={handleOpenDialog}
                    size='small'
                    title='View Details'
                    sx={{
                        ml: 2,
                        zIndex: 10 // Increase z-index to ensure the button is clickable
                    }}
                >
                    <IconArrowsMaximize size={15} color={'teal'} />
                </IconButton>
                {Icon && <Box component={Icon} className='labelIcon' color={getIconColor(itemStatus)} sx={{ ml: 1, fontSize: '1.2rem' }} />}
            </Box>
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth='md' fullWidth disableBackdropClick={true}>
                <DialogContent onClick={(e) => e.stopPropagation()}>
                    {data ? (
                        <NodeExecutionDetails data={data} label={label} metadata={metadata} />
                    ) : (
                        <Typography color='text.secondary'>No data available for this item</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Close</Button>
                </DialogActions>
            </Dialog>
        </TreeItem2Label>
    )
}

CustomLabel.propTypes = {
    icon: PropTypes.elementType,
    itemStatus: PropTypes.string,
    expandable: PropTypes.bool,
    children: PropTypes.node,
    name: PropTypes.string,
    label: PropTypes.string,
    status: PropTypes.object,
    data: PropTypes.object,
    metadata: PropTypes.object
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
            return (props) => <IconCircleXFilled {...props} color={theme.palette.error.main} />
        case 'STOPPED':
            return StopCircleIcon
        case 'INPROGRESS':
            // eslint-disable-next-line react/display-name
            return (props) => (
                // eslint-disable-next-line
                <IconLoader {...props} color={theme.palette.warning.dark} className={`spin-animation ${props.className || ''}`} />
            )
    }
}

const CustomTreeItem = forwardRef(function CustomTreeItem(props, ref) {
    const { id, itemId, label, disabled, children, agentflowId, sessionId, ...other } = props
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
                            name: item.name || item.id?.split('_')[0],
                            label: item.label,
                            status,
                            data: item.data,
                            metadata: { agentflowId, sessionId }
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
    agentflowId: PropTypes.string,
    sessionId: PropTypes.string,
    className: PropTypes.string
}

CustomTreeItem.displayName = 'CustomTreeItem'

export const AgentExecutedDataCard = ({ status, execution, agentflowId, sessionId }) => {
    const [executionTree, setExecution] = useState([])
    const [expandedItems, setExpandedItems] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const theme = useTheme()

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
            setExecution(newTree)
            setExpandedItems(getAllNodeIds(newTree))
            // Set the first item as default selected item
            if (newTree.length > 0) {
                setSelectedItem(newTree[0])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [execution])

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

    const getExecutionStatus = useCallback((executionTree) => {
        const getAllStatuses = (nodes) => {
            let statuses = []
            nodes.forEach((node) => {
                if (node.status) statuses.push(node.status)
                if (node.children && node.children.length > 0) {
                    statuses = [...statuses, ...getAllStatuses(node.children)]
                }
            })
            return statuses
        }

        const statuses = getAllStatuses(executionTree)
        if (statuses.includes('ERROR')) return 'ERROR'
        if (statuses.includes('INPROGRESS')) return 'INPROGRESS'
        if (statuses.includes('STOPPED')) return 'STOPPED'
        if (statuses.every((status) => status === 'FINISHED')) return 'FINISHED'
        return null
    }, [])

    return (
        <Box sx={{ display: 'flex', height: '100%', width: '100%', mt: 2 }}>
            <Accordion
                sx={{
                    width: '100%'
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                        '& .MuiAccordionSummary-content': {
                            alignItems: 'center'
                        }
                    }}
                >
                    {executionTree.length > 0 &&
                        (() => {
                            const execStatus = status ?? getExecutionStatus(executionTree)
                            return (
                                <Box sx={{ mr: 1, fontSize: '1.2rem' }}>
                                    <Box
                                        component={getIconFromStatus(execStatus, theme)}
                                        sx={{
                                            mr: 1,
                                            fontSize: '1.2rem',
                                            color: getIconColor(execStatus)
                                        }}
                                    />
                                </Box>
                            )
                        })()}
                    <Typography>Process Flow</Typography>
                </AccordionSummary>
                <Divider />
                <AccordionDetails>
                    <RichTreeView
                        expandedItems={expandedItems}
                        onExpandedItemsChange={handleExpandedItemsChange}
                        selectedItems={selectedItem ? [selectedItem.id] : []}
                        onSelectedItemsChange={handleNodeSelect}
                        items={executionTree}
                        slots={{
                            item: (treeItemProps) => <CustomTreeItem {...treeItemProps} agentflowId={agentflowId} sessionId={sessionId} />
                        }}
                        sx={{ width: '100%' }}
                    />
                </AccordionDetails>
            </Accordion>
        </Box>
    )
}

AgentExecutedDataCard.propTypes = {
    status: PropTypes.string,
    execution: PropTypes.array,
    agentflowId: PropTypes.string,
    sessionId: PropTypes.string
}
