import PropTypes from 'prop-types'
import { useContext, useEffect, useMemo, useState, memo } from 'react'
import { useSelector } from 'react-redux'
import { NodeResizer } from 'reactflow'

// material-ui
import { useTheme, darken, lighten } from '@mui/material/styles'

// project imports
import NodeCardWrapper from '@/ui-component/cards/NodeCardWrapper'
import NodeTooltip from '@/ui-component/tooltip/NodeTooltip'
import { IconButton, Box, Popover, Stack } from '@mui/material'
import { IconCopy, IconMarkdown, IconMarkdownOff, IconPalette, IconTrash } from '@tabler/icons-react'
import { Input } from '@/ui-component/input/Input'
import { MemoizedReactMarkdown } from '@/ui-component/markdown/MemoizedReactMarkdown'

// const
import { flowContext } from '@/store/context/ReactFlowContext'
import { DEFAULT_STICKY_NOTE_COLOR } from '@/utils/genericHelper'

const StickyNote = ({ data, selected }) => {
    const theme = useTheme()
    const canvas = useSelector((state) => state.canvas)
    const customization = useSelector((state) => state.customization)
    const { deleteNode, duplicateNode, reactFlowInstance } = useContext(flowContext)
    const [inputParam] = data.inputParams

    const [open, setOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [anchorEl, setAnchorEl] = useState(null)
    const colorOptions = useMemo(
        () => ['#FFE770', '#B4F8C8', '#A0C4FF', '#FFADAD', '#FFD6A5'],
        []
    )
    const [noteValue, setNoteValue] = useState(data.inputs?.[inputParam.name] ?? inputParam.default ?? '')

    const handleClose = () => {
        setOpen(false)
    }

    const handleOpen = () => {
        setOpen(true)
    }

    const defaultColor = DEFAULT_STICKY_NOTE_COLOR // fallback color if data.color is not present
    const nodeColor = data.color || defaultColor

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

    const getBorderColor = () => {
        if (selected) return theme.palette.primary.main
        else if (customization?.isDarkMode) return theme.palette.grey[700]
        else return theme.palette.grey[900] + 50
    }

    const getBackgroundColor = () => {
        if (customization?.isDarkMode) {
            return selected ? darken(nodeColor, 0.4) : darken(nodeColor, 0.5)
        } else {
            return selected ? lighten(nodeColor, 0.1) : lighten(nodeColor, 0.2)
        }
    }

    const handleColorButtonClick = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleColorSelect = (color) => {
        data.color = color
        setAnchorEl(null)
    }

    const handleToggleEditing = () => {
        setIsEditing((prev) => !prev)
    }

    return (
        <>
            <NodeCardWrapper
                content={false}
                sx={{
                    padding: 0,
                    borderColor: getBorderColor(),
                    backgroundColor: getBackgroundColor(),
                    width: '100%',
                    height: '100%',
                    minWidth: 220,
                    minHeight: 160,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                border={false}
            >
                <NodeResizer minWidth={180} minHeight={140} isVisible={selected} />
                <NodeTooltip
                    open={!canvas.canvasDialogShow && open}
                    onClose={handleClose}
                    onOpen={handleOpen}
                    disableFocusListener={true}
                    title={
                        <Stack spacing={0.5}>
                            <IconButton
                                title='Change color'
                                onClick={handleColorButtonClick}
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
                                title={isEditing ? 'Preview markdown' : 'Edit markdown'}
                                onClick={handleToggleEditing}
                                sx={{
                                    height: '35px',
                                    width: '35px',
                                    color: customization?.isDarkMode ? 'white' : 'inherit',
                                    '&:hover': { color: theme?.palette.primary.main }
                                }}
                            >
                                {isEditing ? <IconMarkdown /> : <IconMarkdownOff />}
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
                        </Stack>
                    }
                    placement='right-start'
                >
                    <Box sx={{ p: 1.5, width: '100%', height: '100%', overflow: 'auto', flex: 1 }}>
                        {isEditing ? (
                            <Input
                                key={data.id}
                                inputParam={inputParam}
                                onChange={(newValue) => {
                                    data.inputs[inputParam.name] = newValue
                                    setNoteValue(newValue)
                                }}
                                value={noteValue}
                                nodes={inputParam?.acceptVariable && reactFlowInstance ? reactFlowInstance.getNodes() : []}
                                edges={inputParam?.acceptVariable && reactFlowInstance ? reactFlowInstance.getEdges() : []}
                                nodeId={data.id}
                            />
                        ) : (
                            <MemoizedReactMarkdown>{noteValue || '*Add your note here...*'}</MemoizedReactMarkdown>
                        )}
                    </Box>
                </NodeTooltip>
            </NodeCardWrapper>
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
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
        </>
    )
}

StickyNote.propTypes = {
    data: PropTypes.object,
    selected: PropTypes.bool
}

export default memo(StickyNote)
