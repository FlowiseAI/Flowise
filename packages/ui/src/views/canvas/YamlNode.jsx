import PropTypes from 'prop-types'
import { useContext, useState, memo, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import NodeInputHandler from './NodeInputHandler'
import NodeOutputHandler from './NodeOutputHandler'
import { useUpdateNodeInternals } from 'reactflow'

// material-ui
import { useTheme } from '@mui/material/styles'
import { IconButton, Box } from '@mui/material'

// project imports
import NodeCardWrapper from '@/ui-component/cards/NodeCardWrapper'
import NodeTooltip from '@/ui-component/tooltip/NodeTooltip'
import AdditionalParamsDialog from '@/ui-component/dialog/AdditionalParamsDialog'
import NodeInfoDialog from '@/ui-component/dialog/NodeInfoDialog'
import YamlNodeRenderer from '@/ui-component/yaml-components/YamlNodeRenderer'
// const
import { IconTrash, IconCopy, IconInfoCircle } from '@tabler/icons-react'
import { flowContext } from '@/store/context/ReactFlowContext'

// ===========================|| CANVAS NODE ||=========================== //

const YamlNode = (props) => {
    const data = props.data
    const { inputParams } = data || {}
    const { dialog, widget } = inputParams || {}
    const { width } = dialog || {}

    const theme = useTheme()
    const canvas = useSelector((state) => state.canvas)
    const { deleteNode, duplicateNode } = useContext(flowContext)

    // 初始化必要的属性
    data.inputParams = data.inputParams || []
    data.inputAnchors = data.inputAnchors || []
    data.outputAnchors = data.outputAnchors || []
    data.inputs = data.inputs || {}
    data.outputs = data.outputs || {}

    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [showInfoDialog, setShowInfoDialog] = useState(false)
    const [infoDialogProps, setInfoDialogProps] = useState({})
    const [open, setOpen] = useState(false)
    const [isForceCloseNodeInfo, setIsForceCloseNodeInfo] = useState(null)

    const handleClose = () => {
        setOpen(false)
    }

    const handleOpen = () => {
        setOpen(true)
    }

    const getNodeInfoOpenStatus = () => {
        if (isForceCloseNodeInfo) return false
        else return !canvas.canvasDialogShow && open
    }

    const getBorderColor = () => {
        if (data.selected) return theme.palette.primary.main
        else if (theme?.customization?.isDarkMode) return theme.palette.grey[900] + 25
        else return theme.palette.grey[900] + 50
    }

    const updateNodeInternals = useUpdateNodeInternals()
    const ref = useRef(null)
    const [distance, setDistance] = useState(0)
    useEffect(() => {
        if (ref.current && ref.current.clientHeight) {
            const distanceY = ref.current.clientHeight / 5
            setDistance(distanceY)
            updateNodeInternals(data.id)
        }
    }, [ref])

    return (
        <div ref={ref}>
            <Box
                sx={{
                    transform: `translateY(${distance}px)`
                }}
            >
                {data.inputAnchors.length > 0 &&
                    data.inputAnchors.map((inputAnchor, index) => <NodeInputHandler key={index} inputAnchor={inputAnchor} data={data} />)}
            </Box>
            <Box
                sx={{
                    transform: `translateY(${distance * 4}px)`
                }}
            >
                {data.outputAnchors.length > 0 &&
                    data.outputAnchors.map((outputAnchor) => (
                        <NodeOutputHandler key={JSON.stringify(data)} outputAnchor={outputAnchor} data={data} />
                    ))}
            </Box>
            <NodeCardWrapper
                content={false}
                className='nowheel'
                sx={{
                    padding: 0,
                    borderColor: getBorderColor()
                }}
                border={false}
                width={`${width}px`}
            >
                <NodeTooltip
                    open={getNodeInfoOpenStatus()}
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
                                    duplicateNode(data)
                                }}
                                sx={{ height: '35px', width: '35px', '&:hover': { color: theme?.palette.primary.main } }}
                                color={theme?.customization?.isDarkMode ? theme.colors?.paper : 'inherit'}
                            >
                                <IconCopy />
                            </IconButton>
                            <IconButton
                                title='Delete'
                                onClick={() => {
                                    if (data.isInLoop && data.onNodesChange) {
                                        // 如果是循环内的节点，使用 onNodesChange 删除
                                        data.onNodesChange([
                                            {
                                                type: 'remove',
                                                id: data.id
                                            }
                                        ])
                                    } else {
                                        // 如果不是循环内的节点，使用普通的 deleteNode
                                        deleteNode(data.id)
                                    }
                                }}
                                sx={{ height: '35px', width: '35px', '&:hover': { color: 'red' } }}
                                color={theme?.customization?.isDarkMode ? theme.colors?.paper : 'inherit'}
                            >
                                <IconTrash />
                            </IconButton>
                            <IconButton
                                title='Info'
                                onClick={() => {
                                    setInfoDialogProps({ data })
                                    setShowInfoDialog(true)
                                }}
                                sx={{ height: '35px', width: '35px', '&:hover': { color: theme?.palette.secondary.main } }}
                                color={theme?.customization?.isDarkMode ? theme.colors?.paper : 'inherit'}
                            >
                                <IconInfoCircle />
                            </IconButton>
                        </div>
                    }
                    placement='right-start'
                >
                    <Box>
                        <div className='yaml-node-renderer'>
                            <YamlNodeRenderer props={data} />
                        </div>
                    </Box>
                </NodeTooltip>
            </NodeCardWrapper>
            <AdditionalParamsDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
            ></AdditionalParamsDialog>
            <NodeInfoDialog show={showInfoDialog} dialogProps={infoDialogProps} onCancel={() => setShowInfoDialog(false)}></NodeInfoDialog>
        </div>
    )
}

YamlNode.propTypes = {
    data: PropTypes.object.isRequired,
    id: PropTypes.string.isRequired
}

export default memo(YamlNode)
