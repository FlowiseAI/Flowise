import React, { useRef, useContext, useState } from 'react'
import { useSelector } from 'react-redux'
import { NodeToolbar } from 'reactflow'
import { styled, useTheme, alpha, darken, lighten } from '@mui/material/styles'
import { ButtonGroup, IconButton, Box } from '@mui/material'
import { IconCopy, IconTrash } from '@tabler/icons-react'
import { Input } from './Input'
import MainCard from './MainCard'
import { flowContext } from '../AgentflowProvider'
import { RootState } from '../store'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.palette.text.primary,
    border: 'solid 1px',
    width: 'max-content',
    height: 'auto',
    padding: '10px',
    boxShadow: 'none'
}))

const StyledNodeToolbar = styled(NodeToolbar)(({ theme }) => ({
    backgroundColor: theme.palette.card.main,
    color: theme.palette.text.primary,
    padding: '5px',
    borderRadius: '10px',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)'
}))

interface StickyNoteProps {
    data: any
}

const StickyNote: React.FC<StickyNoteProps> = ({ data }) => {
    const theme = useTheme()
    const customization = useSelector((state: RootState) => state.customization)
    const ref = useRef<HTMLDivElement>(null)

    const { reactFlowInstance, deleteNode, duplicateNode } = useContext(flowContext)
    const [inputParam] = data.inputParams
    const [isHovered, setIsHovered] = useState(false)

    const defaultColor = '#666666'
    const nodeColor = data.color || defaultColor

    const getStateColor = () => {
        if (data.selected) return nodeColor
        if (isHovered) return alpha(nodeColor, 0.8)
        return alpha(nodeColor, 0.5)
    }

    const getBackgroundColor = () => {
        if (customization.isDarkMode) {
            return isHovered ? darken(nodeColor, 0.7) : darken(nodeColor, 0.8)
        }
        return isHovered ? lighten(nodeColor, 0.8) : lighten(nodeColor, 0.9)
    }

    return (
        <div ref={ref} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <StyledNodeToolbar>
                <ButtonGroup sx={{ gap: 1 }} variant='outlined'>
                    <IconButton
                        size={'small'}
                        title='Duplicate'
                        onClick={() => duplicateNode(data.id)}
                        sx={{
                            color: customization.isDarkMode ? 'white' : 'inherit',
                            '&:hover': {
                                color: theme.palette.primary.main
                            }
                        }}
                    >
                        <IconCopy size={20} />
                    </IconButton>
                    <IconButton
                        size={'small'}
                        title='Delete'
                        onClick={() => deleteNode(data.id)}
                        sx={{
                            color: customization.isDarkMode ? 'white' : 'inherit',
                            '&:hover': {
                                color: theme.palette.error.main
                            }
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
                    <Input
                        key={data.id}
                        placeholder={inputParam.placeholder}
                        inputParam={inputParam}
                        onChange={(newValue) => (data.inputs[inputParam.name] = newValue)}
                        value={data.inputs[inputParam.name] ?? inputParam.default ?? ''}
                        nodes={reactFlowInstance ? reactFlowInstance.getNodes() : []}
                        edges={reactFlowInstance ? reactFlowInstance.getEdges() : []}
                        nodeId={data.id}
                    />
                </Box>
            </CardWrapper>
        </div>
    )
}

export default StickyNote
