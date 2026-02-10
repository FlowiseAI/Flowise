import { memo, useRef, useState } from 'react'
import { NodeToolbar } from 'reactflow'

import { Box, ButtonGroup, IconButton, TextField } from '@mui/material'
import { alpha, darken, lighten, styled, useTheme } from '@mui/material/styles'
import { IconCopy, IconTrash } from '@tabler/icons-react'

import { MainCard } from '../../../atoms'
import type { NodeData } from '../../../core/types'
import { useAgentflowContext, useConfigContext } from '../../../infrastructure/store'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: (theme.palette as unknown as { card?: { main?: string } }).card?.main || theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: 'solid 1px',
    width: 'max-content',
    height: 'auto',
    padding: '10px',
    boxShadow: 'none'
}))

const StyledNodeToolbar = styled(NodeToolbar)(({ theme }) => ({
    backgroundColor: (theme.palette as unknown as { card?: { main?: string } }).card?.main || theme.palette.background.paper,
    color: theme.palette.text.primary,
    padding: '5px',
    borderRadius: '10px',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)'
}))

export interface StickyNoteProps {
    data: NodeData
}

/**
 * Sticky Note node component for adding notes to the canvas
 *
 * TODO: Refactor - Significant code duplication exists between AgentFlowNode,
 * IterationNode, and StickyNote components. Consider extracting common UI patterns
 * (color handling, hover states, handles, toolbar) into reusable wrapper components.
 */
function StickyNoteComponent({ data }: StickyNoteProps) {
    const theme = useTheme()
    const { isDarkMode } = useConfigContext()
    const ref = useRef<HTMLDivElement>(null)

    const { deleteNode, duplicateNode } = useAgentflowContext()
    const [inputParam] = data.inputParams || []
    const [isHovered, setIsHovered] = useState(false)

    const defaultColor = '#666666'
    const nodeColor = data.color || defaultColor

    const getStateColor = () => {
        if (data.selected) return nodeColor
        if (isHovered) return alpha(nodeColor, 0.8)
        return alpha(nodeColor, 0.5)
    }

    const getBackgroundColor = () => {
        if (isDarkMode) {
            return isHovered ? darken(nodeColor, 0.7) : darken(nodeColor, 0.8)
        }
        return isHovered ? lighten(nodeColor, 0.8) : lighten(nodeColor, 0.9)
    }

    return (
        <div ref={ref} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <StyledNodeToolbar>
                <ButtonGroup sx={{ gap: 1 }} variant='outlined' aria-label='Node actions'>
                    <IconButton
                        size='small'
                        title='Duplicate'
                        onClick={() => duplicateNode(data.id)}
                        sx={{
                            color: isDarkMode ? 'white' : 'inherit',
                            '&:hover': { color: theme.palette.primary.main }
                        }}
                    >
                        <IconCopy size={20} />
                    </IconButton>
                    <IconButton
                        size='small'
                        title='Delete'
                        onClick={() => deleteNode(data.id)}
                        sx={{
                            color: isDarkMode ? 'white' : 'inherit',
                            '&:hover': { color: theme.palette.error.main }
                        }}
                    >
                        <IconTrash size={20} />
                    </IconButton>
                </ButtonGroup>
            </StyledNodeToolbar>
            <CardWrapper
                content={false}
                sx={{
                    borderColor: getStateColor(),
                    borderWidth: '1px',
                    boxShadow: data.selected ? `0 0 0 1px ${getStateColor()} !important` : 'none',
                    minHeight: 60,
                    height: 'auto',
                    backgroundColor: getBackgroundColor(),
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': {
                        boxShadow: data.selected ? `0 0 0 1px ${getStateColor()} !important` : 'none'
                    }
                }}
                border={false}
            >
                <Box>
                    <TextField
                        key={data.id}
                        multiline
                        rows={3}
                        placeholder={inputParam?.placeholder || 'Add a note...'}
                        value={data.inputs?.[inputParam?.name || 'note'] ?? inputParam?.default ?? ''}
                        onChange={(e) => {
                            if (data.inputs && inputParam) {
                                data.inputs[inputParam.name] = e.target.value
                            }
                        }}
                        sx={{
                            '& .MuiInputBase-root': {
                                background: 'transparent',
                                border: 'none'
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                                border: 'none'
                            }
                        }}
                    />
                </Box>
            </CardWrapper>
        </div>
    )
}

export const StickyNote = memo(StickyNoteComponent)
export default StickyNote
