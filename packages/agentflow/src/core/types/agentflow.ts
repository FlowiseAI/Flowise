// ============================================================================
// Component Props & Hook Return Types
// ============================================================================

import type { ReactNode } from 'react'
import type { ReactFlowInstance } from 'reactflow'

import type { RequestInterceptor } from './api'
import type { FlowData, FlowDataCallback, FlowNode } from './flow'
import type { NodeData } from './node'
import type { ValidationResult } from './validation'

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
// Component Props & Hook Return Types
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
    onFlowChange?: FlowDataCallback

    /** Callback when flow is saved */
    onSave?: FlowDataCallback

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
    onFlowGenerated?: FlowDataCallback

    /**
     * Optional callback to customize outgoing API requests (e.g., set `withCredentials`, add headers).
     * Receives the full Axios request config including auth headers — only modify what you need.
     *
     * **Security:** This callback executes in the request pipeline with access to all request
     * data, including authentication tokens. Only pass trusted, developer-authored functions.
     * Never use dynamically evaluated or user-generated code as the interceptor.
     * If the interceptor throws, the error is caught and the original config is used.
     */
    requestInterceptor?: RequestInterceptor
}

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
