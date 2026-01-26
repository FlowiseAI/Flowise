import React, { useEffect, useRef, useState, useCallback, useContext } from 'react'
import ReactFlow, { addEdge, Controls, MiniMap, Background, Panel, useNodesState, useEdgesState, ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'
import { useDispatch, useSelector } from 'react-redux'
import { omit, cloneDeep } from 'lodash'
import { useReward } from 'react-rewards'

// Material UI
import { Box, Button, Fab } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// Import components from local package
import AgentFlowNode from './components/AgentFlowNode'
import IterationNode from './components/IterationNode'
import AgentFlowEdge from './components/AgentFlowEdge'
import ConnectionLine from './components/ConnectionLine'
import StickyNote from './components/StickyNote'
import EditNodeDialog from './components/EditNodeDialog'
import AddNodes from './components/AddNodes'

// Icons
import { IconX, IconRefreshAlert, IconMagnetFilled, IconMagnetOff, IconArtboard, IconArtboardOff } from '@tabler/icons-react'

// Utils and constants
import {
    getUniqueNodeLabel,
    getUniqueNodeId,
    initNode,
    isValidConnectionAgentflowV2,
    updateOutdatedNodeData,
    updateOutdatedNodeEdge
} from './utils/helpers'
import { FLOWISE_CREDENTIAL_ID, AGENTFLOW_ICONS } from './constants/agentflow'
import { AgentflowProps } from './types'
import { AgentflowAPI } from './api'
import { useAgentflowContext, flowContext } from './AgentflowProvider'
import { SET_DIRTY, REMOVE_DIRTY, SET_CHATFLOW, RootState } from './store'

const nodeTypes = { agentFlow: AgentFlowNode, stickyNote: StickyNote, iteration: IterationNode }
const edgeTypes = { agentFlow: AgentFlowEdge }

const AgentflowInner: React.FC<Omit<AgentflowProps, 'instanceUrl' | 'token'> & { api: AgentflowAPI }> = ({
    flow: initialFlow,
    components: componentNames,
    onFlowChange,
    onSave,
    api
}) => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const customization = useSelector((state: RootState) => state.customization)
    const canvas = useSelector((state: RootState) => state.canvas)

    const { setFlow, setAvailableComponents } = useAgentflowContext()
    const { reactFlowInstance, setReactFlowInstance } = useContext(flowContext)

    const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow?.flowData?.nodes || [])
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow?.flowData?.edges || [])
    const [selectedNode, setSelectedNode] = useState<any>(null)
    const [editNodeDialogOpen, setEditNodeDialogOpen] = useState(false)
    const [editNodeDialogProps, setEditNodeDialogProps] = useState<any>({})
    const [isSyncNodesButtonEnabled, setIsSyncNodesButtonEnabled] = useState(false)
    const [isSnappingEnabled, setIsSnappingEnabled] = useState(false)
    const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(true)

    const reactFlowWrapper = useRef<HTMLDivElement>(null)

    // Normalize node types from loaded flows
    const normalizeNodeType = (node: any) => {
        // Map various node types to our supported types
        const nodeType = node.type || node.data?.type

        if (nodeType === 'Iteration' || node.data?.name === 'iterationAgentflow') {
            return 'iteration'
        } else if (nodeType === 'StickyNote' || node.data?.name === 'stickyNoteAgentflow') {
            return 'stickyNote'
        } else {
            // Default to agentFlow for all other nodes (including 'customNode')
            return 'agentFlow'
        }
    }

    // Confetti animation
    const { reward: confettiReward } = useReward('canvasConfetti', 'confetti', {
        elementCount: 150,
        spread: 80,
        lifetime: 300,
        startVelocity: 40,
        zIndex: 10000,
        decay: 0.92,
        position: 'fixed'
    })

    // Load initial flow
    useEffect(() => {
        if (initialFlow?.flowData) {
            // Normalize node types to ensure compatibility
            const normalizedNodes = (initialFlow.flowData.nodes || []).map((node: any) => ({
                ...node,
                type: normalizeNodeType(node)
            }))

            setNodes(normalizedNodes)
            setEdges(initialFlow.flowData.edges || [])
            setFlow({
                nodes: normalizedNodes,
                edges: initialFlow.flowData.edges || [],
                viewport: initialFlow.flowData.viewport
            })
            dispatch(SET_CHATFLOW({ chatflow: initialFlow }))
        }
    }, [initialFlow, setNodes, setEdges, setFlow, dispatch])

    // Fetch available components
    useEffect(() => {
        const fetchComponents = async () => {
            try {
                const components = await api.getComponents(componentNames)
                setAvailableComponents(components)
            } catch (error) {
                console.error('Failed to fetch components:', error)
            }
        }
        fetchComponents()
    }, [componentNames, api, setAvailableComponents])

    // Update flow context when nodes/edges change
    useEffect(() => {
        setFlow({
            nodes,
            edges,
            viewport: reactFlowInstance?.getViewport()
        })

        if (onFlowChange) {
            onFlowChange({
                nodes,
                edges,
                viewport: reactFlowInstance?.getViewport()
            })
        }
    }, [nodes, edges, reactFlowInstance, setFlow, onFlowChange])

    const onConnect = useCallback(
        (params: any) => {
            if (!isValidConnectionAgentflowV2(params, reactFlowInstance)) {
                return
            }

            const nodeName = params.sourceHandle.split('_')[0]
            const targetNodeName = params.targetHandle.split('_')[0]

            const targetColor = AGENTFLOW_ICONS.find((icon) => icon.name === targetNodeName)?.color ?? theme.palette.primary.main
            const sourceColor = AGENTFLOW_ICONS.find((icon) => icon.name === nodeName)?.color ?? theme.palette.primary.main

            let edgeLabel = undefined
            if (nodeName === 'conditionAgentflow' || nodeName === 'conditionAgentAgentflow') {
                const _edgeLabel = params.sourceHandle.split('-').pop()
                edgeLabel = (isNaN(_edgeLabel) ? 0 : _edgeLabel).toString()
            }

            if (nodeName === 'humanInputAgentflow') {
                edgeLabel = params.sourceHandle.split('-').pop()
                edgeLabel = edgeLabel === '0' ? 'proceed' : 'reject'
            }

            const sourceNode = reactFlowInstance.getNodes().find((node: any) => node.id === params.source)
            const targetNode = reactFlowInstance.getNodes().find((node: any) => node.id === params.target)
            const isWithinIterationNode =
                sourceNode?.parentNode && targetNode?.parentNode && sourceNode.parentNode === targetNode.parentNode

            const newEdge = {
                ...params,
                data: {
                    ...params.data,
                    sourceColor,
                    targetColor,
                    edgeLabel,
                    isHumanInput: nodeName === 'humanInputAgentflow'
                },
                ...(isWithinIterationNode && { zIndex: 9999 }),
                type: 'agentFlow',
                id: `${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}`
            }
            setEdges((eds) => addEdge(newEdge, eds))
            dispatch(SET_DIRTY())
        },
        [reactFlowInstance, setEdges, dispatch, theme]
    )

    const onNodeClick = useCallback(
        (event: any, clickedNode: any) => {
            setSelectedNode(clickedNode)
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === clickedNode.id) {
                        node.data = { ...node.data, selected: true }
                    } else {
                        node.data = { ...node.data, selected: false }
                    }
                    return node
                })
            )
        },
        [setNodes]
    )

    const onNodeDoubleClick = useCallback((event: any, node: any) => {
        if (!node || !node.data) return
        if (node.data.name === 'stickyNoteAgentflow') {
            // Don't show dialog
        } else {
            const dialogProps = {
                data: node.data,
                inputParams: node.data.inputParams?.filter((inputParam: any) => !inputParam.hidden) || []
            }
            setEditNodeDialogProps(dialogProps)
            setEditNodeDialogOpen(true)
        }
    }, [])

    const onDragOver = useCallback((event: any) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback(
        (event: any) => {
            event.preventDefault()
            if (!reactFlowWrapper.current || !reactFlowInstance) return

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
            let nodeData = event.dataTransfer.getData('application/reactflow')

            if (typeof nodeData === 'undefined' || !nodeData) return

            nodeData = JSON.parse(nodeData)

            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left - 100,
                y: event.clientY - reactFlowBounds.top - 50
            })
            const allNodes = reactFlowInstance.getNodes()

            if (nodeData.name === 'startAgentflow' && allNodes.find((node: any) => node.data.name === 'startAgentflow')) {
                console.warn('Only one start node is allowed')
                return
            }

            const newNodeId = getUniqueNodeId(nodeData, allNodes)
            const newNodeLabel = getUniqueNodeLabel(nodeData, allNodes)

            const newNode: any = {
                id: newNodeId,
                position,
                data: { ...initNode(nodeData, newNodeId, true), label: newNodeLabel }
            }

            if (nodeData.type === 'Iteration') {
                newNode.type = 'iteration'
            } else if (nodeData.type === 'StickyNote') {
                newNode.type = 'stickyNote'
            } else {
                newNode.type = 'agentFlow'
            }

            // Check for iteration parent
            const iterationNodes = allNodes.filter((node: any) => node.type === 'iteration')
            let parentNode = null

            for (const iterationNode of iterationNodes) {
                const nodeWidth = iterationNode.width || 300
                const nodeHeight = iterationNode.height || 250
                const nodeLeft = iterationNode.position.x
                const nodeRight = nodeLeft + nodeWidth
                const nodeTop = iterationNode.position.y
                const nodeBottom = nodeTop + nodeHeight

                if (position.x >= nodeLeft && position.x <= nodeRight && position.y >= nodeTop && position.y <= nodeBottom) {
                    parentNode = iterationNode

                    if (nodeData.name === 'iterationAgentflow') {
                        console.warn('Nested iteration not supported')
                        return
                    }

                    if (nodeData.name === 'humanInputAgentflow') {
                        console.warn('Human input not supported inside iteration')
                        return
                    }
                    break
                }
            }

            if (parentNode) {
                newNode.parentNode = parentNode.id
                newNode.extent = 'parent'
                newNode.position = {
                    x: position.x - parentNode.position.x,
                    y: position.y - parentNode.position.y
                }
            }

            setSelectedNode(newNode)
            setNodes((nds) => {
                return (nds ?? []).concat(newNode).map((node) => {
                    node.data = { ...node.data, selected: node.id === newNode.id }
                    return node
                })
            })
            dispatch(SET_DIRTY())
        },
        [reactFlowInstance, setNodes, dispatch]
    )

    const syncNodes = useCallback(() => {
        const componentNodes = canvas.componentNodes
        const cloneNodes = cloneDeep(nodes)
        const cloneEdges = cloneDeep(edges)
        let toBeRemovedEdges: any[] = []

        for (let i = 0; i < cloneNodes.length; i++) {
            const node = cloneNodes[i]
            const componentNode = componentNodes.find((cn: any) => cn.name === node.data.name)
            if (componentNode && componentNode.version > node.data.version) {
                const clonedComponentNode = cloneDeep(componentNode)
                cloneNodes[i].data = updateOutdatedNodeData(clonedComponentNode, node.data, true)
                toBeRemovedEdges.push(...updateOutdatedNodeEdge(cloneNodes[i].data, cloneEdges))
            }
        }

        setNodes(cloneNodes)
        setEdges(cloneEdges.filter((edge) => !toBeRemovedEdges.includes(edge)))
        dispatch(SET_DIRTY())
        setIsSyncNodesButtonEnabled(false)
    }, [canvas.componentNodes, nodes, edges, setNodes, setEdges, dispatch])

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <span
                id='canvasConfetti'
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '0',
                    height: '0',
                    zIndex: 9999,
                    pointerEvents: 'none'
                }}
            />

            <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onNodeClick={onNodeClick}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onEdgesChange={onEdgesChange}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeDragStop={() => dispatch(SET_DIRTY())}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    fitView
                    deleteKeyCode={['Delete']}
                    minZoom={0.5}
                    snapGrid={[25, 25]}
                    snapToGrid={isSnappingEnabled}
                    connectionLineComponent={ConnectionLine}
                >
                    <Panel position='top-left'>
                        <AddNodes
                            isAgentCanvas={true}
                            isAgentflowv2={true}
                            nodesData={canvas.componentNodes || []}
                            node={selectedNode}
                            onFlowGenerated={confettiReward}
                        />
                    </Panel>
                    <Controls
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            left: '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <button
                            className='react-flow__controls-button react-flow__controls-interactive'
                            onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
                            title='toggle snapping'
                        >
                            {isSnappingEnabled ? <IconMagnetFilled /> : <IconMagnetOff />}
                        </button>
                        <button
                            className='react-flow__controls-button react-flow__controls-interactive'
                            onClick={() => setIsBackgroundEnabled(!isBackgroundEnabled)}
                            title='toggle background'
                        >
                            {isBackgroundEnabled ? <IconArtboard /> : <IconArtboardOff />}
                        </button>
                    </Controls>
                    <MiniMap
                        nodeStrokeWidth={3}
                        nodeColor={customization.isDarkMode ? '#2d2d2d' : '#e2e2e2'}
                        nodeStrokeColor={customization.isDarkMode ? '#525252' : '#fff'}
                        maskColor={customization.isDarkMode ? 'rgb(45, 45, 45, 0.6)' : 'rgb(240, 240, 240, 0.6)'}
                        style={{
                            backgroundColor: customization.isDarkMode ? theme.palette.background.default : '#fff'
                        }}
                    />
                    {isBackgroundEnabled && <Background color='#aaa' gap={16} />}
                    <EditNodeDialog
                        show={editNodeDialogOpen}
                        dialogProps={editNodeDialogProps}
                        onCancel={() => setEditNodeDialogOpen(false)}
                    />
                    {isSyncNodesButtonEnabled && (
                        <Fab
                            sx={{
                                position: 'absolute',
                                left: 60,
                                top: 20,
                                color: 'white',
                                background: 'orange',
                                '&:hover': {
                                    background: 'orange',
                                    backgroundImage: `linear-gradient(rgb(0 0 0/10%) 0 0)`
                                }
                            }}
                            size='small'
                            title='Sync Nodes'
                            onClick={syncNodes}
                        >
                            <IconRefreshAlert />
                        </Fab>
                    )}
                </ReactFlow>
            </div>
        </div>
    )
}

export const Agentflow: React.FC<AgentflowProps> = ({ instanceUrl, token, flow, components, onFlowChange, onSave, isDarkMode }) => {
    const [api] = useState(() => new AgentflowAPI(instanceUrl, token))

    return (
        <ReactFlowProvider>
            <AgentflowInner flow={flow} components={components} onFlowChange={onFlowChange} onSave={onSave} api={api} />
        </ReactFlowProvider>
    )
}
