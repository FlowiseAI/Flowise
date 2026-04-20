import { useEffect, useRef, useState, useCallback, useContext, useMemo } from 'react'
import ReactFlow, { addEdge, Controls, Background, useNodesState, useEdgesState } from 'reactflow'
import 'reactflow/dist/style.css'

import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
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
import Avatars from './Avatars'
import CursorOverlay from './CursorOverlay'
import WebSocketStatusBanner from '@/views/canvas/WebSocketStatusBanner'
import { ConnectionStatusNotification, ConnectionStatusIndicator } from '@/views/canvas/ConnectionStatusNotification'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ChatPopUp from '@/views/chatmessage/ChatPopUp'
import VectorStorePopUp from '@/views/vectorstore/VectorStorePopUp'
import { flowContext } from '@/store/context/ReactFlowContext'
import { CanvasPresenceProvider } from '@/contexts/CanvasPresenceContext'
import { useNodePresenceSync } from '@/hooks/useNodePresenceSync'
import { CanvasPresenceContext } from '@/contexts/CanvasPresenceContext'

// API
import nodesApi from '@/api/nodes'
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'
import { useAuth } from '@/hooks/useAuth'
import { useCollaboration } from '@/hooks/useCollaboration'
import { useWebSocketContext } from '@/contexts/WebSocketContext'

// icons
import { IconX, IconRefreshAlert, IconMagnetFilled, IconMagnetOff, IconArtboard, IconArtboardOff } from '@tabler/icons-react'

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
import { throttle } from '@/utils/throttle'

// const
import { FLOWISE_CREDENTIAL_ID } from '@/store/constant'

const nodeTypes = { customNode: CanvasNode, stickyNote: StickyNote }
const edgeTypes = { buttonedge: ButtonEdge }

// ==============================|| CANVAS ||============================== //

