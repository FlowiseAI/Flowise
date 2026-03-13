import PropTypes from 'prop-types'
import { useRef, useContext, useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { NodeToolbar, NodeResizer } from 'reactflow'
import { IconCopy, IconTrash, IconPalette } from '@tabler/icons-react'
import { SketchPicker } from 'react-color'

// material-ui
import { styled, useTheme, alpha, darken, lighten } from '@mui/material/styles'
import { ButtonGroup, IconButton, Box, Popover } from '@mui/material'

// project imports
import { Input } from '@/ui-component/input/Input'
import MainCard from '@/ui-component/cards/MainCard'

// const
import { flowContext } from '@/store/context/ReactFlowContext'

const MIN_WIDTH = 240
const MIN_HEIGHT = 65

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

const StickyNote = ({ data }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const ref = useRef(null)

    const { reactFlowInstance, deleteNode, duplicateNode } = useContext(flowContext)
    const [inputParam] = data.inputParams
    const [isHovered, setIsHovered] = useState(false)
    const [openToolbar, setOpenToolbar] = useState(false)
    const [colorPickerAnchor, setColorPickerAnchor] = useState(null)
    const [width, setWidth] = useState(data.inputs.size?.width || MIN_WIDTH)
    const [height, setHeight] = useState(data.inputs.size?.height || MIN_HEIGHT)

    const defaultColor = '#666666' // fallback color if data.color is not present
    const nodeColor = data.color || defaultColor

    useEffect(() => {
        if (data.selected) {
            setOpenToolbar(true)
        } else {
            setOpenToolbar(false)
        }
    }, [data.selected])

    // Get different shades of the color based on state
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

    const handleSizeChange = (newWidth, newHeight) => {
        setWidth(newWidth)
        setHeight(newHeight)
        data.inputs.size = { width: newWidth, height: newHeight }
    }

    const handleColorPickerOpen = (event) => {
        setColorPickerAnchor(event.currentTarget)
    }

    const handleColorPickerClose = () => {
        setColorPickerAnchor(null)
    }

    const handleColorChange = (color) => {
        data.color = color.hex
    }

    const openColorPicker = Boolean(colorPickerAnchor)

    return (
        <>
            <NodeResizer
                color='transparent'
                isVisible={true}
                minWidth={MIN_WIDTH}
                minHeight={MIN_HEIGHT}
                onResize={(_event, direction) => {
                    setWidth(direction.width)
                    setHeight(direction.height)
                }}
                onResizeEnd={(_event, direction) => {
                    handleSizeChange(direction.width, direction.height)
                }}
            />
            <div ref={ref} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                <StyledNodeToolbar isVisible={openToolbar || openColorPicker}>
                    <ButtonGroup sx={{ gap: 1 }} variant='outlined' aria-label='Basic button group'>
                        <IconButton
                            size={'small'}
                            title='Change Color'
                            onClick={handleColorPickerOpen}
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
                        boxShadow: data.selected ? `0 0 0 1px ${getStateColor()} !important` : 'none',
                        width: width,
                        height: height,
                        backgroundColor: getBackgroundColor(),
                        overflow: 'hidden',
                        '&:hover': {
                            boxShadow: data.selected ? `0 0 0 1px ${getStateColor()} !important` : 'none'
                        }
                    }}
                    border={false}
                >
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            overflowX: 'hidden',
                            overflowY: 'auto'
                        }}
                    >
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
            <Popover
                open={openColorPicker}
                anchorEl={colorPickerAnchor}
                onClose={handleColorPickerClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left'
                }}
                slotProps={{
                    paper: {
                        sx: {
                            marginLeft: '16px'
                        }
                    }
                }}
            >
                <SketchPicker color={nodeColor} onChange={handleColorChange} />
            </Popover>
        </>
    )
}

StickyNote.propTypes = {
    data: PropTypes.object
}

export default StickyNote
