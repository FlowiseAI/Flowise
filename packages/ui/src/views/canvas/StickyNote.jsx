import PropTypes from 'prop-types'
import { useContext, useState, memo, useRef } from 'react'
import { useSelector } from 'react-redux'
import { NodeResizer } from 'reactflow'
import { IconCopy, IconTrash, IconPalette } from '@tabler/icons-react'
import { SketchPicker } from 'react-color'

// material-ui
import { useTheme, alpha, darken, lighten } from '@mui/material/styles'
import { IconButton, Box, Popover } from '@mui/material'

// project imports
import NodeCardWrapper from '@/ui-component/cards/NodeCardWrapper'
import NodeTooltip from '@/ui-component/tooltip/NodeTooltip'
import { Input } from '@/ui-component/input/Input'

// const
import { flowContext } from '@/store/context/ReactFlowContext'

const MIN_WIDTH = 240
const MIN_HEIGHT = 50

const StickyNote = ({ data }) => {
    const theme = useTheme()
    const canvas = useSelector((state) => state.canvas)
    const customization = useSelector((state) => state.customization)
    const { deleteNode, duplicateNode } = useContext(flowContext)
    const [inputParam] = data.inputParams

    const [open, setOpen] = useState(false)
    const [colorPickerAnchor, setColorPickerAnchor] = useState(null)
    const contentRef = useRef(null)

    const [width, setWidth] = useState(data.inputs.size?.width || MIN_WIDTH)
    const [height, setHeight] = useState(data.inputs.size?.height || MIN_HEIGHT)

    const handleClose = () => {
        setOpen(false)
    }

    const handleOpen = () => {
        setOpen(true)
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

    const defaultColor = '#FFE770' // fallback color if data.color is not present
    const nodeColor = data.color || defaultColor

    const getBorderColor = () => {
        if (data.selected) return nodeColor
        if (open) return alpha(nodeColor, 0.8)
        return alpha(nodeColor, 0.5)
    }

    const getBackgroundColor = () => {
        if (customization?.isDarkMode) {
            return data.selected ? darken(nodeColor, 0.7) : darken(nodeColor, 0.8)
        } else {
            return data.selected ? lighten(nodeColor, 0.8) : lighten(nodeColor, 0.9)
        }
    }

    const handleSizeChange = (newWidth, newHeight) => {
        setWidth(newWidth)
        setHeight(newHeight)
        data.inputs.size = { width: newWidth, height: newHeight }
    }

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
            <NodeCardWrapper
                content={false}
                sx={{
                    padding: 0,
                    borderColor: getBorderColor(),
                    backgroundColor: getBackgroundColor(),
                    height: height,
                    width: width
                }}
                border={false}
            >
                <NodeTooltip
                    open={!canvas.canvasDialogShow && (open || openColorPicker)}
                    onClose={handleClose}
                    onOpen={handleOpen}
                    disableFocusListener={true}
                    title={
                        <div
                            style={{
                                background: 'transparent',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <IconButton
                                title='Change Color'
                                onClick={handleColorPickerOpen}
                                sx={{
                                    height: '35px',
                                    width: '35px',
                                    color: customization?.isDarkMode ? 'white' : 'inherit',
                                    '&:hover': { color: theme?.palette.primary.main }
                                }}
                            >
                                <IconPalette />
                            </IconButton>
                            <IconButton
                                title='Duplicate'
                                onClick={() => {
                                    duplicateNode(data.id)
                                }}
                                sx={{
                                    height: '35px',
                                    width: '35px',
                                    color: customization?.isDarkMode ? 'white' : 'inherit',
                                    '&:hover': { color: theme?.palette.primary.main }
                                }}
                            >
                                <IconCopy />
                            </IconButton>
                            <IconButton
                                title='Delete'
                                onClick={() => {
                                    deleteNode(data.id)
                                }}
                                sx={{
                                    height: '35px',
                                    width: '35px',
                                    color: customization?.isDarkMode ? 'white' : 'inherit',
                                    '&:hover': { color: theme?.palette.error.main }
                                }}
                            >
                                <IconTrash />
                            </IconButton>
                        </div>
                    }
                    placement='right-start'
                >
                    <Box
                        ref={contentRef}
                        sx={{
                            width: '100%',
                            height: '100%',
                            overflowX: 'hidden',
                            overflowY: 'auto'
                        }}
                    >
                        <Input
                            key={data.id}
                            inputParam={inputParam}
                            onChange={(newValue) => (data.inputs[inputParam.name] = newValue)}
                            value={data.inputs[inputParam.name] ?? inputParam.default ?? ''}
                            nodes={inputParam?.acceptVariable && reactFlowInstance ? reactFlowInstance.getNodes() : []}
                            edges={inputParam?.acceptVariable && reactFlowInstance ? reactFlowInstance.getEdges() : []}
                            nodeId={data.id}
                        />
                    </Box>
                </NodeTooltip>
            </NodeCardWrapper>
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

export default memo(StickyNote)
