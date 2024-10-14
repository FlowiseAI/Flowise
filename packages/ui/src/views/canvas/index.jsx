'use client'
import dynamic from 'next/dynamic'
import * as React from 'react'
import { useEffect, useRef, useState, useCallback, useContext, useMemo, useTransition } from 'react'
import { addEdge, Controls, Background, useNodesState, useEdgesState } from 'reactflow'

import 'reactflow/dist/style.css'

import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation, usePathname } from '@/utils/navigation'
import {
    REMOVE_DIRTY,
    SET_DIRTY,
    SET_CHATFLOW,
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
import useConfirm from '@/hooks/useConfirm'

// icons
import { IconX, IconRefreshAlert } from '@tabler/icons-react'

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
import { usePrompt } from '@/utils/usePrompt'

// const
import { FLOWISE_CREDENTIAL_ID } from '@/store/constant'

// ==============================|| CANVAS ||============================== //
const ReactFlow = dynamic(() => import('reactflow').then((mod) => mod.default), { ssr: false })

const Canvas = React.memo(function Canvas({ chatflowid }) {
    const theme = useTheme()
    const navigate = useNavigate()

    const { state } = useLocation()
    const templateData = state?.templateData ? JSON.parse(state.templateData) : ''
    const templateFlowData = templateData?.flowData ? templateData.flowData : ''
    const templateName = state ? state.templateName : ''
    const parentChatflowId = state && isNaN(state.parentChatflowId) ? state.parentChatflowId : undefined
    // console.log({ templateData, chatflowid, templateFlowData, templateName, parentChatflowId })
    const pathname = usePathname()
    // const URLpath = pathname.split('/')
    // const chatflowId =
    //     URLpath[URLpath.length - 1] === 'canvas' || URLpath[URLpath.length - 1] === 'agentcanvas' ? '' : URLpath[URLpath.length - 1]
    const isAgentCanvas = pathname.includes('agentcanvas')
    const canvasTitle = isAgentCanvas ? 'Agent' : 'Chatflow'

    const { confirm } = useConfirm()

    const dispatch = useDispatch()
    const canvas = useSelector((state) => state.canvas)
    const canvasDataStoreRef = useRef(canvas)
    const [chatflow, setChatflow] = useState(null)
    const { reactFlowInstance, setReactFlowInstance } = useContext(flowContext)

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    // ==============================|| ReactFlow ||============================== //

    const [nodes, setNodes, onNodesChange] = useNodesState()
    const [edges, setEdges, onEdgesChange] = useEdgesState()

    const [selectedNode, setSelectedNode] = useState(null)
    const [isUpsertButtonEnabled, setIsUpsertButtonEnabled] = useState(false)
    const [isSyncNodesButtonEnabled, setIsSyncNodesButtonEnabled] = useState(false)

    const reactFlowWrapper = useRef(null)

    // ==============================|| Chatflow API ||============================== //

    const getNodesApi = useApi(nodesApi.getAllNodes)
    const createNewChatflowApi = useApi(chatflowsApi.createNewChatflow)
    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
    const getSpecificChatflowApi = useApi(chatflowsApi.getSpecificChatflow)

    // ==============================|| Events & Actions ||============================== //
    const setDirty = () => {
        dispatch({ type: SET_DIRTY })
    }
    const onConnect = useCallback((params) => {
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
    }, [])

    const handleLoadFlow = useCallback(
        async (file) => {
            try {
                const flowData = JSON.parse(file)
                const nodes = flowData.nodes || []
                const edges = flowData.edges || []

                let existingChatflow = null
                let hasAccess = false

                if (flowData.id) {
                    try {
                        existingChatflow = await chatflowsApi.getSpecificChatflow(flowData.id)
                        hasAccess = true
                    } catch (error) {
                        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                            hasAccess = false
                        } else {
                            throw error // Re-throw if it's not a 401 or 403 error
                        }
                    }
                } else {
                    // No flowData.id provided, will create a new chatflow
                }

                if (existingChatflow && hasAccess) {
                    // Ask user if they want to overwrite or create a new chatflow
                    const userChoice = await confirm({
                        title: 'Chatflow already exists',
                        description: 'Do you want to overwrite the existing chatflow or create a new one?',
                        confirmButtonName: 'Overwrite',
                        cancelButtonName: 'Create New'
                    })

                    if (!userChoice) {
                        // Create new chatflow
                        delete flowData.id
                    }
                } else {
                    // User doesn't have access or chatflow doesn't exist, create a new chatflow
                    delete flowData.id
                }

                const newChatflow = {
                    id: flowData.id, // This will be undefined if we're creating a new chatflow
                    name: `Copy of ${templateData.name ?? templateFlowData.name}`,
                    description: flowData.description,
                    chatbotConfig: flowData.chatbotConfig,
                    visibility: flowData.visibility,
                    category: flowData.category,
                    type: flowData.type,
                    flowData: JSON.stringify({ nodes, edges })
                }
                // console.log('newChatflow', { existingChatflow, flowData, newChatflow })
                dispatch({ type: SET_CHATFLOW, chatflow: newChatflow })
                setNodes(nodes)
                setEdges(edges)
                setTimeout(() => setDirty(), 0)
            } catch (e) {
                console.error(e)
                enqueueSnackbar({
                    message: 'Failed to load chatflow: ' + e.message,
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
        },
        [confirm, dispatch, enqueueSnackbar, closeSnackbar, setNodes, setEdges, setDirty, templateData, templateFlowData]
    )

    const handleDeleteFlow = useCallback(async () => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete ${canvasTitle} ${chatflow.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await chatflowsApi.deleteChatflow(chatflow.id, chatflow.userId, chatflow.organizationId)
                localStorage.removeItem(`${chatflow.id}_INTERNAL`)
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
    }, [chatflow, confirm, navigate, isAgentCanvas, enqueueSnackbar, closeSnackbar])

    const handleSaveFlow = useCallback(
        (chatflowName) => {
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

                if (!chatflow.id) {
                    const duplicatedFlowData = localStorage.getItem('duplicatedFlowData')
                    let newChatflowBody
                    if (duplicatedFlowData) {
                        const parsedData = JSON.parse(duplicatedFlowData)
                        newChatflowBody = {
                            ...parsedData,
                            name: chatflowName,
                            flowData,
                            deployed: false,
                            isPublic: false
                        }
                        localStorage.removeItem('duplicatedFlowData')
                    } else {
                        newChatflowBody = {
                            name: chatflowName,
                            parentChatflowId,
                            deployed: false,
                            isPublic: false,
                            flowData,
                            type: isAgentCanvas ? 'MULTIAGENT' : 'CHATFLOW',
                            description: chatflow.description || '',
                            visibility: chatflow.visibility || [],
                            category: chatflow.category || '',
                            chatbotConfig: chatflow.chatbotConfig || ''
                        }
                    }
                    createNewChatflowApi.request(newChatflowBody)
                } else {
                    const updateBody = {
                        name: chatflowName,
                        flowData,
                        description: chatflow.description,
                        visibility: chatflow.visibility,
                        category: chatflow.category,
                        chatbotConfig: chatflow.chatbotConfig
                    }
                    updateChatflowApi.request(chatflow.id, updateBody)
                }
            }
        },
        [reactFlowInstance, chatflow, createNewChatflowApi, updateChatflowApi]
    )

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
            setTimeout(() => setDirty(), 0)
        },

        // eslint-disable-next-line
        [reactFlowInstance]
    )

    const syncNodes = () => {
        const componentNodes = canvasDataStoreRef.current.componentNodes

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

        setNodes(cloneNodes)
        setEdges(cloneEdges.filter((edge) => !toBeRemovedEdges.includes(edge)))
        setDirty()
        setIsSyncNodesButtonEnabled(false)
    }

    const saveChatflowSuccess = () => {
        dispatch({ type: REMOVE_DIRTY })
        enqueueSnackbar({
            message: `${canvasTitle} saved`,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'success',
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
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

    const checkIfUpsertAvailable = (nodes, edges) => {
        const upsertNodeDetails = getUpsertDetails(nodes, edges)
        if (upsertNodeDetails.length) setIsUpsertButtonEnabled(true)
        else setIsUpsertButtonEnabled(false)
    }

    const checkIfSyncNodesAvailable = (nodes) => {
        const componentNodes = canvasDataStoreRef.current.componentNodes

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
            window.history.replaceState(null, null, `/${isAgentCanvas ? 'agentcanvas' : 'canvas'}/${chatflow.id}`)
        } else if (createNewChatflowApi.error) {
            errorFailed(`Failed to save ${canvasTitle}: ${createNewChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createNewChatflowApi.data, createNewChatflowApi.error])

    // Update chatflow successful
    useEffect(() => {
        if (updateChatflowApi.data) {
            dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
            saveChatflowSuccess()
        } else if (updateChatflowApi.error) {
            errorFailed(`Failed to save ${canvasTitle}: ${updateChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateChatflowApi.data, updateChatflowApi.error])

    useEffect(() => {
        setChatflow({ ...canvasDataStoreRef.current.chatflow, parentChatflowId })
        if (canvasDataStoreRef.current.chatflow) {
            const flowData = canvasDataStoreRef.current.chatflow.flowData ? JSON.parse(canvasDataStoreRef.current.chatflow.flowData) : []
            checkIfUpsertAvailable(flowData.nodes || [], flowData.edges || [])
            checkIfSyncNodesAvailable(flowData.nodes || [])
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasDataStoreRef.current.chatflow])

    // Initialization
    useEffect(() => {
        setIsSyncNodesButtonEnabled(false)
        setIsUpsertButtonEnabled(false)
        if (chatflowid) {
            getSpecificChatflowApi.request(chatflowid)
        } else {
            if (localStorage.getItem('duplicatedFlowData')) {
                const duplicatedFlowData = JSON.parse(localStorage.getItem('duplicatedFlowData'))

                setNodes(duplicatedFlowData.nodes || [])
                setEdges(duplicatedFlowData.edges || [])
                dispatch({
                    type: SET_CHATFLOW,
                    chatflow: {
                        ...duplicatedFlowData,
                        id: undefined,
                        name: `Copy of ${duplicatedFlowData.name}`,
                        deployed: false,
                        isPublic: false
                    }
                })
                setTimeout(() => localStorage.removeItem('duplicatedFlowData'), 0)
            } else {
                setNodes([])
                setEdges([])
                console.log('no duplicatedFlowData')
                dispatch({
                    type: SET_CHATFLOW,
                    chatflow: {
                        name: templateName ? `Copy of ${templateName}` : `Untitled ${canvasTitle}`
                    }
                })
            }
        }
        getNodesApi.request()

        return () => {
            setTimeout(() => dispatch({ type: REMOVE_DIRTY }), 0)
        }
    }, [chatflowid]) // Only re-run if chatflowId changes

    useEffect(() => {
        canvasDataStoreRef.current = canvas
    }, [canvas])

    useEffect(() => {
        function handlePaste(e) {
            const pasteData = e.clipboardData.getData('text')
            //TODO: prevent paste event when input focused, temporary fix: catch chatflow syntax
            if (pasteData.includes('{"nodes":[') && pasteData.includes('],"edges":[')) {
                handleLoadFlow(pasteData)
            }
        }

        window.addEventListener('paste', handlePaste)

        return () => {
            window.removeEventListener('paste', handlePaste)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (templateFlowData && templateFlowData.includes('"nodes":[') && templateFlowData.includes('],"edges":[')) {
            handleLoadFlow(templateFlowData)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateFlowData])

    usePrompt('You have unsaved changes! Do you want to navigate away?', canvasDataStoreRef.current.isDirty)

    const [isPending, startTransition] = useTransition()

    const handleSomeStateUpdate = useCallback(() => {
        startTransition(() => {
            // State update here
        })
    }, [])

    // Move useMemo inside the component
    const nodeTypes = useMemo(() => ({ customNode: CanvasNode, stickyNote: StickyNote }), [])
    const edgeTypes = useMemo(() => ({ buttonedge: ButtonEdge }), [])

    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                <AppBar
                    enableColorOnDark
                    position='relative'
                    color='inherit'
                    elevation={1}
                    sx={{
                        bgcolor: theme.palette.background.default
                    }}
                >
                    <Toolbar>
                        <CanvasHeader
                            chatflow={chatflow}
                            handleSaveFlow={handleSaveFlow}
                            handleDeleteFlow={handleDeleteFlow}
                            handleLoadFlow={handleLoadFlow}
                            isAgentCanvas={isAgentCanvas}
                        />
                    </Toolbar>
                </AppBar>
                <Box sx={{ height: '100vh', width: '100%' }}>
                    <div className='reactflow-parent-wrapper'>
                        <div className='reactflow-wrapper' ref={reactFlowWrapper}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onNodeClick={onNodeClick}
                                onEdgesChange={onEdgesChange}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onNodeDragStop={setDirty}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                onConnect={onConnect}
                                onInit={setReactFlowInstance}
                                fitView
                                deleteKeyCode={canvasDataStoreRef.current.canvasDialogShow ? null : ['Delete']}
                                minZoom={0.1}
                            >
                                <Controls
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                />
                                <Background color='#aaa' gap={16} />
                                <AddNodes isAgentCanvas={isAgentCanvas} nodesData={getNodesApi.data} node={selectedNode} />
                                {isSyncNodesButtonEnabled && (
                                    <Fab
                                        sx={{
                                            left: 40,
                                            top: 20,
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
                                {isUpsertButtonEnabled && <VectorStorePopUp chatflowid={chatflowid} />}
                                <ChatPopUp isAgentCanvas={isAgentCanvas} chatflowid={chatflowid} />
                            </ReactFlow>
                        </div>
                    </div>
                </Box>
                <ConfirmDialog />
            </Box>
        </>
    )
})

export default Canvas
