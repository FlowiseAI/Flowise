export interface AgentExecutionsConfig {
    apiBaseUrl: string
    token?: string
    isDarkMode?: boolean
    permissions?: string[]
    onNotification?: (message: string, variant: 'success' | 'error') => void
    originUrl?: string
    agentCanvasUrlPattern?: string
    portalElement?: HTMLElement | null
}

export interface Execution {
    id: string
    state: ExecutionState
    executionData: string | ExecutionNode[]
    sessionId: string
    agentflowId: string
    agentflow?: {
        id: string
        name: string
    }
    isPublic?: boolean
    createdDate: string
    updatedDate: string
}

export type ExecutionState = 'INPROGRESS' | 'FINISHED' | 'ERROR' | 'TERMINATED' | 'TIMEOUT' | 'STOPPED'

export interface ExecutionNode {
    nodeId: string
    nodeLabel: string
    previousNodeIds: string[]
    status: ExecutionState
    data: ExecutionNodeData
}

export interface ExecutionNodeData {
    id?: string
    name?: string
    parentNodeId?: string
    iterationIndex?: number
    iterationContext?: { index: number }
    isVirtualNode?: boolean
    parentIterationId?: string
    input?: Record<string, unknown>
    output?: Record<string, unknown>
    error?: string | Record<string, unknown>
    state?: Record<string, unknown>
    [key: string]: unknown
}

export interface ExecutionMetadata {
    id: string
    state: ExecutionState
    sessionId: string
    agentflowId: string
    agentflow?: {
        id?: string
        name?: string
    }
    isPublic?: boolean
    createdDate: string
    updatedDate: string
}

export interface ExecutionTreeItem {
    id: string
    label: string
    name?: string
    status: ExecutionState
    data: ExecutionNodeData
    children: ExecutionTreeItem[]
}

export interface ExecutionFilters {
    state: string
    startDate: Date | null
    endDate: Date | null
    agentflowId: string
    agentflowName: string
    sessionId: string
}

export interface PaginatedResponse<T> {
    data: T[]
    total: number
}
