import { memo, useRef, useState } from 'react'

import { Box, TextField } from '@mui/material'

import type { NodeData } from '@/core/types'
import { useAgentflowContext, useConfigContext } from '@/infrastructure/store'

import { NodeToolbarActions } from '../components/NodeToolbarActions'
import { useNodeColors } from '../hooks/useNodeColors'
import { CardWrapper } from '../styled'

export interface StickyNoteProps {
    data: NodeData
}

/**
 * Sticky Note node component for adding notes to the canvas
 */
function StickyNoteComponent({ data }: StickyNoteProps) {
    const { isDarkMode } = useConfigContext()
    const { updateNodeData } = useAgentflowContext()
    const ref = useRef<HTMLDivElement>(null)

    const [inputParam] = data.inputs || []
    const [isHovered, setIsHovered] = useState(false)

    const { stateColor, backgroundColor } = useNodeColors({
        nodeColor: data.color,
        selected: data.selected,
        isDarkMode,
        isHovered
    })

    return (
        <div ref={ref} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <NodeToolbarActions nodeId={data.id} nodeName={data.name} isVisible={data.selected || isHovered} />
            <CardWrapper
                content={false}
                sx={{
                    borderColor: stateColor,
                    borderWidth: '1px',
                    boxShadow: data.selected ? `0 0 0 1px ${stateColor} !important` : 'none',
                    minHeight: 60,
                    height: 'auto',
                    backgroundColor,
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': {
                        boxShadow: data.selected ? `0 0 0 1px ${stateColor} !important` : 'none'
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
                        value={data.inputValues?.[inputParam?.name || 'note'] ?? inputParam?.default ?? ''}
                        onChange={(e) => {
                            if (inputParam) {
                                const updatedInputValues = {
                                    ...data.inputValues,
                                    [inputParam.name]: e.target.value
                                }
                                updateNodeData(data.id, { inputValues: updatedInputValues })
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
