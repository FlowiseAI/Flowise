import { memo } from 'react'
import { Position } from 'reactflow'

import { ButtonGroup, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconCopy, IconEdit, IconInfoCircle, IconTrash } from '@tabler/icons-react'

import { useAgentflowContext, useConfigContext } from '@/infrastructure/store'

import { useOpenNodeEditor } from '../hooks'
import { StyledNodeToolbar } from '../styled'

export interface NodeToolbarActionsProps {
    nodeId: string
    nodeName: string
    isVisible: boolean
    onInfoClick?: () => void
}

/**
 * Toolbar with action buttons for a node (duplicate, delete, info)
 */
function NodeToolbarActionsComponent({ nodeId, nodeName, isVisible, onInfoClick }: NodeToolbarActionsProps) {
    const theme = useTheme()
    const { isDarkMode } = useConfigContext()
    const { deleteNode, duplicateNode } = useAgentflowContext()
    const { openNodeEditor } = useOpenNodeEditor()

    const handleEditClick = () => {
        openNodeEditor(nodeId)
    }

    // ReactFlow's NodeToolbar treats `isVisible={false}` differently from `isVisible={undefined}`.
    // When `false`, the toolbar is force-hidden; when `undefined`, it falls back to ReactFlow's
    // internal hover logic. We want force-show (true) or default behavior (undefined), never force-hide.
    return (
        <StyledNodeToolbar position={Position.Top} offset={5} align='end' isVisible={isVisible || undefined}>
            <ButtonGroup sx={{ gap: 1 }} variant='outlined' aria-label='Node actions'>
                {nodeName !== 'startAgentflow' && (
                    <IconButton
                        size='small'
                        title='Duplicate'
                        onClick={() => duplicateNode(nodeId)}
                        sx={{
                            color: isDarkMode ? 'white' : 'inherit',
                            '&:hover': { color: theme.palette.primary.main }
                        }}
                    >
                        <IconCopy size={20} />
                    </IconButton>
                )}
                <IconButton
                    size='small'
                    title='Edit'
                    onClick={handleEditClick}
                    sx={{
                        color: isDarkMode ? 'white' : theme.palette.grey[600],
                        '&:hover': { color: theme.palette.primary.main }
                    }}
                >
                    <IconEdit size={20} />
                </IconButton>
                <IconButton
                    size='small'
                    title='Delete'
                    onClick={() => deleteNode(nodeId)}
                    sx={{
                        color: isDarkMode ? 'white' : 'inherit',
                        '&:hover': { color: theme.palette.error.main }
                    }}
                >
                    <IconTrash size={20} />
                </IconButton>
                {onInfoClick && (
                    <IconButton
                        size='small'
                        title='Info'
                        onClick={onInfoClick}
                        sx={{
                            color: isDarkMode ? 'white' : 'inherit',
                            '&:hover': { color: theme.palette.info.main }
                        }}
                    >
                        <IconInfoCircle size={20} />
                    </IconButton>
                )}
            </ButtonGroup>
        </StyledNodeToolbar>
    )
}

export const NodeToolbarActions = memo(NodeToolbarActionsComponent)
