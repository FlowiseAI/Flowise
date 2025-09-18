import PropTypes from 'prop-types'
import { useContext, useState, memo } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { useTheme, darken, lighten } from '@mui/material/styles'

// project imports
import NodeCardWrapper from '@/ui-component/cards/NodeCardWrapper'
import NodeTooltip from '@/ui-component/tooltip/NodeTooltip'
import { IconButton, Box } from '@mui/material'
import { IconCopy, IconTrash } from '@tabler/icons-react'
import { Input } from '@/ui-component/input/Input'

// const
import { flowContext } from '@/store/context/ReactFlowContext'

const StickyNote = ({ data }) => {
    const theme = useTheme()
    const canvas = useSelector((state) => state.canvas)
    const customization = useSelector((state) => state.customization)
    const { deleteNode, duplicateNode } = useContext(flowContext)
    const [inputParam] = data.inputParams

    const [open, setOpen] = useState(false)

    const handleClose = () => {
        setOpen(false)
    }

    const handleOpen = () => {
        setOpen(true)
    }

    const defaultColor = '#FFE770' // fallback color if data.color is not present
    const nodeColor = data.color || defaultColor

    const getBorderColor = () => {
        if (data.selected) return theme.palette.primary.main
        else if (customization?.isDarkMode) return theme.palette.grey[700]
        else return theme.palette.grey[900] + 50
    }

    const getBackgroundColor = () => {
        if (customization?.isDarkMode) {
            return data.selected ? darken(nodeColor, 0.7) : darken(nodeColor, 0.8)
        } else {
            return data.selected ? lighten(nodeColor, 0.1) : lighten(nodeColor, 0.2)
        }
    }

    return (
        <>
            <NodeCardWrapper
                content={false}
                sx={{
                    padding: 0,
                    borderColor: getBorderColor(),
                    backgroundColor: getBackgroundColor()
                }}
                border={false}
            >
                <NodeTooltip
                    open={!canvas.canvasDialogShow && open}
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
                    <Box>
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
        </>
    )
}

StickyNote.propTypes = {
    data: PropTypes.object
}

export default memo(StickyNote)
