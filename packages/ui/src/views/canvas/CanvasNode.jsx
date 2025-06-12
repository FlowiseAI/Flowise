import PropTypes from 'prop-types'
import { useContext, useState, useEffect, memo } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { useTheme } from '@mui/material/styles'
import { IconButton, Box, Typography, Divider, Button } from '@mui/material'
import Tooltip from '@mui/material/Tooltip'

// project imports
import NodeCardWrapper from '@/ui-component/cards/NodeCardWrapper'
import NodeTooltip from '@/ui-component/tooltip/NodeTooltip'
import NodeInputHandler from './NodeInputHandler'
import NodeOutputHandler from './NodeOutputHandler'
import AdditionalParamsDialog from '@/ui-component/dialog/AdditionalParamsDialog'
import NodeInfoDialog from '@/ui-component/dialog/NodeInfoDialog'

// const
import { baseURL } from '@/store/constant'
import { IconTrash, IconCopy, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react'
import { flowContext } from '@/store/context/ReactFlowContext'
import LlamaindexPNG from '@/assets/images/llamaindex.png'

// yaml parser
import { yamlToJson } from '@/utils/yaml-parser/yamlParser'

// 节点名称、类型、标签
const [YAML_NODE_NAME, YAML_NODE_TYPE, YAML_NODE_LABEL] = ['yamlNode', 'YamlNode', 'Yaml Node']

// ===========================|| CANVAS NODE ||=========================== //

const CanvasNode = (props) => {
    const data = props.data
    const theme = useTheme()
    const canvas = useSelector((state) => state.canvas)
    const { deleteNode, duplicateNode, reactFlowInstance } = useContext(flowContext)

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
    const [warningMessage, setWarningMessage] = useState('')
    const [open, setOpen] = useState(false)
    const [isForceCloseNodeInfo, setIsForceCloseNodeInfo] = useState(null)

    // 处理 YAML 文件的回调函数
    const handleYamlFile = (yamlContent, fileName) => {
        try {
            // 将 YAML 转换为 JSON
            const jsonData = yamlToJson(yamlContent)
            const totalNodes = reactFlowInstance.getNodes()
            let index = 0
            console.log('totalNodes', totalNodes)
            const newNodes = totalNodes.map((node) => {
                if (node.type === YAML_NODE_NAME) {
                    index++
                }
                if (node.id === props.id) {
                    // 从jsonData中提取输入输出锚点数据
                    const inputAnchors = [
                        {
                            label: '',
                            name: 'inputValue',
                            type: 'string | number | json | array | file',
                            description: '',
                            placeholder: 'Enter value or connect to other nodes',
                            acceptVariable: true,
                            optional: true,
                            id: `${YAML_NODE_NAME}_${index}-input-inputValue-string | number | json | array | file`,
                            display: true
                        }
                    ]

                    const outputAnchors = [
                        {
                            label: '',
                            name: 'outputValue',
                            type: 'string | number | json | array | file',
                            description: '',
                            placeholder: 'Enter value or connect to other nodes',
                            acceptVariable: true,
                            optional: true,
                            id: `${YAML_NODE_NAME}_${index}-output-result-string | number | json | array | file`
                        }
                    ]

                    return {
                        ...node,
                        type: YAML_NODE_NAME,
                        id: `${YAML_NODE_NAME}_${index}`,
                        data: {
                            ...node.data,
                            inputParams: jsonData,
                            inputAnchors: inputAnchors,
                            outputAnchors: outputAnchors,
                            inputs: {},
                            outputs: {},
                            label: YAML_NODE_LABEL,
                            type: YAML_NODE_TYPE,
                            name: YAML_NODE_NAME,
                            id: `${YAML_NODE_NAME}_${index}`
                        }
                    }
                }
                return node
            })
            // console.log('newNodes', newNodes)
            reactFlowInstance.setNodes(newNodes)

            // 返回原始的文件内容（为了保持与现有系统的兼容性）
            return yamlContent + `,filename:${fileName}`
        } catch (error) {
            console.error('YAML 解析错误:', error)
            // 如果解析失败，仍然返回原始内容
            return yamlContent + `,filename:${fileName}`
        }
    }

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

    const nodeOutdatedMessage = (oldVersion, newVersion) => `Node version ${oldVersion} outdated\nUpdate to latest version ${newVersion}`

    const nodeVersionEmptyMessage = (newVersion) => `Node outdated\nUpdate to latest version ${newVersion}`

    const onDialogClicked = () => {
        const dialogProps = {
            data,
            inputParams: data.inputParams.filter((inputParam) => !inputParam.hidden).filter((param) => param.additionalParams),
            confirmButtonName: 'Save',
            cancelButtonName: 'Cancel'
        }
        setDialogProps(dialogProps)
        setShowDialog(true)
    }

    const getBorderColor = () => {
        if (data.selected) return theme.palette.primary.main
        else if (theme?.customization?.isDarkMode) return theme.palette.grey[900] + 25
        else return theme.palette.grey[900] + 50
    }

    useEffect(() => {
        const componentNode = canvas.componentNodes.find((nd) => nd.name === data.name)
        if (componentNode) {
            if (!data.version) {
                setWarningMessage(nodeVersionEmptyMessage(componentNode.version))
            } else if (data.version && componentNode.version > data.version) {
                setWarningMessage(nodeOutdatedMessage(data.version, componentNode.version))
            } else if (componentNode.badge === 'DEPRECATING') {
                setWarningMessage(
                    componentNode?.deprecateMessage ??
                        'This node will be deprecated in the next release. Change to a new node tagged with NEW'
                )
            } else {
                setWarningMessage('')
            }
        }
    }, [canvas.componentNodes, data.name, data.version])

    return (
        <>
            <NodeCardWrapper
                content={false}
                sx={{
                    padding: 0,
                    borderColor: getBorderColor()
                }}
                border={false}
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
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <Box style={{ width: 50, marginRight: 10, padding: 10 }}>
                                <div
                                    style={{
                                        ...theme.typography.commonAvatar,
                                        ...theme.typography.largeAvatar,
                                        borderRadius: '50%',
                                        backgroundColor: 'white',
                                        cursor: 'grab',
                                        width: '40px',
                                        height: '40px'
                                    }}
                                >
                                    <img
                                        style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }}
                                        src={`${baseURL}/api/v1/node-icon/${data.name}`}
                                        alt='Notification'
                                    />
                                </div>
                            </Box>
                            <Box>
                                <Typography
                                    sx={{
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        mr: 2
                                    }}
                                >
                                    {data.label}
                                </Typography>
                            </Box>
                            <div style={{ flexGrow: 1 }}></div>
                            {data.tags && data.tags.includes('LlamaIndex') && (
                                <>
                                    <div
                                        style={{
                                            borderRadius: '50%',
                                            padding: 15
                                        }}
                                    >
                                        <img
                                            style={{ width: '25px', height: '25px', borderRadius: '50%', objectFit: 'contain' }}
                                            src={LlamaindexPNG}
                                            alt='LlamaIndex'
                                        />
                                    </div>
                                </>
                            )}
                            {warningMessage && (
                                <>
                                    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{warningMessage}</span>} placement='top'>
                                        <IconButton sx={{ height: 35, width: 35 }}>
                                            <IconAlertTriangle size={35} color='orange' />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                        {(data.inputAnchors.length > 0 || data.inputParams.length > 0) && (
                            <>
                                <Divider />
                                <Box sx={{ background: theme.palette.asyncSelect.main, p: 1 }}>
                                    <Typography
                                        sx={{
                                            fontWeight: 500,
                                            textAlign: 'center'
                                        }}
                                    >
                                        Inputs
                                    </Typography>
                                </Box>
                                <Divider />
                            </>
                        )}
                        {data.inputAnchors.map((inputAnchor, index) => (
                            <NodeInputHandler key={index} inputAnchor={inputAnchor} data={data} />
                        ))}
                        {data.inputParams
                            .filter((inputParam) => !inputParam.hidden)
                            .filter((inputParam) => inputParam.display !== false)
                            .map((inputParam, index) => (
                                <NodeInputHandler
                                    key={index}
                                    inputParam={inputParam}
                                    data={data}
                                    onHideNodeInfoDialog={(status) => {
                                        if (status) {
                                            setIsForceCloseNodeInfo(true)
                                        } else {
                                            setIsForceCloseNodeInfo(null)
                                        }
                                    }}
                                    onFileProcess={handleYamlFile}
                                />
                            ))}
                        {data.inputParams.find((param) => param.additionalParams) && (
                            <div
                                style={{
                                    textAlign: 'center',
                                    marginTop:
                                        data.inputParams.filter((param) => param.additionalParams).length ===
                                        data.inputParams.length + data.inputAnchors.length
                                            ? 20
                                            : 0
                                }}
                            >
                                <Button sx={{ borderRadius: 25, width: '90%', mb: 2 }} variant='outlined' onClick={onDialogClicked}>
                                    Additional Parameters
                                </Button>
                            </div>
                        )}
                        {data.outputAnchors.length > 0 && <Divider />}
                        {data.outputAnchors.length > 0 && (
                            <Box sx={{ background: theme.palette.asyncSelect.main, p: 1 }}>
                                <Typography
                                    sx={{
                                        fontWeight: 500,
                                        textAlign: 'center'
                                    }}
                                >
                                    Output
                                </Typography>
                            </Box>
                        )}
                        {data.outputAnchors.length > 0 && <Divider />}
                        {data.outputAnchors.length > 0 &&
                            data.outputAnchors.map((outputAnchor) => (
                                <NodeOutputHandler key={JSON.stringify(data)} outputAnchor={outputAnchor} data={data} />
                            ))}
                    </Box>
                </NodeTooltip>
            </NodeCardWrapper>
            <AdditionalParamsDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
            ></AdditionalParamsDialog>
            <NodeInfoDialog show={showInfoDialog} dialogProps={infoDialogProps} onCancel={() => setShowInfoDialog(false)}></NodeInfoDialog>
        </>
    )
}

CanvasNode.propTypes = {
    data: PropTypes.object,
    id: PropTypes.string.isRequired
}

export default memo(CanvasNode)
