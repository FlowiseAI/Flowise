import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import ReactFlow, { Background, BackgroundVariant, Controls, MiniMap, ReactFlowProvider, useEdgesState, useNodesState } from 'reactflow'

import { IconSparkles } from '@tabler/icons-react'

import type { AgentFlowInstance, AgentflowProps, FlowData, FlowEdge, FlowNode } from './core/types'
import {
    AgentflowHeader,
    ConnectionLine,
    createHeaderProps,
    edgeTypes,
    nodeTypes,
    useDragAndDrop,
    useFlowHandlers,
    useFlowNodes
} from './features/canvas'
import { GenerateFlowDialog } from './features/generator'
import { AddNodesDrawer, StyledFab } from './features/node-palette'
import { useAgentflowContext } from './infrastructure/store'
import { AgentflowProvider } from './AgentflowProvider'
import { useAgentflow } from './useAgentflow'

import 'reactflow/dist/style.css'
import './features/canvas/canvas.css'

/**
 * Internal canvas component that uses the contexts
 */
function AgentflowCanvas({
    initialFlow,
    readOnly,
    onFlowChange,
    onSave,
    onFlowGenerated,
    showDefaultHeader = true,
    enableGenerator = true,
    renderHeader,
    renderNodePalette
}: {
    initialFlow?: FlowData
    readOnly?: boolean
    onFlowChange?: (flow: FlowData) => void
    onSave?: (flow: FlowData) => void
    onFlowGenerated?: (flow: FlowData) => void
    showDefaultHeader?: boolean
    showDefaultPalette?: boolean
    enableGenerator?: boolean
    renderHeader?: AgentflowProps['renderHeader']
    renderNodePalette?: AgentflowProps['renderNodePalette']
}) {
    const { state, setNodes, setEdges, setDirty, setReactFlowInstance } = useAgentflowContext()
    const agentflow = useAgentflow()
    const reactFlowWrapper = useRef<HTMLDivElement>(null)

    const [nodes, setLocalNodes, onNodesChange] = useNodesState(initialFlow?.nodes || [])
    const [edges, setLocalEdges, onEdgesChange] = useEdgesState(initialFlow?.edges || [])
    const [showGenerateDialog, setShowGenerateDialog] = useState(false)

    // Load available nodes
    const { availableNodes } = useFlowNodes()

    // Sync local state with context
    useEffect(() => {
        setNodes(nodes as FlowNode[])
    }, [nodes, setNodes])

    useEffect(() => {
        setEdges(edges as FlowEdge[])
    }, [edges, setEdges])

    // Flow handlers
    const { handleConnect, handleNodesChange, handleEdgesChange, handleAddNode } = useFlowHandlers({
        nodes: nodes as FlowNode[],
        edges: edges as FlowEdge[],
        setLocalNodes: setLocalNodes as React.Dispatch<React.SetStateAction<FlowNode[]>>,
        setLocalEdges: setLocalEdges as React.Dispatch<React.SetStateAction<FlowEdge[]>>,
        onNodesChange,
        onEdgesChange,
        onFlowChange,
        availableNodes
    })

    // Drag and drop handlers
    const { handleDragOver, handleDrop } = useDragAndDrop({
        nodes: nodes as FlowNode[],
        setLocalNodes: setLocalNodes as React.Dispatch<React.SetStateAction<FlowNode[]>>,
        reactFlowWrapper: reactFlowWrapper as React.RefObject<HTMLDivElement>
    })

    // Handle generated flow from dialog
    const handleFlowGenerated = useCallback(
        (generatedNodes: FlowData['nodes'], generatedEdges: FlowData['edges']) => {
            setLocalNodes(generatedNodes)
            setLocalEdges(generatedEdges)
            setDirty(true)

            if (onFlowGenerated) {
                onFlowGenerated({
                    nodes: generatedNodes,
                    edges: generatedEdges,
                    viewport: { x: 0, y: 0, zoom: 1 }
                })
            }
        },
        [setLocalNodes, setLocalEdges, setDirty, onFlowGenerated]
    )

    // Handle save
    const handleSave = useCallback(() => {
        if (onSave) {
            onSave(agentflow.getFlow())
        }
    }, [onSave, agentflow])

    // Header props
    const headerProps = createHeaderProps(
        state.chatflow?.name || 'Untitled',
        state.isDirty,
        handleSave,
        agentflow.toJSON,
        agentflow.validate
    )

    // Palette props
    const paletteProps = {
        availableNodes,
        onAddNode: handleAddNode
    }

    return (
        <div className='agentflow-container'>
            {/* Header */}
            {renderHeader ? renderHeader(headerProps) : showDefaultHeader ? <AgentflowHeader {...headerProps} readOnly={readOnly} /> : null}

            <div className='agentflow-main'>
                {/* Node Palette - only render if custom renderNodePalette is provided */}
                {renderNodePalette && renderNodePalette(paletteProps)}

                {/* Canvas */}
                <div className='agentflow-canvas' ref={reactFlowWrapper} onDragOver={handleDragOver} onDrop={handleDrop}>
                    {/* Add Nodes Drawer - floating button */}
                    {!readOnly && <AddNodesDrawer nodes={availableNodes} onNodeClick={(node) => handleAddNode(node.name)} />}

                    {/* Generate Flow Button */}
                    {!readOnly && enableGenerator && (
                        <StyledFab
                            gradient
                            size='small'
                            aria-label='generate'
                            title='Generate Agentflow'
                            onClick={() => setShowGenerateDialog(true)}
                            sx={{
                                position: 'absolute',
                                left: 70,
                                top: 20,
                                zIndex: 1000
                            }}
                        >
                            <IconSparkles />
                        </StyledFab>
                    )}

                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={handleNodesChange}
                        onEdgesChange={handleEdgesChange}
                        onConnect={handleConnect}
                        onInit={setReactFlowInstance}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        connectionLineComponent={ConnectionLine}
                        fitView
                        nodesDraggable={!readOnly}
                        nodesConnectable={!readOnly}
                        elementsSelectable={!readOnly}
                    >
                        <Controls />
                        <MiniMap />
                        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                    </ReactFlow>
                </div>
            </div>

            {/* Generate Flow Dialog */}
            <GenerateFlowDialog open={showGenerateDialog} onClose={() => setShowGenerateDialog(false)} onGenerated={handleFlowGenerated} />
        </div>
    )
}

