import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, { addEdge, Background, ControlButton, Controls, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'

import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  closeSnackbar as closeSnackbarAction,
  enqueueSnackbar as enqueueSnackbarAction,
  REMOVE_DIRTY,
  SET_CHATFLOW,
  SET_DIRTY
} from '@/store/actions'
import { cloneDeep, filter, omit } from 'lodash'

// material-ui
import { AppBar, Box, Button, Fab, Toolbar } from '@mui/material'
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
import ELK from 'elkjs/lib/elk.bundled'
// API
import nodesApi from '@/api/nodes'
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// icons
import { IconArrowsShuffle, IconRefreshAlert, IconX } from '@tabler/icons-react'

// utils
import {
  getUniqueNodeId,
  getUpsertDetails,
  initNode,
  rearrangeToolsOrdering,
  updateOutdatedNodeData,
  updateOutdatedNodeEdge
} from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'
import { usePrompt } from '@/utils/usePrompt'

// const
import { FLOWISE_CREDENTIAL_ID } from '@/store/constant'

const nodeTypes = { customNode: CanvasNode, stickyNote: StickyNote }
const edgeTypes = { buttonedge: ButtonEdge }

// ==============================|| CANVAS ||============================== //

const Canvas = () => {
  const theme = useTheme()
  const { state, pathname } = useLocation()
  const user = useSelector((state) => state.user)
  const navigate = useNavigate()

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
  const [isAdminPage, setIsAdminPage] = useState(
    pathname === '/canvas' || pathname === '/agentcanvas' ? true : user?.role === 'ADMIN' ? true : false
  )
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

  // TODO: hide nodes
  const nodesData = useMemo(() => {
    return filter(getNodesApi.data, (node) => {
      if (node.tags?.includes('LlamaIndex')) {
        return false
      }

      if (['LLMs'].includes(node.category)) {
        return false
      }

      if (node.category === 'Chat Models') {
        return ['AWSChatBedrock', 'ChatOpenAI', 'ChatOpenAI-Custom'].includes(node.type)
      }

      if (node.category === 'Embeddings') {
        return ['AWSBedrockEmbeddings'].includes(node.type)
      }

      return true
    })
  }, [getNodesApi.data])

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

  // ==============================|| useEffect ||============================== //

  // Get specific chatflow successful
  useEffect(() => {
    if (getSpecificChatflowApi?.data) {
      const chatflow = getSpecificChatflowApi.data
      if (user?.role !== 'ADMIN' && chatflow?.userId === user?.id) {
        setIsAdminPage(true)
      }
      if (!chatflow?.isPublic && user?.role !== 'ADMIN' && chatflow?.userId !== user?.id) {
        return navigate(isAgentCanvas ? '/agentflows' : '/')
      }

      const initialFlow = chatflow?.flowData ? JSON.parse(chatflow.flowData) : []
      setNodes(initialFlow.nodes || [])
      setEdges(initialFlow.edges || [])
      dispatch({ type: SET_CHATFLOW, chatflow })
    } else if (getSpecificChatflowApi?.error) {
      errorFailed(`Failed to retrieve ${canvasTitle}: ${getSpecificChatflowApi.error.response.data.message}`)
      return navigate(isAgentCanvas ? '/agentflows' : '/')
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

  usePrompt('You have unsaved changes! Do you want to navigate away?', canvasDataStore.isDirty)

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
          </Toolbar>
        </AppBar>
        <Box sx={{ pt: '67px', height: '100vh', width: '100%' }}>
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
                deleteKeyCode={canvas.canvasDialogShow ? null : ['Delete']}
                minZoom={0.1}
                className='chatflow-canvas'
                defaultEdgeOptions={{
                  style: { strokeWidth: 2, stroke: '#D0D5DD' }
                }}
                {...(!isAdminPage && {
                  nodesDraggable: false,
                  nodesConnectable: false,
                  edgesUpdatable: false,
                  panOnScroll: false,
                  zoomOnScroll: false
                })}
              >
                {isAdminPage && (
                  <Controls
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <ControlButton
                      onClick={async () => {
                        const elk = new ELK()
                        const nodes = reactFlowInstance.getNodes()
                        const edges = reactFlowInstance.getEdges()
                        const elkGraph = {
                          id: 'root',
                          layoutOptions: {
                            'elk.algorithm': 'layered',
                            'elk.layered.spacing.nodeNodeBetweenLayers': '128',
                            'elk.spacing.nodeNode': '64',
                            'org.eclipse.elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX'
                          },
                          children: nodes.map((node) => ({
                            id: node.id,
                            width: node.width,
                            height: node.height,
                            targetPosition: 'left',
                            sourcePosition: 'right',
                            labels: [{ text: node.id }]
                          })),
                          edges: edges.map((edge) => ({
                            id: edge.id,
                            sources: [edge.source],
                            targets: [edge.target]
                          }))
                        }

                        const layout = await elk.layout(elkGraph)

                        // Find the smallest y-coordinate among all nodes
                        let minY = Infinity
                        layout.children?.forEach((child) => {
                          if (child.y < minY) {
                            minY = child.y
                          }
                        })

                        // Group nodes by x-coordinate
                        const nodesByX = {}
                        layout.children?.forEach((child) => {
                          const xCoord = Math.round(child.x) // Round to handle floating point imprecision
                          if (!nodesByX[xCoord]) {
                            nodesByX[xCoord] = []
                          }
                          nodesByX[xCoord].push(child)
                        })

                        // Position nodes, handling overlaps
                        Object.values(nodesByX).forEach((nodesAtX) => {
                          let currentY = minY
                          nodesAtX.forEach((child) => {
                            const index = nodes.findIndex((e) => e.id === child.id)
                            if (index > -1) {
                              nodes[index].position = {
                                x: child.x,
                                y: currentY
                              }
                              // Update currentY for next node, adding a small gap of 20px between nodes
                              currentY += child.height + 64
                            }
                          })
                        })

                        reactFlowInstance.setNodes(nodes)
                      }}
                    >
                      <IconArrowsShuffle size={14} />
                    </ControlButton>
                  </Controls>
                )}
                <Background
                  color='#aaa'
                  gap={24}
                  style={
                    {
                      // background: isDark ? '#1B2531' : '#F0F2F7'
                    }
                  }
                />
                {isAdminPage && <AddNodes isAgentCanvas={isAgentCanvas} nodesData={nodesData} node={selectedNode} />}
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
            </div>
          </div>
        </Box>
        <ConfirmDialog />
      </Box>
    </>
  )
}

export default Canvas
