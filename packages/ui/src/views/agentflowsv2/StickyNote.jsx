import PropTypes from 'prop-types'
import { useRef, useContext, useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { NodeToolbar, NodeResizer } from 'reactflow'

// material-ui
import { styled, useTheme, alpha, darken, lighten } from '@mui/material/styles'

// project imports
import { ButtonGroup, IconButton, Box, Popover, Stack } from '@mui/material'
import { IconCopy, IconMarkdown, IconMarkdownOff, IconPalette, IconTrash } from '@tabler/icons-react'
import { Input } from '@/ui-component/input/Input'
import MainCard from '@/ui-component/cards/MainCard'
import { MemoizedReactMarkdown } from '@/ui-component/markdown/MemoizedReactMarkdown'

// const
import { flowContext } from '@/store/context/ReactFlowContext'
import { DEFAULT_STICKY_NOTE_COLOR } from '@/utils/genericHelper'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.darkTextPrimary,
    border: 'solid 1px',
    width: 'max-content',
    height: 'auto',
    padding: '10px',
    boxShadow: 'none'
}))

const StyledNodeToolbar = styled(NodeToolbar)(({ theme }) => ({
    backgroundColor: theme.palette.card.main,
    color: theme.darkTextPrimary,
    padding: '5px',
    borderRadius: '10px',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)'
}))

const StickyNote = ({ data, selected }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const ref = useRef(null)

    const { reactFlowInstance, deleteNode, duplicateNode } = useContext(flowContext)
    const [inputParam] = data.inputParams
    const [isHovered, setIsHovered] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [anchorEl, setAnchorEl] = useState(null)
    const colorOptions = useMemo(
        () => ['#FFE770', '#B4F8C8', '#A0C4FF', '#FFADAD', '#FFD6A5'],
        []
    )
    const [noteValue, setNoteValue] = useState(data.inputs?.[inputParam.name] ?? inputParam.default ?? '')

    const defaultColor = DEFAULT_STICKY_NOTE_COLOR // fallback color if data.color is not present
    const nodeColor = data.color || defaultColor

    // Get different shades of the color based on state
    const getStateColor = () => {
        if (selected) return nodeColor
        if (isHovered) return alpha(nodeColor, 0.8)
        return alpha(nodeColor, 0.5)
    }

    const getBackgroundColor = () => {
        if (customization.isDarkMode) {
            return isHovered ? darken(nodeColor, 0.4) : darken(nodeColor, 0.5)
        }
        return isHovered ? lighten(nodeColor, 0.1) : lighten(nodeColor, 0.2)
    }

    useEffect(() => {
        if (!data.color) {
            data.color = defaultColor
        }
    }, [data, defaultColor])

    const currentNoteValue = data.inputs?.[inputParam.name]

    useEffect(() => {
        const latestValue = currentNoteValue ?? inputParam.default ?? ''
        setNoteValue(latestValue)
    }, [currentNoteValue, inputParam.default, inputParam.name])

    const handleToggleEditing = () => {
        setIsEditing((prev) => !prev)
    }

    const handleColorButtonClick = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleColorSelect = (color) => {
        data.color = color
        setAnchorEl(null)
    }

    return (
        <div
            ref={ref}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ position: 'relative', width: '100%', height: '100%' }}
        >
            <StyledNodeToolbar>
                <ButtonGroup sx={{ gap: 1 }} variant='outlined' aria-label='Basic button group'>
                    <IconButton
                        size={'small'}
                        title='Change color'
                        onClick={handleColorButtonClick}
                        sx={{
                            color: customization.isDarkMode ? 'white' : 'inherit',
                            '&:hover': {
                                color: theme.palette.primary.main
                            }
                        }}
                    >
                        <IconPalette size={20} />
                    </IconButton>
                    <IconButton
                        size={'small'}
                        title={isEditing ? 'Preview markdown' : 'Edit markdown'}
                        onClick={handleToggleEditing}
                        sx={{
                            color: customization.isDarkMode ? 'white' : 'inherit',
                            '&:hover': {
                                color: theme.palette.primary.main
                            }
                        }}
                    >
                        {isEditing ? <IconMarkdown size={20} /> : <IconMarkdownOff size={20} />}
                    </IconButton>
                    <IconButton
                        size={'small'}
                        title='Duplicate'
                        onClick={() => {
                            duplicateNode(data.id)
                        }}
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
                        onClick={() => {
                            deleteNode(data.id)
                        }}
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
                    boxShadow: selected ? `0 0 0 1px ${getStateColor()} !important` : 'none',
                    minHeight: 160,
                    height: '100%',
                    width: '100%',
                    backgroundColor: getBackgroundColor(),
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                        boxShadow: selected ? `0 0 0 1px ${getStateColor()} !important` : 'none'
                    }
                }}
                border={false}
            >
                <Box sx={{ p: 1, width: '100%', height: '100%', overflow: 'auto', flex: 1 }}>
                    {isEditing ? (
                        <Input
                            key={data.id}
                            placeholder={inputParam.placeholder}
                            inputParam={inputParam}
                            onChange={(newValue) => {
                                data.inputs[inputParam.name] = newValue
                                setNoteValue(newValue)
                            }}
                            value={noteValue}
                            nodes={reactFlowInstance ? reactFlowInstance.getNodes() : []}
                            edges={reactFlowInstance ? reactFlowInstance.getEdges() : []}
                            nodeId={data.id}
                        />
                    ) : (
                        <MemoizedReactMarkdown>{noteValue || '*Add your note here...*'}</MemoizedReactMarkdown>
                    )}
                </Box>
            </CardWrapper>
            <NodeResizer minWidth={180} minHeight={140} isVisible={selected} />
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Stack direction='row' spacing={1} sx={{ p: 1 }}>
                    {colorOptions.map((color) => (
                        <Box
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: color,
                                cursor: 'pointer',
                                border: color === nodeColor ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent'
                            }}
                        />
                    ))}
                </Stack>
            </Popover>
        </div>
    )
}

StickyNote.propTypes = {
    data: PropTypes.object,
    selected: PropTypes.bool
}

export default StickyNote
