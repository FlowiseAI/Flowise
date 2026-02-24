import type { ReactNode } from 'react'
import type { ReactFlowInstance } from 'reactflow'

import type { AxiosInstance } from 'axios'

import { EditNodeDialogProps } from '@/features/node-editor/EditNodeDialog'

// ============================================================================
// Flow Data Types
// ============================================================================

export interface Viewport {
    x: number
    y: number
    zoom: number
}

export interface FlowNode {
    id: string
    type: string
    position: { x: number; y: number }
    data: NodeData
    parentNode?: string
    extent?: 'parent'
    selected?: boolean
    dragging?: boolean
    width?: number
    height?: number
}

export interface FlowEdge {
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
    type: string
    data?: EdgeData
    selected?: boolean
    animated?: boolean
}

export interface FlowData {
    nodes: FlowNode[]
    edges: FlowEdge[]
    viewport?: Viewport
}

export interface FlowConfig {
    id?: string
    name?: string
    deployed?: boolean
    isPublic?: boolean
    type?: 'AGENTFLOW'
}

// ============================================================================
// Node & Edge Data Types
// ============================================================================

export interface NodeData {
    id: string
    name: string
    label: string
    type?: string
    category?: string
    description?: string
    version?: number
    baseClasses?: string[]
    inputs?: InputParam[] // Parameter definitions from API
    inputValues?: Record<string, unknown> // Actual values entered by users
    outputs?: NodeOutput[]
    inputAnchors?: InputAnchor[]
    outputAnchors?: OutputAnchor[]
    // Visual properties
    color?: string
    icon?: string
    selected?: boolean
    hideInput?: boolean
    // Status properties
    status?: 'INPROGRESS' | 'FINISHED' | 'ERROR' | 'STOPPED' | 'TERMINATED'
    error?: string
    warning?: string
    hint?: string
    [key: string]: unknown
}

export interface NodeInput {
    label: string
    name: string
    type: string
    optional?: boolean
}

export interface NodeOutput {
    label: string
    name: string
    type: string
}

export interface InputAnchor {
    id: string
    name: string
    label: string
    type: string
    optional?: boolean
    description?: string
}

export interface OutputAnchor {
    id: string
    name: string
    label: string
    type: string
}

export interface InputParam {
    id: string
    name: string
    label: string
    type: string
    default?: unknown
    optional?: boolean
    options?: Array<{ label: string; name: string } | string>
    placeholder?: string
    rows?: number
    description?: string
    acceptVariable?: boolean
    additionalParams?: boolean
    display?: boolean
}

export interface EdgeData {
    sourceColor?: string
    targetColor?: string
    edgeLabel?: string
    isHumanInput?: boolean
    [key: string]: unknown
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
    valid: boolean
    errors: ValidationError[]
}

export interface ValidationError {
    nodeId?: string
    edgeId?: string
    message: string
    type: 'error' | 'warning'
}

// ============================================================================
// Render Props Types
// ============================================================================

export interface HeaderRenderProps {
    flowName: string
    isDirty: boolean
    onSave: () => void
    onExport: () => void
    onValidate: () => ValidationResult
}

export interface PaletteRenderProps {
    availableNodes: NodeData[]
    onAddNode: (nodeType: string, position?: { x: number; y: number }) => void
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface AgentflowProps {
    /** Flowise API server endpoint (e.g., "https://flowise-url.com") */
    apiBaseUrl: string

    /** Authentication token for API calls */
    token?: string

    /** Initial flow data to render */
    initialFlow?: FlowData

    /** Flow ID for loading existing flow */
    flowId?: string

    /** Array of allowed node component names to show in palette */
    components?: string[]

    /** Callback when flow changes */
    onFlowChange?: (flow: FlowData) => void

    /** Callback when flow is saved */
    onSave?: (flow: FlowData) => void

    /** Whether to use dark mode (default: false) */
    isDarkMode?: boolean

    /** Whether the canvas is read-only */
    readOnly?: boolean

    /** Custom header renderer - receives save/export handlers */
    renderHeader?: (props: HeaderRenderProps) => ReactNode

    /** Custom node palette renderer - receives available nodes */
    renderNodePalette?: (props: PaletteRenderProps) => ReactNode

    /** Whether to show default header (ignored if renderHeader provided) */
    showDefaultHeader?: boolean

    /** Whether to show default node palette (ignored if renderNodePalette provided) */
    showDefaultPalette?: boolean

    /** Enable the AI flow generator feature (default: true) */
    enableGenerator?: boolean

    /** Callback when flow is generated via AI */
    onFlowGenerated?: (flow: FlowData) => void
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface AgentFlowInstance {
    /** Get current flow data as serializable object */
    getFlow(): FlowData

    /** Convert flow to JSON string */
    toJSON(): string

    /** Validate the current flow */
    validate(): ValidationResult

    /** Fit view to show all nodes */
    fitView(): void

    /** Get the underlying ReactFlow instance */
    getReactFlowInstance(): ReactFlowInstance | null

    /** Programmatically add a node */
    addNode(nodeData: Partial<FlowNode>): void

    /** Clear all nodes and edges */
    clear(): void
}

// ============================================================================
// Context Types
// ============================================================================

export interface ApiContextValue {
    client: AxiosInstance
    apiBaseUrl: string
}

export interface ConfigContextValue {
    isDarkMode: boolean
    components?: string[]
    readOnly: boolean
}

export interface AgentflowState {
    nodes: FlowNode[]
    edges: FlowEdge[]
    chatflow: FlowConfig | null
    isDirty: boolean
    reactFlowInstance: ReactFlowInstance | null
    editingNodeId: string | null
    editDialogProps: EditNodeDialogProps['dialogProps'] | null
}

export type AgentflowAction =
    | { type: 'SET_NODES'; payload: FlowNode[] }
    | { type: 'SET_EDGES'; payload: FlowEdge[] }
    | { type: 'SET_CHATFLOW'; payload: FlowConfig | null }
    | { type: 'SET_DIRTY'; payload: boolean }
    | { type: 'SET_REACTFLOW_INSTANCE'; payload: ReactFlowInstance | null }
    | { type: 'OPEN_EDIT_DIALOG'; payload: { nodeId: string; dialogProps: EditNodeDialogProps['dialogProps'] } }
    | { type: 'CLOSE_EDIT_DIALOG' }
    | { type: 'RESET' }

// ============================================================================
// API Types
// ============================================================================

export interface Chatflow {
    id: string
    name: string
    flowData: string
    deployed?: boolean
    isPublic?: boolean
    apikeyid?: string
    chatbotConfig?: string
    createdDate: string
    updatedDate: string
    type?: string
}

export interface ApiResponse<T> {
    data: T
    status: number
}
