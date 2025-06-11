import { useEffect, useRef, useState, useCallback, useContext, useMemo } from 'react'
import ReactFlow, { addEdge, Controls, Background, useNodesState, useEdgesState, ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'
import PropTypes from 'prop-types'

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
import ButtonEdge from './ButtonEdge'
import CanvasHeader from './CanvasHeader'
import AddNodes from './AddNodes'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ChatPopUp from '@/views/chatmessage/ChatPopUp'
import VectorStorePopUp from '@/views/vectorstore/VectorStorePopUp'
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

import { getNodeTypes } from './nodeTypes'
import { LoopNode } from './LoopNode'

// const
import { FLOWISE_CREDENTIAL_ID } from '@/store/constant'

// ==============================|| CANVAS ||============================== //

const Canvas = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    const { deleteNode, duplicateNode } = useContext(flowContext)

    // 定义边类型
    const edgeTypes = useMemo(() => ({ buttonedge: ButtonEdge }), [])

    // 定义节点类型
    const allNodeTypes = useMemo(
        () =>
            getNodeTypes({
                loop: (props) => (
                    <LoopNode
                        {...props}
                        data={{
                            ...props.data,
                            duplicateNode
                        }}
                    />
                )
            }),
        []
    )

    const { state } = useLocation()
    const templateFlowData = state ? state.templateFlowData : ''

    const URLpath = document.location.pathname.toString().split('/')
    const chatflowId =
        URLpath[URLpath.length - 1] === 'canvas' || URLpath[URLpath.length - 1] === 'agentcanvas' ? '' : URLpath[URLpath.length - 1]
    const isAgentCanvas = URLpath.includes('agentcanvas') ? true : false
    const canvasTitle = URLpath.includes('agentcanvas') ? 'Agent' : 'Chatflow'

    const { confirm } = useConfirm()

    const dispatch = useDispatch()
    const canvas = useSelector((state) => state.canvas)
    const [canvasDataStore, setCanvasDataStore] = useState(canvas)
    const [chatflow, setChatflow] = useState(null)
    const { reactFlowInstance, setReactFlowInstance } = useContext(flowContext)

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    // ==============================|| ReactFlow ||============================== //

    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])

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

    const onInit = useCallback(
        (instance) => {
            setReactFlowInstance(instance)
        },
        [setReactFlowInstance]
    )

    const onConnect = useCallback(
        (params) => {
            const newEdge = {
                ...params,
                type: 'buttonedge',
                id: `${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}`
            }

            // 查找源节点和目标节点
            const sourceNode = nodes.find((node) => node.id === params.source)
            const targetNode = nodes.find((node) => node.id === params.target)

            console.log('连接事件:', {
                sourceNode,
                targetNode,
                params
            })

            // 如果目标节点是循环节点，允许任何节点连接到它
            if (targetNode?.type === 'loop' || sourceNode?.type === 'loop') {
                setEdges((eds) => addEdge(newEdge, eds))
                return
            }

            const targetNodeId = params.targetHandle.split('-')[0]
            const sourceNodeId = params.sourceHandle.split('-')[0]
            const targetInput = params.targetHandle.split('-')[2]

            // 如果是 LoopFunction 的 failure 输出连接到 LoopInput
            if (
                sourceNode?.data?.name === 'loopFunction' &&
                params.sourceHandle?.includes('failure') &&
                targetNode?.data?.type === 'LoopInput'
            ) {
                console.log('LoopFunction failure 连接到 LoopInput:', {
                    loopFunctionId: sourceNode.id,
                    loopInputId: targetNode.id
                })

                // 更新源节点的数据
                setNodes((nds) =>
                    nds.map((node) => {
                        if (node.id === sourceNode.id) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    inputs: {
                                        ...node.data.inputs,
                                        loopBackNode: targetNode.id,
                                        connectedLoopInput: `${targetNode.data.label || 'Loop Input'} (${targetNode.id})`
                                    }
                                }
                            }
                        }
                        return node
                    })
                )
            }

            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === targetNodeId) {
                        setTimeout(() => setDirty(), 0)
                        let value
                        const inputAnchor = node.data.inputAnchors.find((ancr) => ancr.name === targetInput)
                        const inputParam = node.data.inputParams.find((param) => param.name === targetInput)

                        if (inputAnchor && inputAnchor.list) {
                            const newValues = node.data.inputs[targetInput] || []
                            value = rearrangeToolsOrdering(newValues, sourceNodeId)
                        } else {
                            value = sourceNodeId
                        }

                        const newInputs = {
                            ...node.data.inputs,
                            [targetInput]: value
                        }

                        return {
                            ...node,
                            data: {
                                ...node.data,
                                inputs: newInputs
                            }
                        }
                    }
                    return node
                })
            )

            setEdges((eds) => addEdge(newEdge, eds))
        },
        [nodes, setNodes, setEdges]
    )

    const handleLoadFlow = (file) => {
        try {
            const flowData = JSON.parse(file)
            const nodes = flowData.nodes || []

            console.log('Loading flow data:', flowData)
            console.log('Original nodes:', nodes)

            // 处理循环节点的内部数据
            const processedNodes = nodes.map((node) => {
                if (node.type === 'loop') {
                    console.log('Processing loop node:', node)
                    // 确保 data 对象存在
                    const nodeData = node.data || {}
                    // 确保 innerNodes 是数组
                    const innerNodes = Array.isArray(nodeData.innerNodes) ? nodeData.innerNodes : []
                    // 确保 innerEdges 是数组
                    const innerEdges = Array.isArray(nodeData.innerEdges) ? nodeData.innerEdges : []

                    const processedNode = {
                        ...node,
                        data: {
                            ...nodeData,
                            innerNodes: innerNodes.map((innerNode) => ({
                                ...innerNode,
                                data: {
                                    ...innerNode.data,
                                    selected: false
                                }
                            })),
                            innerEdges: innerEdges,
                            selected: false
                        }
                    }
                    console.log('Processed loop node:', processedNode)
                    return processedNode
                }
                return node
            })

            console.log('Processed nodes:', processedNodes)
            setNodes(processedNodes)
            setEdges(flowData.edges || [])
            setTimeout(() => setDirty(), 0)
        } catch (e) {
            console.error('Error in handleLoadFlow:', e)
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

    const handleSaveFlow = (chatflowName) => {
        if (reactFlowInstance) {
            // 获取最新的节点数据
            const currentNodes = reactFlowInstance.getNodes()
            const nodes = currentNodes.map((node) => {
                const nodeData = cloneDeep(node.data)
                if (Object.prototype.hasOwnProperty.call(nodeData.inputs, FLOWISE_CREDENTIAL_ID)) {
                    nodeData.credential = nodeData.inputs[FLOWISE_CREDENTIAL_ID]
                    nodeData.inputs = omit(nodeData.inputs, [FLOWISE_CREDENTIAL_ID])
                }

                // 如果是循环节点，确保内部节点和边也被保存
                if (node.type === 'loop') {
                    // 内部节点数据已经在 nodeData 中了，因为我们在 LoopNode 组件中同步了数据
                    nodeData.innerNodes = (nodeData.innerNodes || []).map((innerNode) => ({
                        ...innerNode,
                        data: {
                            ...innerNode.data,
                            category: 'Loop',
                            selected: false
                        }
                    }))
                    nodeData.category = 'Loop'
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
                const updateBody = {
                    name: chatflowName,
                    flowData
                }
                updateChatflowApi.request(chatflow.id, updateBody)
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
            // 检查目标元素是否在循环节点内部
            const isInsideLoopNode = event.target.closest('.react-flow__renderer')?.parentElement?.closest('.react-flow__renderer')
            if (isInsideLoopNode) {
                return // 如果是在循环节点内部，不处理拖拽
            }

            event.preventDefault()
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
            let nodeData = event.dataTransfer.getData('application/reactflow')

            // check if the dropped element is valid
            if (typeof nodeData === 'undefined' || !nodeData) {
                return
            }

            nodeData = JSON.parse(nodeData)

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - reactFlowBounds.left - 100,
                y: event.clientY - reactFlowBounds.top - 50
            })

            const newNodeId = getUniqueNodeId(nodeData, reactFlowInstance.getNodes())

            const newNode = {
                id: newNodeId,
                position,
                type: nodeData.type === 'StickyNote' ? 'stickyNote' : nodeData.type === 'group' ? 'group' : 'customNode',
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
        [reactFlowInstance]
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

    const onEdgesDelete = useCallback(
        (edgesToDelete) => {
            // 遍历要删除的边
            edgesToDelete.forEach((edge) => {
                const sourceNode = nodes.find((node) => node.id === edge.source)
                const targetNode = nodes.find((node) => node.id === edge.target)

                // 如果是从 LoopFunction 的 failure 输出到 LoopInput 的连接
                if (
                    sourceNode?.data?.name === 'loopFunction' &&
                    edge.sourceHandle?.includes('failure') &&
                    targetNode?.data?.type === 'LoopInput'
                ) {
                    // 清除源节点的循环相关数据
                    setNodes((nds) =>
                        nds.map((node) => {
                            if (node.id === sourceNode.id) {
                                const newInputs = { ...node.data.inputs }
                                delete newInputs.loopBackNode
                                delete newInputs.connectedLoopInput

                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        inputs: newInputs
                                    }
                                }
                            }
                            return node
                        })
                    )
                }
            })
        },
        [nodes, setNodes]
    )

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
            dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
            saveChatflowSuccess()
        } else if (updateChatflowApi.error) {
            errorFailed(`Failed to save ${canvasTitle}: ${updateChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateChatflowApi.data, updateChatflowApi.error])

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

    usePrompt('You have unsaved changes! Do you want to navigate away?', canvasDataStore.isDirty)

    // 添加创建循环节点的函数
    const handleAddLoopNode = useCallback(() => {
        if (!reactFlowInstance) return

        const { x, y, zoom } = reactFlowInstance.getViewport()
        const flowBounds = reactFlowWrapper.current.getBoundingClientRect()
        const centerX = (flowBounds.width / 2 - x) / zoom
        const centerY = (flowBounds.height / 2 - y) / zoom

        // 添加日志来检查 loopNode 的结构
        console.log('Creating loop node...')

        const loopNode = {
            id: `loop-${Date.now()}`,
            type: 'loop',
            position: {
                x: centerX,
                y: centerY
            },
            data: {
                name: 'loop',
                id: `loop-${Date.now()}`,
                title: '新循环节点',
                loopCount: 5,
                children: [],
                type: 'loop',
                inputs: {},
                selected: false,
                inputParams: [], // 添加必要的输入参数
                outputParams: [], // 添加必要的输出参数
                inputAnchors: [], // 添加输入锚点
                outputAnchors: [] // 添加输出锚点
            }
        }

        console.log('Loop node structure:', loopNode)

        try {
            setNodes((nds) => {
                const newNodes = nds.concat([loopNode])
                return newNodes
            })
        } catch (error) {
            console.error('Error adding loop node:', error)
        }

        // 延迟执行视图适应
        setTimeout(() => {
            try {
                reactFlowInstance.fitView({ padding: 0.2 })
            } catch (error) {
                console.error('Error fitting view:', error)
            }
        }, 50)
    }, [reactFlowInstance])

    // 自定义节点变更处理
    const handleNodesChange = useCallback(
        (changes) => {
            // 处理删除事件
            const deletions = changes.filter((change) => change.type === 'remove')
            if (deletions.length > 0) {
                // 检查要删除的节点中是否有循环节点，且其内部有被选中的节点
                const shouldPreventDelete = deletions.some((deletion) => {
                    const node = nodes.find((n) => n.id === deletion.id)
                    if (node?.type === 'loop') {
                        // 检查是否有内部节点被选中
                        return node.data?.innerNodes?.some((innerNode) => innerNode.selected)
                    }
                    return false
                })

                if (shouldPreventDelete) {
                    // 如果有循环节点内部节点被选中，阻止删除循环节点
                    const safeChanges = changes.filter((change) => {
                        if (change.type === 'remove') {
                            const node = nodes.find((n) => n.id === change.id)
                            return !node?.type === 'loop'
                        }
                        return true
                    })
                    onNodesChange(safeChanges)
                    return
                }
            }

            // 处理其他变更
            onNodesChange(changes)
        },
        [nodes, onNodesChange]
    )

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
                            chatflow={chatflow}
                            handleSaveFlow={handleSaveFlow}
                            handleDeleteFlow={handleDeleteFlow}
                            handleLoadFlow={handleLoadFlow}
                            isAgentCanvas={isAgentCanvas}
                        />
                        <Button
                            variant='contained'
                            onClick={handleAddLoopNode}
                            sx={{
                                ml: 2,
                                height: '36px',
                                minWidth: 'auto',
                                px: 2,
                                backgroundColor: '#2196f3',
                                color: '#fff',
                                borderRadius: '8px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: '14px',
                                '&:hover': {
                                    backgroundColor: '#1976d2'
                                }
                            }}
                        >
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    gap: '4px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <svg viewBox='0 0 24 24' width='16' height='16' fill='currentColor' style={{ marginRight: '4px' }}>
                                    <path d='M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z' />
                                </svg>
                                <span>循环</span>
                            </span>
                        </Button>
                    </Toolbar>
                </AppBar>
                <Box sx={{ pt: '70px', height: '100vh', width: '100%' }}>
                    <div className='reactflow-parent-wrapper'>
                        <div className='reactflow-wrapper' ref={reactFlowWrapper}>
                            <ReactFlowProvider>
                                <ReactFlow
                                    nodes={nodes}
                                    edges={edges}
                                    onNodesChange={handleNodesChange}
                                    onNodeClick={onNodeClick}
                                    onEdgesChange={onEdgesChange}
                                    onEdgesDelete={onEdgesDelete}
                                    onDrop={onDrop}
                                    onDragOver={onDragOver}
                                    onNodeDragStop={setDirty}
                                    nodeTypes={allNodeTypes}
                                    edgeTypes={edgeTypes}
                                    onConnect={onConnect}
                                    onInit={onInit}
                                    fitView
                                    deleteKeyCode={canvas.canvasDialogShow ? null : ['Delete']}
                                    minZoom={0.1}
                                    className='chatflow-canvas'
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
                                    {isUpsertButtonEnabled && <VectorStorePopUp chatflowid={chatflowId} />}
                                    <ChatPopUp isAgentCanvas={isAgentCanvas} chatflowid={chatflowId} />
                                </ReactFlow>
                            </ReactFlowProvider>
                        </div>
                    </div>
                </Box>
                <ConfirmDialog />
            </Box>
        </>
    )
}

Canvas.propTypes = {
    data: PropTypes.shape({
        id: PropTypes.string,
        type: PropTypes.string,
        position: PropTypes.shape({
            x: PropTypes.number,
            y: PropTypes.number
        }),
        data: PropTypes.object
    })
}

export default Canvas
