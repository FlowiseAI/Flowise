import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider, useEdgesState, useNodesState } from 'reactflow'

import { Alert, Snackbar } from '@mui/material'
import { IconSparkles } from '@tabler/icons-react'

import { tokens } from './core/theme'
import type { AgentFlowInstance, AgentflowProps, FlowData, FlowDataCallback, FlowEdge, FlowNode } from './core/types'
import { initNode, resolveNodeType } from './core/utils'
import { applyValidationErrorsToNodes, validateFlow } from './core/validation'
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
import { ValidationFeedback } from './features/canvas/components'
import { GenerateFlowDialog } from './features/generator'
import { EditNodeDialog } from './features/node-editor'
import { AddNodesDrawer, StyledFab } from './features/node-palette'
import { useAgentflowContext, useConfigContext } from './infrastructure/store'
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
    showDefaultPalette = true,
    canvasActions,
    renderHeader,
    renderNodePalette
}: {
    initialFlow?: FlowData
    readOnly?: boolean
    onFlowChange?: FlowDataCallback
    onSave?: FlowDataCallback
    onFlowGenerated?: FlowDataCallback
    showDefaultHeader?: boolean
    showDefaultPalette?: boolean
    enableGenerator?: boolean
    canvasActions?: AgentflowProps['canvasActions']
    renderHeader?: AgentflowProps['renderHeader']
    renderNodePalette?: AgentflowProps['renderNodePalette']
}) {
    const {
        state,
        syncNodesFromReactFlow,
        syncEdgesFromReactFlow,
        setDirty,
        setReactFlowInstance,
        closeEditDialog,
        registerLocalStateSetters,
        registerOnFlowChange
    } = useAgentflowContext()
    const { isDarkMode } = useConfigContext()
    const agentflow = useAgentflow()
    const reactFlowWrapper = useRef<HTMLDivElement>(null)

    // Memoize ReactFlow colors from theme tokens
    const reactFlowColors = useMemo(() => {
        const mode = isDarkMode ? 'dark' : 'light'
        return {
            minimapNode: tokens.colors.reactflow.minimap.node[mode],
            minimapNodeStroke: tokens.colors.reactflow.minimap.nodeStroke[mode],
            minimapBackground: tokens.colors.reactflow.minimap.background[mode],
            minimapMask: tokens.colors.reactflow.minimap.mask[mode],
            backgroundDots: tokens.colors.reactflow.background.dots[mode]
        }
    }, [isDarkMode])

    const safeInitialNodes = Array.isArray(initialFlow?.nodes) ? initialFlow.nodes : []
    const safeInitialEdges = Array.isArray(initialFlow?.edges) ? initialFlow.edges : []
    const [nodes, setLocalNodes, onNodesChange] = useNodesState(safeInitialNodes)
    const [edges, setLocalEdges, onEdgesChange] = useEdgesState(safeInitialEdges)
    const [showGenerateDialog, setShowGenerateDialog] = useState(false)

    // Constraint violation snackbar state
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

    const handleConstraintViolation = useCallback((message: string) => {
        setSnackbar({ open: true, message })
    }, [])

    const handleSnackbarClose = useCallback(() => {
        setSnackbar({ open: false, message: '' })
    }, [])

    // Load available nodes
    const { availableNodes } = useFlowNodes()

    // Auto-add Start node when creating a new (empty) canvas.
    // Only runs once: when availableNodes first loads and the canvas has no initial flow.
    const hasInitialFlow = safeInitialNodes.length > 0
    const startNodeInitialized = useRef(false)
    useEffect(() => {
        if (hasInitialFlow || startNodeInitialized.current) return
        if (availableNodes.length === 0) return

        const startNodeDef = availableNodes.find((n) => n.name === 'startAgentflow')
        if (!startNodeDef) return

        startNodeInitialized.current = true
        const startNodeId = 'startAgentflow_0'
        const startNodeData = initNode(startNodeDef, startNodeId, true)
        const startNode: FlowNode = {
            id: startNodeId,
            type: resolveNodeType(startNodeDef.type ?? ''),
            position: { x: 100, y: 100 },
            data: { ...startNodeData, label: 'Start' }
        }
        setLocalNodes([startNode])
    }, [hasInitialFlow, availableNodes, setLocalNodes])

    // Register local state setters with context on mount
    useEffect(() => {
        registerLocalStateSetters(setLocalNodes, setLocalEdges)
    }, [registerLocalStateSetters, setLocalNodes, setLocalEdges])

    // Register onFlowChange callback so context-level updates (e.g. updateNodeData)
    // can notify the parent of flow changes
    useEffect(() => {
        registerOnFlowChange(onFlowChange)
        return () => registerOnFlowChange(undefined)
    }, [registerOnFlowChange, onFlowChange])

    // Sync local ReactFlow state to context (when user interacts with canvas)
    useEffect(() => {
        syncNodesFromReactFlow(nodes as FlowNode[])
    }, [nodes, syncNodesFromReactFlow])

    useEffect(() => {
        syncEdgesFromReactFlow(edges as FlowEdge[])
    }, [edges, syncEdgesFromReactFlow])

    // Flow handlers
    const { handleConnect, handleNodesChange, handleNodeDragStop, handleEdgesChange, handleAddNode } = useFlowHandlers({
        nodes: nodes as FlowNode[],
        edges: edges as FlowEdge[],
        setLocalNodes: setLocalNodes as React.Dispatch<React.SetStateAction<FlowNode[]>>,
        setLocalEdges: setLocalEdges as React.Dispatch<React.SetStateAction<FlowEdge[]>>,
        onNodesChange,
        onEdgesChange,
        onFlowChange,
        availableNodes,
        onConstraintViolation: handleConstraintViolation
    })

    // Drag and drop handlers
    const { handleDragOver, handleDrop } = useDragAndDrop({
        nodes: nodes as FlowNode[],
        setLocalNodes: setLocalNodes as React.Dispatch<React.SetStateAction<FlowNode[]>>,
        reactFlowWrapper: reactFlowWrapper as React.RefObject<HTMLDivElement>,
        onConstraintViolation: handleConstraintViolation
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

    // Handle save — run validation first and highlight problem nodes
    const handleSave = useCallback(() => {
        if (!onSave) return

        const flowNodes = nodes as FlowNode[]
        const flowEdges = edges as FlowEdge[]
        const result = validateFlow(flowNodes, flowEdges, availableNodes)

        // Update node border highlighting: set errors on failing nodes, clear errors on now-valid nodes
        setLocalNodes((prev) => applyValidationErrorsToNodes(prev as FlowNode[], result.errors) as FlowNode[])

        if (!result.valid) {
            handleConstraintViolation('Flow has validation errors. Please fix them before saving.')
            return
        }

        onSave(agentflow.getFlow())
        setDirty(false)
    }, [onSave, agentflow, setDirty, nodes, edges, availableNodes, setLocalNodes, handleConstraintViolation])

    // Keyboard shortcut: Cmd+S / Ctrl+S to save
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                handleSave()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [handleSave])

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
        <div className={`agentflow-container${isDarkMode ? ' dark' : ''}`}>
            {/* Header */}
            {renderHeader ? renderHeader(headerProps) : showDefaultHeader ? <AgentflowHeader {...headerProps} readOnly={readOnly} /> : null}

            <div className='agentflow-main'>
                {/* Node Palette - only render if custom renderNodePalette is provided */}
                {renderNodePalette && renderNodePalette(paletteProps)}

                {/* Canvas */}
                <div
                    className='agentflow-canvas'
                    data-dark-mode={isDarkMode}
                    ref={reactFlowWrapper}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {/* Add Nodes Drawer - positioned at top left */}
                    {!readOnly && showDefaultPalette && (
                        <AddNodesDrawer nodes={availableNodes} onNodeClick={(node) => handleAddNode(node.name)} />
                    )}

                    {/* Generate Flow Button - positioned at top left, next to Add Nodes button (v2 style) */}
                    {!readOnly && enableGenerator && (
                        <StyledFab
                            gradient
                            size='small'
                            aria-label='generate'
                            title='Generate Agentflow'
                            onClick={() => setShowGenerateDialog(true)}
                            sx={{
                                position: 'absolute',
                                left: showDefaultPalette ? 70 : 20, // 70px offset = ~10px gap between buttons
                                top: 20,
                                zIndex: tokens.zIndex.canvasButton
                            }}
                        >
                            <IconSparkles />
                        </StyledFab>
                    )}

                    {/* Canvas action buttons - positioned at top right */}
                    {!readOnly && (
                        <div
                            style={{
                                position: 'absolute',
                                right: 20,
                                top: 20,
                                zIndex: tokens.zIndex.canvasButton,
                                display: 'flex',
                                gap: 8
                            }}
                        >
                            <ValidationFeedback
                                nodes={nodes as FlowNode[]}
                                edges={edges as FlowEdge[]}
                                availableNodes={availableNodes}
                                setNodes={setLocalNodes as React.Dispatch<React.SetStateAction<FlowNode[]>>}
                            />
                            {canvasActions}
                        </div>
                    )}

                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={handleNodesChange}
                        onEdgesChange={handleEdgesChange}
                        onConnect={handleConnect}
                        onNodeDragStop={handleNodeDragStop}
                        onInit={setReactFlowInstance}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        connectionLineComponent={ConnectionLine}
                        fitView
                        nodesDraggable={!readOnly}
                        nodesConnectable={!readOnly}
                        elementsSelectable={!readOnly}
                    >
                        <Controls className={isDarkMode ? 'dark-mode-controls' : ''} />
                        <MiniMap
                            nodeStrokeWidth={3}
                            nodeColor={reactFlowColors.minimapNode}
                            nodeStrokeColor={reactFlowColors.minimapNodeStroke}
                            maskColor={reactFlowColors.minimapMask}
                            style={{ backgroundColor: reactFlowColors.minimapBackground }}
                        />
                        <Background color={reactFlowColors.backgroundDots} gap={16} />
                    </ReactFlow>
                </div>
            </div>

            {/* Generate Flow Dialog */}
            <GenerateFlowDialog open={showGenerateDialog} onClose={() => setShowGenerateDialog(false)} onGenerated={handleFlowGenerated} />

            {/* Edit Node Dialog */}
            <EditNodeDialog show={state.editingNodeId !== null} dialogProps={state.editDialogProps || {}} onCancel={closeEditDialog} />

            {/* Constraint Violation Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert onClose={handleSnackbarClose} severity='error' variant='filled' sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    )
}

/**
 * Main Agentflow component.
 * Renders an embeddable agentflow canvas with optional header and node palette.
 *
 * @example
 * ```tsx
 * import { Agentflow } from '@flowiseai/agentflow'
 * import '@flowiseai/agentflow/flowise.css'
 *
 * function App() {
 *   return (
 *     <Agentflow
 *       apiBaseUrl="https://flowise-url.com"
 *       token="your-auth-token"
 *       components={['agentAgentflow', 'llmAgentflow']}
 *     />
 *   )
 * }
 * ```
 */
export const Agentflow = forwardRef<AgentFlowInstance, AgentflowProps>(function Agentflow(props, ref) {
    const {
        apiBaseUrl,
        token,
        requestInterceptor,
        initialFlow,
        components,
        onFlowChange,
        onSave,
        onFlowGenerated,
        isDarkMode = false,
        readOnly = false,
        enableGenerator = true,
        renderHeader,
        renderNodePalette,
        showDefaultHeader = true,
        showDefaultPalette = true,
        canvasActions
    } = props

    return (
        <AgentflowProvider
            apiBaseUrl={apiBaseUrl}
            token={token}
            requestInterceptor={requestInterceptor}
            isDarkMode={isDarkMode}
            components={components}
            readOnly={readOnly}
            initialFlow={initialFlow}
        >
            <ReactFlowProvider>
                <AgentflowCanvasWithRef
                    ref={ref}
                    initialFlow={initialFlow}
                    readOnly={readOnly}
                    onFlowChange={onFlowChange}
                    onSave={onSave}
                    onFlowGenerated={onFlowGenerated}
                    enableGenerator={enableGenerator}
                    showDefaultHeader={showDefaultHeader}
                    showDefaultPalette={showDefaultPalette}
                    renderHeader={renderHeader}
                    renderNodePalette={renderNodePalette}
                    canvasActions={canvasActions}
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
        onFlowChange?: FlowDataCallback
        onSave?: FlowDataCallback
        onFlowGenerated?: FlowDataCallback
        showDefaultHeader?: boolean
        showDefaultPalette?: boolean
        enableGenerator?: boolean
        renderHeader?: AgentflowProps['renderHeader']
        renderNodePalette?: AgentflowProps['renderNodePalette']
        canvasActions?: AgentflowProps['canvasActions']
    }
>(function AgentflowCanvasWithRef(props, ref) {
    const agentflow = useAgentflow()

    // Expose imperative methods via ref
    useImperativeHandle(ref, () => agentflow, [agentflow])

    return <AgentflowCanvas {...props} />
})

export default Agentflow
