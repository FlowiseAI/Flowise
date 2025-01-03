import { useContext, useEffect, useRef } from 'react'
import ReactFlow, { Background, useNodesState, useEdgesState } from 'reactflow'
import 'reactflow/dist/style.css'
import '@/views/canvas/index.css'

import { useLocation, useNavigate } from 'react-router-dom'

// material-ui
import { Toolbar, Box, AppBar, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import { flowContext } from '@/store/context/ReactFlowContext'
import MarketplaceCanvasNode from './MarketplaceCanvasNode'
import MarketplaceCanvasHeader from './MarketplaceCanvasHeader'
import StickyNote from '../canvas/StickyNote'

// icons
import { IconPlus, IconMinus, IconMaximize } from '@tabler/icons-react'

const nodeTypes = { customNode: MarketplaceCanvasNode, stickyNote: StickyNote }
const edgeTypes = { buttonedge: '' }

// ==============================|| CANVAS ||============================== //

const MarketplaceCanvas = () => {
    const theme = useTheme()
    const navigate = useNavigate()

    const { state } = useLocation()
    const { flowData, name } = state

    // ==============================|| ReactFlow ||============================== //

    const { reactFlowInstance, setReactFlowInstance } = useContext(flowContext)
    const [nodes, setNodes, onNodesChange] = useNodesState()
    const [edges, setEdges, onEdgesChange] = useEdgesState()

    const reactFlowWrapper = useRef(null)

    // ==============================|| useEffect ||============================== //

    useEffect(() => {
        if (flowData) {
            const initialFlow = JSON.parse(flowData)
            setNodes(initialFlow.nodes || [])
            setEdges(initialFlow.edges || [])
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flowData])

    const onChatflowCopy = (flowData) => {
        const isAgentCanvas = (flowData?.nodes || []).some(
            (node) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
        )
        const templateFlowData = JSON.stringify(flowData)
        navigate(`/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`, { state: { templateFlowData } })
    }

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
                        <MarketplaceCanvasHeader
                            flowName={name}
                            flowData={JSON.parse(flowData)}
                            onChatflowCopy={(flowData) => onChatflowCopy(flowData)}
                        />
                    </Toolbar>
                </AppBar>
                <Box sx={{ pt: '70px', height: '100vh', width: '100%' }}>
                    <div className='reactflow-parent-wrapper'>
                        <div className='reactflow-wrapper' ref={reactFlowWrapper}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: 2.5,
                                    gap: 2,
                                    position: 'absolute',
                                    bottom: 0,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 10
                                }}
                            >
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
                                </Box>
                            </Box>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                onInit={setReactFlowInstance}
                                fitView
                                minZoom={0.1}
                                nodesDraggable={false}
                                nodesConnectable={false}
                                elementsSelectable={false}
                                className='marketplace-canvas'
                            >
                                <Background color='#aaa' gap={16} />
                            </ReactFlow>
                        </div>
                    </div>
                </Box>
            </Box>
        </>
    )
}

export default MarketplaceCanvas
