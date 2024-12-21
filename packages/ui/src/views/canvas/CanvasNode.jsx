import PropTypes from 'prop-types'
import { useCallback, useMemo, useContext, useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { debounce } from 'lodash'

// material-ui
import { useTheme } from '@mui/material/styles'
import { IconButton, Box, Typography, Divider, Button, Stack, ButtonGroup } from '@mui/material'
import Tooltip from '@mui/material/Tooltip'

// project imports
import NodeCardWrapper from '@/ui-component/cards/NodeCardWrapper'
import NodeInputHandler from './NodeInputHandler'
import NodeOutputHandler from './NodeOutputHandler'
import AdditionalParamsDialog from '@/ui-component/dialog/AdditionalParamsDialog'
import NodeInfoDialog from '@/ui-component/dialog/NodeInfoDialog'

// const
import { SET_CHATFLOW, SET_DIRTY } from '@/store/actions'
import { baseURL, FLOWISE_CREDENTIAL_ID } from '@/store/constant'
import { IconTrash, IconCopy, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react'
import { flowContext } from '@/store/context/ReactFlowContext'
import LlamaindexPNG from '@/assets/images/llamaindex.png'
import HighlightButtonWrapper from './HighlightButtonWrapper'

// ===========================|| CANVAS NODE ||=========================== //

const CanvasNode = ({ data }) => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const canvas = useSelector((state) => state.canvas.present)
    const { deleteNode, duplicateNode, highlightedNodeId, setHighlightedNodeId, reactFlowInstance } = useContext(flowContext)

    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [showInfoDialog, setShowInfoDialog] = useState(false)
    const [infoDialogProps, setInfoDialogProps] = useState({})
    const [warningMessage, setWarningMessage] = useState('')

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

    // Function to update store
    const updateStore = useCallback(() => {
        dispatch({ type: SET_DIRTY })
        const flowData = {
            nodes: reactFlowInstance.getNodes(),
            edges: reactFlowInstance.getEdges(),
            viewport: reactFlowInstance?.getViewport()
        }
        dispatch({
            type: SET_CHATFLOW,
            chatflow: {
                ...canvas.chatflow,
                flowData: JSON.stringify(flowData)
            }
        })
    }, [dispatch, canvas.chatflow, reactFlowInstance])

    // Create debounced version of updateStore
    const debouncedUpdateStore = useMemo(
        () => debounce(updateStore, 500), // 500ms delay
        [updateStore]
    )

    const onNodeDataChange = useCallback(
        (inputParam, newValue) => {
            switch (inputParam.type) {
                case 'credential': {
                    data.credential = newValue
                    data.inputs[FLOWISE_CREDENTIAL_ID] = newValue // in case data.credential is not updated
                    updateStore(data)
                    break
                }
                case 'tabs': {
                    data.inputs[`${inputParam.tabIdentifier}_${data.id}`] = inputParam.tabs[val].name
                    updateStore(data)
                    break
                }
                case 'datagrid':
                case 'code':
                case 'json':
                case 'number':
                case 'password':
                case 'string': {
                    data.inputs[inputParam.name] = newValue
                    debouncedUpdateStore(data)
                    break
                }
                default: {
                    data.inputs[inputParam.name] = newValue
                    updateStore(data)
                }
            }
        },
        [data, updateStore, debouncedUpdateStore]
    )

    useEffect(() => {
        return () => {
            debouncedUpdateStore.cancel()
        }
    }, [debouncedUpdateStore])

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
        <Stack
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 0.5,
                '& > .node-actions': {
                    visibility: 'hidden',
                    pointerEvents: 'none'
                },
                '&:hover > .node-actions': {
                    visibility: 'visible',
                    pointerEvents: 'auto'
                }
            }}
        >
            <ButtonGroup
                className='node-actions'
                sx={{
                    background: theme.palette.card.main,
                    borderRadius: '8px',
                    height: '26px',
                    '& > button': {
                        border: 'none',
                        borderColor: 'transparent',
                        color: theme?.customization?.isDarkMode ? theme.colors?.paper : 'inherit',
                        minWidth: '28px !important',
                        width: '24px',
                        height: '24px',
                        padding: '0.45rem',
                        '&:hover': {
                            border: 'none',
                            borderRightColor: '#454c59 !important'
                        }
                    }
                }}
                variant='outlined'
            >
                <Button
                    title='Duplicate'
                    onClick={() => {
                        duplicateNode(data.id)
                    }}
                    sx={{
                        '&:hover': { color: theme?.palette.primary.main }
                    }}
                >
                    <IconCopy />
                </Button>
                <Button
                    title='Delete'
                    onClick={() => {
                        deleteNode(data.id)
                    }}
                    sx={{
                        '&:hover': { color: 'red' }
                    }}
                >
                    <IconTrash />
                </Button>
                <Button
                    title='Info'
                    onClick={() => {
                        setInfoDialogProps({ data })
                        setShowInfoDialog(true)
                    }}
                    sx={{
                        '&:hover': { color: theme?.palette.secondary.main }
                    }}
                >
                    <IconInfoCircle />
                </Button>
            </ButtonGroup>

            <NodeCardWrapper
                content={false}
                sx={{
                    padding: 0,
                    borderColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary
                }}
                border={false}
            >
                <Box>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <Box style={{ width: 50, marginRight: 10, padding: 5 }}>
                            <div
                                style={{
                                    ...theme.typography.commonAvatar,
                                    ...theme.typography.largeAvatar,
                                    borderRadius: '50%',
                                    backgroundColor: 'white',
                                    cursor: 'grab'
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
                        <NodeInputHandler key={index} inputAnchor={inputAnchor} data={data} onNodeDataChange={onNodeDataChange} />
                    ))}
                    {data.inputParams
                        .filter((inputParam) => !inputParam.hidden)
                        .map((inputParam, index) => (
                            <NodeInputHandler key={index} inputParam={inputParam} data={data} onNodeDataChange={onNodeDataChange} />
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
                            <HighlightButtonWrapper
                                highlightedNodeId={highlightedNodeId}
                                nodeId={data.id}
                                setHighlightedNodeId={setHighlightedNodeId}
                            >
                                <Button sx={{ borderRadius: 25, width: '90%', mb: 2 }} variant='outlined' onClick={onDialogClicked}>
                                    Additional Parameters
                                </Button>
                            </HighlightButtonWrapper>
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
            </NodeCardWrapper>
            <AdditionalParamsDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onNodeDataChange={onNodeDataChange}
            ></AdditionalParamsDialog>
            <NodeInfoDialog show={showInfoDialog} dialogProps={infoDialogProps} onCancel={() => setShowInfoDialog(false)}></NodeInfoDialog>
        </Stack>
    )
}

CanvasNode.propTypes = {
    data: PropTypes.object
}

export default CanvasNode