/**
 * Main Agentflow component.
 * Renders an embeddable agentflow canvas with optional header and node palette.
 *
 * @example
 * ```tsx
 * import { Agentflow } from '@flowise/agentflow'
 * import '@flowise/agentflow/flowise.css'
 *
 * function App() {
 *   return (
 *     <Agentflow
 *       instanceUrl="https://flowise-url.com"
 *       token="your-auth-token"
 *       components={['agentAgentflow', 'llmAgentflow']}
 *     />
 *   )
 * }
 * ```
 */
export const Agentflow = forwardRef<AgentFlowInstance, AgentflowProps>(function Agentflow(props, ref) {
    const {
        instanceUrl,
        token,
        flow,
        components,
        onFlowChange,
        onSave,
        onFlowGenerated,
        theme = 'system',
        readOnly = false,
        enableGenerator = true,
        renderHeader,
        renderNodePalette,
        showDefaultHeader = true,
        showDefaultPalette = true
    } = props

    return (
        <AgentflowProvider
            instanceUrl={instanceUrl}
            token={token}
            theme={theme}
            components={components}
            readOnly={readOnly}
            initialFlow={flow}
        >
            <ReactFlowProvider>
                <AgentflowCanvasWithRef
                    ref={ref}
                    initialFlow={flow}
                    readOnly={readOnly}
                    onFlowChange={onFlowChange}
                    onSave={onSave}
                    onFlowGenerated={onFlowGenerated}
                    enableGenerator={enableGenerator}
                    showDefaultHeader={showDefaultHeader}
                    showDefaultPalette={showDefaultPalette}
                    renderHeader={renderHeader}
                    renderNodePalette={renderNodePalette}
                />
            </ReactFlowProvider>
        </AgentflowProvider>
    )
})

/**
 * Canvas component with ref forwarding
 */
const AgentflowCanvasWithRef = forwardRef<
    AgentFlowInstance,
    {
        initialFlow?: FlowData
        readOnly?: boolean
        onFlowChange?: (flow: FlowData) => void
        onSave?: (flow: FlowData) => void
        onFlowGenerated?: (flow: FlowData) => void
        showDefaultHeader?: boolean
        showDefaultPalette?: boolean
        enableGenerator?: boolean
        renderHeader?: AgentflowProps['renderHeader']
        renderNodePalette?: AgentflowProps['renderNodePalette']
    }
>(function AgentflowCanvasWithRef(props, ref) {
    const agentflow = useAgentflow()

    // Expose imperative methods via ref
    useImperativeHandle(ref, () => agentflow, [agentflow])

    return <AgentflowCanvas {...props} />
})

export default Agentflow
