import { useEffect, useRef, useState, useCallback, useContext } from 'react'
import ReactFlow, { addEdge, applyEdgeChanges, Background, useNodesState, useEdgesState } from 'reactflow'
import 'reactflow/dist/style.css'

import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { ActionCreators } from 'redux-undo'
import {
    REMOVE_DIRTY,
    SET_DIRTY,
    SET_CHATFLOW,
    RESET_CANVAS,
    enqueueSnackbar as enqueueSnackbarAction,
    closeSnackbar as closeSnackbarAction
} from '@/store/actions'
import { omit, cloneDeep } from 'lodash'

// material-ui
import { Toolbar, Box, AppBar, Button, Fab } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import CanvasNode from './CanvasNode'
import ButtonEdge from './ButtonEdge'
import StickyNote from './StickyNote'
import CanvasHeader from './CanvasHeader'
import AddNodes from './AddNodes'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { ChatPopUp } from '@/views/chatmessage/ChatPopUp'
import { VectorStorePopUp } from '@/views/vectorstore/VectorStorePopUp'
import { flowContext } from '@/store/context/ReactFlowContext'

// API
import nodesApi from '@/api/nodes'
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'
import useAutoSave from '@/hooks/useAutoSave'
import useConfirm from '@/hooks/useConfirm'

// icons
import {
    IconX,
    IconRefreshAlert,
    IconArrowBackUp,
    IconArrowForwardUp,
    IconPlus,
    IconMinus,
    IconMaximize,
    IconLock,
    IconLockOpen
} from '@tabler/icons-react'

// utils
import {
    getUniqueNodeId,
    initNode,
    rearrangeToolsOrdering,
    getUpsertDetails,
    updateOutdatedNodeData,
    updateOutdatedNodeEdge
} from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'

// const
import { FLOWISE_CREDENTIAL_ID } from '@/store/constant'

const nodeTypes = { customNode: CanvasNode, stickyNote: StickyNote }
const edgeTypes = { buttonedge: ButtonEdge }

// ==============================|| CANVAS ||============================== //