const Canvas = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    const { hasAssignedWorkspace } = useAuth()

    const { state } = useLocation()
    const templateFlowData = state ? state.templateFlowData : ''

    const URLpath = document.location.pathname.toString().split('/')
    const chatflowId =
        URLpath[URLpath.length - 1] === 'canvas' || URLpath[URLpath.length - 1] === 'agentcanvas' ? '' : URLpath[URLpath.length - 1]
    const isAgentCanvas = URLpath.includes('agentcanvas') ? true : false
    const canvasTitle = URLpath.includes('agentcanvas') ? 'Agent' : 'Chatflow'

    const { confirm } = useConfirm()

    const currentUser = useSelector((state) => state.auth.user)
    const { remoteChanges, remoteCursors, snapshotSync, updateNode, updateEdge, sendCursorMove, updateUserColor } = useCollaboration()
    const { hasJoined, sessionId, activeUsers, joinChatflow, leaveChatflow, sendNodePresence } = useContext(CanvasPresenceContext)
    const { healthStatus } = useWebSocketContext()

    // Sync node presence with WebSocket
    useNodePresenceSync(chatflowId, sessionId)

    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)
    const canvas = useSelector((state) => state.canvas)
    const [canvasDataStore, setCanvasDataStore] = useState(canvas)
    const [chatflow, setChatflow] = useState(null)
    const { reactFlowInstance, setReactFlowInstance } = useContext(flowContext)
    const [isCollaborativeMode, setIsCollaborativeMode] = useState(false)

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
    const [isSnappingEnabled, setIsSnappingEnabled] = useState(false)
    const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(true)

    const reactFlowWrapper = useRef(null)
    const pendingNodeChanges = useRef([]) // Data structure: [{ id: nodeId, type: changeType, node: nodeData (for 'add' type) }]
    const pendingEdgeChanges = useRef([])
    const changeTimeout = useRef(null)
    const hasJoinedRef = useRef(false) // Track if user has joined to ensure cleanup on unmount

    const [lastUpdatedDateTime, setLasUpdatedDateTime] = useState('')
    const [chatflowName, setChatflowName] = useState('')
    const [flowData, setFlowData] = useState('')

    // ==============================|| WebSocket Debounced Updates ||============================== //

    const sendPendingChanges = useCallback(() => {
        if (!hasJoined || !chatflowId) return

        // Send node changes
        if (pendingNodeChanges.current.length > 0) {
            pendingNodeChanges.current.forEach((change) => {
                // For 'add', 'remove' operations, use the node data stored in the change object
                // For other operations, look up the current node from the nodes array
                const node = change.node || nodes.find((n) => n.id === change.id)
                if (node) {
                    updateNode(node, change.type)
                }
            })
            pendingNodeChanges.current = []
        }

        // Send all edge changes
        if (pendingEdgeChanges.current.length > 0) {
            pendingEdgeChanges.current.forEach((change) => {
                // Use stored edge data if available, otherwise look up current edge
                const edge = change.edge || edges.find((e) => e.id === change.id)
                if (edge) {
                    updateEdge(edge, change.type)
                }
            })
            pendingEdgeChanges.current = []
        }
    }, [hasJoined, chatflowId, nodes, updateNode, edges, updateEdge])

    const debouncedSendChanges = useCallback(() => {
        if (changeTimeout.current) {
            clearTimeout(changeTimeout.current)
        }
        changeTimeout.current = setTimeout(() => {
            sendPendingChanges()
        }, 1000) // 1 second debounce
    }, [sendPendingChanges])

    // Handle remote changes from other users
    useEffect(() => {
        if (!hasJoined || !remoteChanges) return
        if (remoteChanges.node) {
            if (remoteChanges.changeType === 'add') {
                setNodes((nds) => [...nds, remoteChanges.node])
            } else if (remoteChanges.changeType === 'remove') {
                setNodes((nds) => nds.filter((node) => node.id !== remoteChanges.node.id))
            } else {
                setNodes((nds) => nds.map((node) => (node.id === remoteChanges.node.id ? remoteChanges.node : node)))
            }
        }
        if (remoteChanges.edge) {
            if (remoteChanges.changeType === 'add') {
                setEdges((eds) => [...eds, remoteChanges.edge])
            } else if (remoteChanges.changeType === 'remove') {
                setEdges((eds) => eds.filter((edge) => edge.id !== remoteChanges.edge.id))
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasJoined, remoteChanges])

    // Handle snapshot sync when joining a chatflow (sync latest state to avoid stale API data)
    useEffect(() => {
        if (!snapshotSync) return
        // Update nodes and edges from the server snapshot
        if (snapshotSync.nodes) {
            setNodes(snapshotSync.nodes)
        }
        if (snapshotSync.edges) {
            setEdges(snapshotSync.edges)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snapshotSync])

    // Handle the component unmounting: send user leave presence
    useEffect(() => {
        return () => {
            // Always check the ref to ensure we leave if user had joined
            if (hasJoinedRef.current && chatflowId && sessionId) {
                leaveChatflow(chatflowId, sessionId)
                hasJoinedRef.current = false
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ==============================|| Chatflow API ||============================== //

    const getNodesApi = useApi(nodesApi.getAllNodes)
    const createNewChatflowApi = useApi(chatflowsApi.createNewChatflow)
    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
    const getSpecificChatflowApi = useApi(chatflowsApi.getSpecificChatflow)
    const getHasChatflowChangedApi = useApi(chatflowsApi.getHasChatflowChanged)

    // ==============================|| Events & Actions ||============================== //

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
                    if (!isCollaborativeMode) {
                        setTimeout(() => setDirty(), 0)
                    }
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
        pendingEdgeChanges.current.push({ id: newEdge.id, type: 'add', edge: newEdge })
        debouncedSendChanges()
    }

    const handleNodesChange = (changes) => {
        onNodesChange(changes)
        // Track changes that should be sent to other users
        changes.forEach((change) => {
            if (['position', 'dimensions', 'select'].includes(change.type) && change.dragging === false) {
                // Only track completed changes (not during drag)
                const existingIndex = pendingNodeChanges.current.findIndex((c) => c.id === change.id)
                if (existingIndex >= 0) {
                    pendingNodeChanges.current[existingIndex] = change
                } else {
                    pendingNodeChanges.current.push(change)
                }
                debouncedSendChanges()
            }
        })
    }

    const handleEdgesChange = (changes) => {
        onEdgesChange(changes)
        // Track changes that should be sent to other users
        changes.forEach((change) => {
            if (['reset'].includes(change.type)) {
                const existingIndex = pendingEdgeChanges.current.findIndex((c) => c.id === change.id)
                if (existingIndex >= 0) {
                    pendingEdgeChanges.current[existingIndex] = change.item
                } else {
                    pendingEdgeChanges.current.push(change.item)
                }
                debouncedSendChanges()
            }
        })
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
            description: `Delete ${canvasTitle} ${chatflow.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await chatflowsApi.deleteChatflow(chatflow.id)
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
    }

    const handleSaveFlow = async (chatflowName) => {
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
                const newChatflowBody = {
                    name: chatflowName,
                    deployed: false,
                    isPublic: false,
                    flowData,
                    type: isAgentCanvas ? 'MULTIAGENT' : 'CHATFLOW'
                }
                createNewChatflowApi.request(newChatflowBody)
            } else {
                setChatflowName(chatflowName)
                setFlowData(flowData)
                getHasChatflowChangedApi.request(chatflow.id, lastUpdatedDateTime)
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
            if (!isCollaborativeMode) {
                setTimeout(() => setDirty(), 0)
            }
            pendingNodeChanges.current.push({
                id: newNode.id,
                type: 'add',
                node: { ...newNode, absolutePosition: position, width: 300 }
            })
            debouncedSendChanges()
        },

        // eslint-disable-next-line
        [reactFlowInstance, debouncedSendChanges]
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

    const setDirty = () => {
        dispatch({ type: SET_DIRTY })
    }

    const handleCollaborativeModeChange = (newValue) => {
        setIsCollaborativeMode(newValue)
        if (newValue) {
            joinChatflow(chatflowId, currentUser)
            hasJoinedRef.current = true
        } else {
            leaveChatflow(chatflowId, sessionId)
            hasJoinedRef.current = false
        }
    }

    // Adaptive throttling based on server health
    // Critical: 200ms (~5 updates/sec), Warning: 100ms (~10 updates/sec), Healthy: 40ms (~25 updates/sec)
    const getThrottleDelay = useCallback(() => {
        if (healthStatus?.status === 'critical') return 200
        if (healthStatus?.status === 'warning') return 100
        return 40
    }, [healthStatus])

    // Get current throttle delay
    const throttleDelay = getThrottleDelay()

    // Throttled cursor movement handler with adaptive throttling
    // Recreate throttled function when delay changes to adapt to server health
    const throttledSendCursor = useMemo(
        () =>
            throttle((x, y) => {
                if (isCollaborativeMode && hasJoined) {
                    sendCursorMove(x, y)
                }
            }, throttleDelay),
        [throttleDelay, isCollaborativeMode, hasJoined, sendCursorMove]
    )

    // Track cursor movement on canvas
    useEffect(() => {
        if (!isCollaborativeMode || !reactFlowWrapper.current) return

        const handleMouseMove = (e) => {
            const rect = reactFlowWrapper.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            // Only send if cursor is within canvas bounds
            if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
                throttledSendCursor(x, y)
            }
        }

        const canvas = reactFlowWrapper.current
        canvas.addEventListener('mousemove', handleMouseMove)

        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove)
        }
    }, [isCollaborativeMode, throttledSendCursor])

    // Node presence handlers
    const onNodeMouseEnter = useCallback(
        (event, node) => {
            if (isCollaborativeMode && hasJoined) {
                sendNodePresence(node.id, 'enter')
            }
        },
        [isCollaborativeMode, hasJoined, sendNodePresence]
    )

    const onNodeMouseLeave = useCallback(
        (event, node) => {
            if (isCollaborativeMode && hasJoined) {
                sendNodePresence(node.id, 'leave')
            }
        },
        [isCollaborativeMode, hasJoined, sendNodePresence]
    )

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

    // ==============================|| useEffect ||============================== //

    // Get specific chatflow successful
    useEffect(() => {
        if (getSpecificChatflowApi.data) {
            const chatflow = getSpecificChatflowApi.data
            const workspaceId = chatflow.workspaceId
            if (!hasAssignedWorkspace(workspaceId)) {
                navigate('/unauthorized')
                return
            }
            const initialFlow = chatflow.flowData ? JSON.parse(chatflow.flowData) : []
            setLasUpdatedDateTime(chatflow.updatedDate)
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
            errorFailed(`Failed to retrieve ${canvasTitle}: ${createNewChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createNewChatflowApi.data, createNewChatflowApi.error])

    // Update chatflow successful
    useEffect(() => {
        if (updateChatflowApi.data) {
            dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
            setLasUpdatedDateTime(updateChatflowApi.data.updatedDate)
            saveChatflowSuccess()
        } else if (updateChatflowApi.error) {
            errorFailed(`Failed to retrieve ${canvasTitle}: ${updateChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateChatflowApi.data, updateChatflowApi.error])

    // check if chatflow has changed before saving
    useEffect(() => {
        const checkIfHasChanged = async () => {
            if (getHasChatflowChangedApi.data?.hasChanged === true) {
                const confirmPayload = {
                    title: `Confirm Change`,
                    description: `${canvasTitle} ${chatflow.name} has changed since you have opened, overwrite changes?`,
                    confirmButtonName: 'Confirm',
                    cancelButtonName: 'Cancel'
                }
                const isConfirmed = await confirm(confirmPayload)

                if (!isConfirmed) {
                    return
                }
            }
            const updateBody = {
                name: chatflowName,
                flowData
            }
            updateChatflowApi.request(chatflow.id, updateBody)
        }

        if (getHasChatflowChangedApi.data) {
            checkIfHasChanged()
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getHasChatflowChangedApi.data, getHasChatflowChangedApi.error])

    useEffect(() => {
        setChatflow(canvasDataStore.chatflow)
        if (canvasDataStore.chatflow) {
            const flowData = canvasDataStore.chatflow.flowData ? JSON.parse(canvasDataStore.chatflow.flowData) : []
            checkIfUpsertAvailable(flowData.nodes || [], flowData.edges || [])
            checkIfSyncNodesAvailable(flowData.nodes || [])
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasDataStore.chatflow])

    // Initialization
    useEffect(() => {
        setIsSyncNodesButtonEnabled(false)
        setIsUpsertButtonEnabled(false)
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
        setCanvasDataStore(canvas)
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

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (changeTimeout.current) {
                clearTimeout(changeTimeout.current)
            }
        }
    }, [])

    usePrompt('You have unsaved changes! Do you want to navigate away?', canvasDataStore.isDirty && !isCollaborativeMode)

    return (
        <>
            <Box>
                <ConnectionStatusNotification />
                {isCollaborativeMode && <ConnectionStatusIndicator />}
                {isCollaborativeMode && <WebSocketStatusBanner />}
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
                            chatflow={chatflow}
                            handleSaveFlow={handleSaveFlow}
                            handleDeleteFlow={handleDeleteFlow}
                            handleLoadFlow={handleLoadFlow}
                            isAgentCanvas={isAgentCanvas}
                            isCollaborativeMode={isCollaborativeMode}
                            onCollaborativeModeChange={handleCollaborativeModeChange}
                        />
                    </Toolbar>
                </AppBar>
                <Box sx={{ pt: '70px', height: '100vh', width: '100%' }}>
                    <div className='reactflow-parent-wrapper'>
                        <div className='reactflow-wrapper' ref={reactFlowWrapper}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={handleNodesChange}
                                onNodeClick={onNodeClick}
                                onNodeMouseEnter={onNodeMouseEnter}
                                onNodeMouseLeave={onNodeMouseLeave}
                                onEdgesChange={handleEdgesChange}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onNodeDragStop={setDirty}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                onConnect={onConnect}
                                onInit={setReactFlowInstance}
                                fitView
                                deleteKeyCode={canvas.canvasDialogShow ? null : ['Delete']}
                                minZoom={0.1}
                                snapGrid={[25, 25]}
                                snapToGrid={isSnappingEnabled}
                                className='chatflow-canvas'
                            >
                                <Controls
                                    className={customization.isDarkMode ? 'dark-mode-controls' : ''}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                >
                                    <button
                                        className='react-flow__controls-button react-flow__controls-interactive'
                                        onClick={() => {
                                            setIsSnappingEnabled(!isSnappingEnabled)
                                        }}
                                        title='toggle snapping'
                                        aria-label='toggle snapping'
                                    >
                                        {isSnappingEnabled ? <IconMagnetFilled /> : <IconMagnetOff />}
                                    </button>
                                    <button
                                        className='react-flow__controls-button react-flow__controls-interactive'
                                        onClick={() => {
                                            setIsBackgroundEnabled(!isBackgroundEnabled)
                                        }}
                                        title='toggle background'
                                        aria-label='toggle background'
                                    >
                                        {isBackgroundEnabled ? <IconArtboard /> : <IconArtboardOff />}
                                    </button>
                                </Controls>
                                {isBackgroundEnabled && <Background color='#aaa' gap={16} />}
                                {isCollaborativeMode && (
                                    <Avatars activeUsers={activeUsers} currentUser={currentUser} onColorChange={updateUserColor} />
                                )}
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
                                {isUpsertButtonEnabled && <VectorStorePopUp chatflowid={chatflowId} />}
                                <ChatPopUp isAgentCanvas={isAgentCanvas} chatflowid={chatflowId} />
                            </ReactFlow>
                            {isCollaborativeMode && <CursorOverlay cursors={remoteCursors} />}
                        </div>
                    </div>
                </Box>
                <ConfirmDialog />
            </Box>
        </>
    )
}

// Wrap Canvas with NodePresenceProvider
const CanvasWithPresence = () => (
    <CanvasPresenceProvider>
        <Canvas />
    </CanvasPresenceProvider>
)

export default CanvasWithPresence
