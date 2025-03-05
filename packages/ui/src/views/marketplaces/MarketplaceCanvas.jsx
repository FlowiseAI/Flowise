'use client'
import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import ReactFlow, { Controls, Background, useNodesState, useEdgesState } from 'reactflow'
import 'reactflow/dist/style.css'
import '@/views/canvas/index.css'

import { useNavigate } from '@/utils/navigation'

// material-ui
import { Box } from '@mui/material'

// project imports
import MarketplaceCanvasNode from './MarketplaceCanvasNode'
import StickyNote from '../canvas/StickyNote'

const nodeTypes = { customNode: MarketplaceCanvasNode, stickyNote: StickyNote }
const edgeTypes = { buttonedge: '' }

const MarketplaceCanvas = ({ template }) => {
    const navigate = useNavigate()

    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])

    const reactFlowWrapper = useRef(null)

    useEffect(() => {
        if (template && template.flowData) {
            let flowData
            try {
                flowData = typeof template.flowData === 'string' ? JSON.parse(template.flowData) : template.flowData
            } catch (error) {
                console.error('Error parsing flowData:', error)
                return
            }
            setNodes(flowData.nodes || [])
            setEdges(flowData.edges || [])
        }
    }, [template])

    const onChatflowCopy = () => {
        if (!template) return

        const isAgentCanvas = (template.flowData?.nodes || []).some(
            (node) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
        )
        navigate(`/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`, {
            state: {
                templateFlowData: typeof template.flowData === 'string' ? template.flowData : JSON.stringify(template.flowData),
                templateData: JSON.stringify(template),
                templateName: template.name,
                parentChatflowId: template.id && template.id.startsWith('cf_') ? undefined : template.id
            }
        })
    }

    return (
        <Box sx={{ height: '100%', width: '100%' }}>
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
                maxZoom={1.5}
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
        </Box>
    )
}

MarketplaceCanvas.propTypes = {
    template: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        flowData: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
    }).isRequired
}

export default MarketplaceCanvas