const Canvas = () => {
    const theme = useTheme()
    const navigate = useNavigate()

    const { state } = useLocation()
    const templateFlowData = state ? state.templateFlowData : ''

    const URLpath = document.location.pathname.toString().split('/')
    const chatflowId =
        URLpath[URLpath.length - 1] === 'canvas' || URLpath[URLpath.length - 1] === 'agentcanvas' ? '' : URLpath[URLpath.length - 1]
    const isAgentCanvas = URLpath.includes('agentcanvas') ? true : false
    const canvasTitle = URLpath.includes('agentcanvas') ? 'Agent' : 'Chatflow'

    const { confirm } = useConfirm()

    const dispatch = useDispatch()
    const canvasHistory = useSelector((state) => state.canvas)
    const canvas = canvasHistory.present
    const canUndo = canvasHistory.past.length > 0
    const canRedo = canvasHistory.future.length > 0
    const { setHighlightedNodeId, reactFlowInstance, setReactFlowInstance } = useContext(flowContext)

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    // ==============================|| AutoSave ||============================== //

    const onAutoSave = useCallback(({ chatflowId, chatflowName, flowData }) => {
        if (chatflowId) {
            updateChatflowApi.request(chatflowId, { name: chatflowName, flowData })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const [chatflowData, isSaving, forceSave] = useAutoSave({
        onAutoSave,
        interval: 10000,
        debounce: 2000
    })

    // ==============================|| ReactFlow ||============================== //

    const [nodes, setNodes, onNodesChange] = useNodesState()
    const [edges, setEdges] = useEdgesState()

    const [selectedNode, setSelectedNode] = useState(null)
    const [isUpsertButtonEnabled, setIsUpsertButtonEnabled] = useState(false)
    const [isSyncNodesButtonEnabled, setIsSyncNodesButtonEnabled] = useState(false)
    const [isNodesDraggable, setIsNodesDraggable] = useState(true)
    const [isNodesConnectable, setIsNodesConnectable] = useState(true)
    const [isElementsSelectable, setIsElementsSelectable] = useState(true)

    const reactFlowWrapper = useRef(null)

    // ==============================|| Chatflow API ||============================== //

    const getNodesApi = useApi(nodesApi.getAllNodes)
    const createNewChatflowApi = useApi(chatflowsApi.createNewChatflow)
    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
    const getSpecificChatflowApi = useApi(chatflowsApi.getSpecificChatflow)

    // ==============================|| Events & Actions ||============================== //

    const onNodeDragStop = useCallback(
        () => {
            setDirty()
            const flowData = {
                nodes: reactFlowInstance.getNodes(),
                edges: edges,
                viewport: reactFlowInstance?.getViewport()
            }
            dispatch({
                type: SET_CHATFLOW,
                chatflow: {
                    ...canvas.chatflow,
                    flowData: JSON.stringify(flowData)
                }
            })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [edges, canvas.chatflow, dispatch, reactFlowInstance]
    )

    const onEdgesChange = useCallback(
        (changes) => {
            setEdges((oldEdges) => {
                const updatedEdges = applyEdgeChanges(changes, oldEdges)

                // Only dispatch to Redux if it's not the initial load
                if (updatedEdges !== oldEdges) {
                    const flowData = {
                        nodes: nodes,
                        edges: updatedEdges,
                        viewport: reactFlowInstance?.getViewport()
                    }
                    dispatch({
                        type: SET_CHATFLOW,
                        chatflow: {
                            ...canvas.chatflow,
                            flowData: JSON.stringify(flowData)
                        }
                    })
                }
                return updatedEdges
            })
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [nodes, canvas.chatflow, dispatch, reactFlowInstance]
    )

    const onConnect = (params) => {
        const newEdge = {
            ...params,
            type: 'buttonedge',
            id: `${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}`
        }

        const targetNodeId = params.targetHandle.split('-')[0]
        const sourceNodeId = params.sourceHandle.split('-')[0]
        const targetInput = params.targetHandle.split('-')[2]

        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === targetNodeId) {
                    setTimeout(() => setDirty(), 0)
                    let value
                    const inputAnchor = node.data.inputAnchors.find((ancr) => ancr.name === targetInput)
                    const inputParam = node.data.inputParams.find((param) => param.name === targetInput)

                    if (inputAnchor && inputAnchor.list) {
                        const newValues = node.data.inputs[targetInput] || []
                        if (targetInput === 'tools') {
                            rearrangeToolsOrdering(newValues, sourceNodeId)
                        } else {
                            newValues.push(`{{${sourceNodeId}.data.instance}}`)
                        }
                        value = newValues
                    } else if (inputParam && inputParam.acceptVariable) {
                        value = node.data.inputs[targetInput] || ''
                    } else {
                        value = `{{${sourceNodeId}.data.instance}}`
                    }
                    node.data = {
                        ...node.data,
                        inputs: {
                            ...node.data.inputs,
                            [targetInput]: value
                        }
                    }
                }
                return node
            })
        )

        setEdges((eds) => addEdge(newEdge, eds))
    }

    const onToggleLockViewport = () => {
        setIsNodesDraggable(!isNodesDraggable)
        setIsNodesConnectable(!isNodesConnectable)
        setIsElementsSelectable(!isElementsSelectable)
    }

    const handleLoadFlow = (file) => {
        try {
            const flowData = JSON.parse(file)
            const nodes = flowData.nodes || []

            setNodes(nodes)
            setEdges(flowData.edges || [])
            setTimeout(() => setDirty(), 0)
        } catch (e) {
            console.error(e)
        }
    }

    const handleDeleteFlow = async () => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete ${canvasTitle} ${chatflowData.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await chatflowsApi.deleteChatflow(chatflowData.id)
                localStorage.removeItem(`${chatflowData.id}_INTERNAL`)
                navigate(isAgentCanvas ? '/agentflows' : '/')
            } catch (error) {
                enqueueSnackbar({
                    message: typeof error.response.data === 'object' ? error.response.data.message : error.response.data,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            }
        }
    }

    const handleSaveFlow = (chatflowName) => {
        if (reactFlowInstance) {
            const nodes = reactFlowInstance.getNodes().map((node) => {
                const nodeData = cloneDeep(node.data)
                if (Object.prototype.hasOwnProperty.call(nodeData.inputs, FLOWISE_CREDENTIAL_ID)) {
                    nodeData.credential = nodeData.inputs[FLOWISE_CREDENTIAL_ID]
                    nodeData.inputs = omit(nodeData.inputs, [FLOWISE_CREDENTIAL_ID])
                }
                node.data = {
                    ...nodeData,
                    selected: false
                }
                return node
            })

            const rfInstanceObject = reactFlowInstance.toObject()
            rfInstanceObject.nodes = nodes
            const flowData = JSON.stringify(rfInstanceObject)

            if (!chatflowData.id) {
                const newChatflowBody = {
                    name: chatflowName,
                    deployed: false,
                    isPublic: false,
                    flowData,
                    type: isAgentCanvas ? 'MULTIAGENT' : 'CHATFLOW'
                }
                createNewChatflowApi.request(newChatflowBody)
            } else {
                forceSave()
            }
        }
    }

    // eslint-disable-next-line
    const onNodeClick = useCallback((event, clickedNode) => {
        setSelectedNode(clickedNode)
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === clickedNode.id) {
                    node.data = {
                        ...node.data,
                        selected: true
                    }
                } else {
                    node.data = {
                        ...node.data,
                        selected: false
                    }
                }

                return node
            })
        )
    })

    const onDragOver = useCallback((event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback(
        (event) => {
            event.preventDefault()
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
            let nodeData = event.dataTransfer.getData('application/reactflow')

            // check if the dropped element is valid
            if (typeof nodeData === 'undefined' || !nodeData) {
                return
            }

            nodeData = JSON.parse(nodeData)

            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left - 100,
                y: event.clientY - reactFlowBounds.top - 50
            })

            const newNodeId = getUniqueNodeId(nodeData, reactFlowInstance.getNodes())

            const newNode = {
                id: newNodeId,
                position,
                type: nodeData.type !== 'StickyNote' ? 'customNode' : 'stickyNote',
                data: initNode(nodeData, newNodeId)
            }

            setSelectedNode(newNode)
            setNodes((nds) =>
                nds.concat(newNode).map((node) => {
                    if (node.id === newNode.id) {
                        node.data = {
                            ...node.data,
                            selected: true
                        }
                    } else {
                        node.data = {
                            ...node.data,
                            selected: false
                        }
                    }

                    return node
                })
            )
            setDirty()
            const flowData = {
                nodes: reactFlowInstance.getNodes().concat(newNode),
                edges: edges,
                viewport: reactFlowInstance?.getViewport()
            }
            dispatch({
                type: SET_CHATFLOW,
                chatflow: {
                    ...canvas.chatflow,
                    flowData: JSON.stringify(flowData)
                }
            })
        },

        // eslint-disable-next-line
        [edges, canvas.chatflow, dispatch, reactFlowInstance, setNodes]
    )

    const syncNodes = () => {
        const componentNodes = canvas.componentNodes

        const cloneNodes = cloneDeep(nodes)
        const cloneEdges = cloneDeep(edges)
        let toBeRemovedEdges = []

        for (let i = 0; i < cloneNodes.length; i++) {
            const node = cloneNodes[i]
            const componentNode = componentNodes.find((cn) => cn.name === node.data.name)
            if (componentNode && componentNode.version > node.data.version) {
                const clonedComponentNode = cloneDeep(componentNode)
                cloneNodes[i].data = updateOutdatedNodeData(clonedComponentNode, node.data)
                toBeRemovedEdges.push(...updateOutdatedNodeEdge(cloneNodes[i].data, cloneEdges))
            }
        }

        const updatedEdges = cloneEdges.filter((edge) => !toBeRemovedEdges.includes(edge))
        setNodes(cloneNodes)
        setEdges(updatedEdges)
        setDirty()
        // update the canvas store data which will trigger autosave
        const flowData = {
            nodes: cloneNodes,
            edges: updatedEdges,
            viewport: reactFlowInstance?.getViewport()
        }
        dispatch({
            type: SET_CHATFLOW,
            chatflow: {
                ...canvas.chatflow,
                flowData: JSON.stringify(flowData)
            }
        })
        setIsSyncNodesButtonEnabled(false)
    }

    const saveChatflowSuccess = () => {
        dispatch({ type: REMOVE_DIRTY })
    }

    const errorFailed = (message) => {
        enqueueSnackbar({
            message,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'error',
                persist: true,
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    const setDirty = () => {
        dispatch({ type: SET_DIRTY })
    }

    const checkIfUpsertAvailable = (nodes, edges) => {
        const upsertNodeDetails = getUpsertDetails(nodes, edges)
        if (upsertNodeDetails.length) setIsUpsertButtonEnabled(true)
        else setIsUpsertButtonEnabled(false)
    }

    const checkIfSyncNodesAvailable = (nodes) => {
        const componentNodes = canvas.componentNodes

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]
            const componentNode = componentNodes.find((cn) => cn.name === node.data.name)
            if (componentNode && componentNode.version > node.data.version) {
                setIsSyncNodesButtonEnabled(true)
                return
            }
        }

        setIsSyncNodesButtonEnabled(false)
    }

    const handleUndo = useCallback(() => {
        if (canUndo) {
            const prevState = canvasHistory.past[canvasHistory.past.length - 1]
            const currentState = canvasHistory.present

            // detect which node's additionalParams data changed and get it's id
            const changedNode = findNodesWithHiddenInputsChange(prevState, currentState)
            if (changedNode) {
                setHighlightedNodeId?.(changedNode.id)
            }

            dispatch(ActionCreators.undo())

            const prevNodes = prevState.chatflow?.flowData ? JSON.parse(prevState.chatflow.flowData).nodes || [] : []
            const prevEdges = prevState.chatflow?.flowData ? JSON.parse(prevState.chatflow.flowData).edges || [] : []
            setNodes(prevNodes)
            setEdges(prevEdges)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canUndo, dispatch, canvasHistory, setNodes, setEdges])

    const handleRedo = useCallback(() => {
        if (canRedo) {
            const prevState = canvasHistory.present
            const currentState = canvasHistory.future[0]

            // detect which node's additionalParams data changed and get it's id
            const changedNode = findNodesWithHiddenInputsChange(prevState, currentState)
            if (changedNode) {
                setHighlightedNodeId?.(changedNode.id)
            }

            dispatch(ActionCreators.redo())

            const nextNodes = currentState.chatflow?.flowData ? JSON.parse(currentState.chatflow.flowData).nodes || [] : []
            const nextEdges = currentState.chatflow?.flowData ? JSON.parse(currentState.chatflow.flowData).edges || [] : []
            setNodes(nextNodes)
            setEdges(nextEdges)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canRedo, dispatch, canvasHistory.future, setNodes, setEdges])

    const handleKeyDown = useCallback(
        (event) => {
            // Check if Ctrl/Cmd key is pressed
            if (event.ctrlKey || event.metaKey) {
                // Convert to lowercase to handle both 'z' and 'Z'
                const key = event.key.toLowerCase()

                if (key === 'z') {
                    event.preventDefault() // Prevent browser's default undo/redo

                    if (event.shiftKey) {
                        // Ctrl+Shift+Z (redo)
                        if (canRedo) {
                            handleRedo()
                        }
                    } else {
                        // Ctrl+Z (undo)
                        if (canUndo) {
                            handleUndo()
                        }
                    }
                }
            }
        },
        [handleRedo, handleUndo, canRedo, canUndo]
    )

    const findNodesWithHiddenInputsChange = (prevState, currentState) => {
        const prevNodes = prevState.chatflow.flowData ? JSON.parse(prevState.chatflow.flowData).nodes : []
        const currentNodes = currentState.chatflow.flowData ? JSON.parse(currentState.chatflow.flowData).nodes : []

        return prevNodes.find((prevNode, index) => {
            const currentNode = currentNodes[index]
            if (!currentNode) return false

            // Check if any additional params changed
            return prevNode.data.inputParams.some((param) => {
                const isParamChanged =
                    JSON.stringify(prevNode.data.inputs[param.name]) !== JSON.stringify(currentNode.data.inputs[param.name])

                return isParamChanged || param.additionalParams || (param.type && param.type.includes('conditionFunction'))
            })
        })
    }
    // ==============================|| useEffect ||============================== //

    // Get specific chatflow successful
    useEffect(() => {
        if (getSpecificChatflowApi.data) {
            const chatflow = getSpecificChatflowApi.data
            const initialFlow = chatflow.flowData ? JSON.parse(chatflow.flowData) : []
            setNodes(initialFlow.nodes || [])
            setEdges(initialFlow.edges || [])
            dispatch({ type: SET_CHATFLOW, chatflow })
        } else if (getSpecificChatflowApi.error) {
            errorFailed(`Failed to retrieve ${canvasTitle}: ${getSpecificChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificChatflowApi.data, getSpecificChatflowApi.error])

    // Create new chatflow successful
    useEffect(() => {
        if (createNewChatflowApi.data) {
            const chatflow = createNewChatflowApi.data
            dispatch({ type: SET_CHATFLOW, chatflow })
            saveChatflowSuccess()
            window.history.replaceState(state, null, `/${isAgentCanvas ? 'agentcanvas' : 'canvas'}/${chatflow.id}`)
        } else if (createNewChatflowApi.error) {
            errorFailed(`Failed to save ${canvasTitle}: ${createNewChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createNewChatflowApi.data, createNewChatflowApi.error])

    // Update chatflow successful
    useEffect(() => {
        if (updateChatflowApi.data) {
            saveChatflowSuccess()
        } else if (updateChatflowApi.error) {
            errorFailed(`Failed to save ${canvasTitle}: ${updateChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateChatflowApi.data, updateChatflowApi.error])

    useEffect(() => {
        if (chatflowData) {
            const flowData = chatflowData.flowData ? JSON.parse(chatflowData.flowData) : []
            checkIfUpsertAvailable(flowData.nodes || [], flowData.edges || [])
            checkIfSyncNodesAvailable(flowData.nodes || [])
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatflowData])

    // Initialization
    useEffect(() => {
        setIsSyncNodesButtonEnabled(false)
        setIsUpsertButtonEnabled(false)
        // clear history when the component mounts
        dispatch(ActionCreators.clearHistory())
        if (chatflowId) {
            getSpecificChatflowApi.request(chatflowId)
        } else {
            if (localStorage.getItem('duplicatedFlowData')) {
                handleLoadFlow(localStorage.getItem('duplicatedFlowData'))
                setTimeout(() => localStorage.removeItem('duplicatedFlowData'), 0)
            } else {
                setNodes([])
                setEdges([])
            }
            dispatch({
                type: SET_CHATFLOW,
                chatflow: {
                    name: `Untitled ${canvasTitle}`
                }
            })
        }

        getNodesApi.request()

        // Clear dirty state before leaving and remove any ongoing test triggers and webhooks
        return () => {
            setTimeout(() => dispatch({ type: REMOVE_DIRTY }), 0)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        function handlePaste(e) {
            const pasteData = e.clipboardData.getData('text')
            //TODO: prevent paste event when input focused, temporary fix: catch chatflow syntax
            if (pasteData.includes('{"nodes":[') && pasteData.includes('],"edges":[')) {
                handleLoadFlow(pasteData)
            }
        }

        const flowWrapper = reactFlowWrapper.current

        if (flowWrapper) {
            flowWrapper.addEventListener('paste', handlePaste)
            flowWrapper.addEventListener('keydown', handleKeyDown)
            // focus reactflow wrapper
            flowWrapper.tabIndex = -1
            flowWrapper.focus()
        }

        return () => {
            if (flowWrapper) {
                flowWrapper.removeEventListener('paste', handlePaste)
                flowWrapper.removeEventListener('keydown', handleKeyDown)
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleKeyDown, reactFlowWrapper])

    useEffect(() => {
        if (templateFlowData && templateFlowData.includes('"nodes":[') && templateFlowData.includes('],"edges":[')) {
            handleLoadFlow(templateFlowData)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateFlowData])

    useEffect(() => {
        return () => {
            // clear canvas data and history when leaving the canvas
            dispatch({ type: RESET_CANVAS })
            dispatch(ActionCreators.clearHistory())
        }
    }, [dispatch])

    return (
        <>
            <Box>
                <AppBar
                    enableColorOnDark
                    position='fixed'
                    color='inherit'
                    elevation={1}
                    sx={{
                        bgcolor: theme.palette.background.default
                    }}
                >
                    <Toolbar>
                        <CanvasHeader
                            chatflow={chatflowData}
                            handleSaveFlow={handleSaveFlow}
                            handleDeleteFlow={handleDeleteFlow}
                            handleLoadFlow={handleLoadFlow}
                            isAgentCanvas={isAgentCanvas}
                            isSaving={isSaving}
                        />
                    </Toolbar>
                </AppBar>
                <Box sx={{ pt: '70px', height: '100vh', width: '100%' }}>
                    <div className='reactflow-parent-wrapper'>
                        <div className='reactflow-wrapper' ref={reactFlowWrapper}>
                            <Box
                                sx={{
                                    width: '100%',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 2.5
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2
                                    }}
                                >
                                    <AddNodes isAgentCanvas={isAgentCanvas} nodesData={getNodesApi.data} node={selectedNode} />
                                    {isSyncNodesButtonEnabled && (
                                        <Fab
                                            sx={{
                                                color: 'white',
                                                background: 'orange',
                                                '&:hover': {
                                                    background: 'orange',
                                                    backgroundImage: `linear-gradient(rgb(0 0 0/10%) 0 0)`
                                                }
                                            }}
                                            size='small'
                                            aria-label='sync'
                                            title='Sync Nodes'
                                            onClick={() => syncNodes()}
                                        >
                                            <IconRefreshAlert />
                                        </Fab>
                                    )}
                                </Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2
                                    }}
                                >
                                    {isUpsertButtonEnabled && <VectorStorePopUp chatflowid={chatflowId} />}
                                    <ChatPopUp isAgentCanvas={isAgentCanvas} chatflowid={chatflowId} />
                                </Box>
                            </Box>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: 2.5,
                                    gap: 2,
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    zIndex: 10
                                }}
                            >
                                <Box
                                    className='undo-redo-wrapper'
                                    sx={{
                                        backgroundColor: theme?.customization?.isDarkMode
                                            ? theme.palette.background.darkPaper
                                            : theme.palette.background.paper,
                                        borderColor: theme?.customization?.isDarkMode ? theme.palette.grey[400] : theme.palette.grey[600],
                                        borderStyle: 'solid',
                                        borderWidth: '1px',
                                        '& button': {
                                            borderColor: `${
                                                theme?.customization?.isDarkMode ? theme.palette.grey[400] : theme.palette.grey[600]
                                            } !important`,
                                            color: theme?.customization?.isDarkMode ? 'white' : 'black'
                                        }
                                    }}
                                >
                                    <Button
                                        disabled={!canUndo}
                                        onClick={handleUndo}
                                        sx={{
                                            cursor: canUndo ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        <IconArrowBackUp />
                                    </Button>
                                    <Button
                                        disabled={!canRedo}
                                        onClick={handleRedo}
                                        sx={{
                                            cursor: canRedo ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        <IconArrowForwardUp />
                                    </Button>
                                </Box>
                                <Box
                                    className='reactflow-controls-wrapper'
                                    sx={{
                                        backgroundColor: theme?.customization?.isDarkMode
                                            ? theme.palette.background.darkPaper
                                            : theme.palette.background.paper,
                                        borderColor: theme?.customization?.isDarkMode ? theme.palette.grey[400] : theme.palette.grey[600],
                                        borderStyle: 'solid',
                                        borderWidth: '1px',
                                        '& button': {
                                            borderColor: `${
                                                theme?.customization?.isDarkMode ? theme.palette.grey[400] : theme.palette.grey[600]
                                            } !important`,
                                            color: theme?.customization?.isDarkMode ? 'white' : 'black'
                                        }
                                    }}
                                >
                                    <Button onClick={reactFlowInstance?.zoomIn}>
                                        <IconPlus />
                                    </Button>
                                    <Button onClick={reactFlowInstance?.zoomOut}>
                                        <IconMinus />
                                    </Button>
                                    <Button onClick={reactFlowInstance?.fitView}>
                                        <IconMaximize />
                                    </Button>
                                    <Button onClick={onToggleLockViewport}>
                                        {isNodesDraggable || isNodesConnectable || isElementsSelectable ? <IconLockOpen /> : <IconLock />}
                                    </Button>
                                </Box>
                            </Box>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onNodeClick={onNodeClick}
                                onEdgesChange={onEdgesChange}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onNodeDragStop={onNodeDragStop}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                onConnect={onConnect}
                                onInit={setReactFlowInstance}
                                nodeDragThreshold={1}
                                fitView
                                deleteKeyCode={canvas.canvasDialogShow ? null : ['Delete']}
                                minZoom={0.1}
                                nodesDraggable={isNodesDraggable}
                                nodesConnectable={isNodesConnectable}
                                elementsSelectable={isElementsSelectable}
                                className='chatflow-canvas'
                            >
                                <Background color='#aaa' gap={16} />
                            </ReactFlow>
                        </div>
                    </div>
                </Box>
                <ConfirmDialog />
            </Box>
        </>
    )
}

export default Canvas
