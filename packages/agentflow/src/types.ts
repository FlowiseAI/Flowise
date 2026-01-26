import { Node, Edge, Viewport } from 'reactflow'

export interface FlowData {
    nodes: Node[]
    edges: Edge[]
    viewport?: Viewport
}

export interface Chatflow {
    id: string
    name: string
    flowData: FlowData
    deployed?: boolean
    isPublic?: boolean
    apikeyid?: string
    chatbotConfig?: Record<string, any>
    apiConfig?: Record<string, any>
    category?: string
    type?: 'CHATFLOW' | 'AGENTFLOW' | 'MULTIAGENT' | 'ASSISTANT'
    createdDate?: Date | string
    updatedDate?: Date | string
}

export interface AgentflowProps {
    /** Base URL for Flowise API (e.g., 'http://localhost:3000') */
    instanceUrl: string

    /** JWT token for authentication */
    token: string

    /** Initial flow JSON data to render */
    flow?: Chatflow | null

    /** Array of node names to make available (e.g., ['agentAgentflow', 'llmAgentflow']) */
    components?: string[]

    /** Optional callback when flow changes */
    onFlowChange?: (flow: FlowData) => void

    /** Optional callback when flow is saved */
    onSave?: (flow: FlowData) => void

    /** Enable dark mode theme */
    isDarkMode?: boolean
}

export interface ValidationError {
    nodeId?: string
    edgeId?: string
    message: string
    type: 'missing_connection' | 'invalid_type' | 'circular_dependency'
}

export interface ValidationResult {
    valid: boolean
    errors: ValidationError[]
}

export interface AgentFlowInstance {
    /** Get current flow as JSON */
    getFlow: () => FlowData

    /** Export flow as JSON string */
    toJSON: () => string

    /** Validate flow connections */
    validate: () => ValidationResult

    /** Fit view to show all nodes */
    fitView: () => void

    /** Get ReactFlow instance */
    getReactFlowInstance: () => any
}

export interface AgentflowContextValue {
    flow: FlowData | null
    setFlow: (flow: FlowData) => void
    reactFlowInstance: any
    setReactFlowInstance: (instance: any) => void
    availableComponents: any[]
    setAvailableComponents: (components: any[]) => void
}
