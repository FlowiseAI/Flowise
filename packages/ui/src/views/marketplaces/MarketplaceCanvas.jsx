import { useEffect, useRef } from 'react'
import ReactFlow, { Controls, Background, useNodesState, useEdgesState } from 'reactflow'
import 'reactflow/dist/style.css'
import '@/views/canvas/index.css'

import { useLocation, useNavigate } from '@/utils/navigation'

// material-ui
import { Toolbar, Box, AppBar } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MarketplaceCanvasNode from './MarketplaceCanvasNode'
import MarketplaceCanvasHeader from './MarketplaceCanvasHeader'
import StickyNote from '../canvas/StickyNote'

// credential checking
import { useCredentialChecker } from '@/hooks/useCredentialChecker'
import UnifiedCredentialsModal from '@/ui-component/dialog/UnifiedCredentialsModal'

const nodeTypes = { customNode: MarketplaceCanvasNode, stickyNote: StickyNote }
const edgeTypes = { buttonedge: '' }

// ==============================|| CANVAS ||============================== //

const MarketplaceCanvas = () => {
    const theme = useTheme()
    const navigate = useNavigate()

    const { state } = useLocation()
    const { flowData, name } = state

    // ==============================|| ReactFlow ||============================== //

    const [nodes, setNodes, onNodesChange] = useNodesState()
    const [edges, setEdges, onEdgesChange] = useEdgesState()

    const reactFlowWrapper = useRef(null)

    // Credential checking hook
    const { showCredentialModal, missingCredentials, checkCredentials, handleAssign, handleSkip, handleCancel } = useCredentialChecker()

    // ==============================|| useEffect ||============================== //

    useEffect(() => {
        if (flowData) {
            const initialFlow = JSON.parse(flowData)
            setNodes(initialFlow.nodes || [])
            setEdges(initialFlow.edges || [])
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flowData])

    const onChatflowCopy = (stateData) => {
        // stateData is now the complete state with all template information
        const flowDataParsed = stateData.flowData ? JSON.parse(stateData.flowData) : {}
        
        const isAgentCanvas = (flowDataParsed?.nodes || []).some(
            (node) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
        )

        // Use the complete state data which includes all template information
        const chatflowData = {
            ...stateData,
            name: name || 'Copied Template',
            nodes: flowDataParsed.nodes || [],
            edges: flowDataParsed.edges || [],
            parentChatflowId: stateData?.parentChatflowId
        }

        localStorage.setItem('duplicatedFlowData', JSON.stringify(chatflowData))

        const targetPath = `/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`
        navigate(targetPath)
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
                            flowData={flowData ? JSON.parse(flowData) : null}
                            onChatflowCopy={(flowData) => {
                                // Pass the complete state instead of just flowData
                                onChatflowCopy(state)
                            }}
                        />
                    </Toolbar>
                </AppBar>
                <Box sx={{ pt: '70px', height: '100vh', width: '100%' }}>
                    <div className='reactflow-parent-wrapper'>
                        <div className='reactflow-wrapper' ref={reactFlowWrapper}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                nodesDraggable={false}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                fitView
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
                            </ReactFlow>
                        </div>
                    </div>
                </Box>
            </Box>

            {/* Unified Credentials Modal */}
            <UnifiedCredentialsModal
                show={showCredentialModal}
                missingCredentials={missingCredentials}
                onAssign={handleAssign}
                onSkip={handleSkip}
                onCancel={handleCancel}
                flowData={flowData ? JSON.parse(flowData) : null}
            />
        </>
    )
}

export default MarketplaceCanvas
