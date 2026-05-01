// ============================================================================
// Execution Domain Types
// ============================================================================

export type ExecutionState = 'INPROGRESS' | 'FINISHED' | 'ERROR' | 'TERMINATED' | 'TIMEOUT' | 'STOPPED'

// ============================================================================
// Execution Record (from API)
// ============================================================================

export interface AgentflowRef {
    id: string
    name: string
}

export interface Execution {
    id: string
    /** JSON-stringified NodeExecutionData[] — parse with JSON.parse before use */
    executionData: string
    state: ExecutionState
    agentflowId: string
    sessionId: string
    isPublic: boolean
    action?: string
    createdDate: string
    updatedDate: string
    stoppedDate?: string
    /** Populated when the API performs the agentflow join */
    agentflow?: AgentflowRef
}

// ============================================================================
// Node-level Execution Data (parsed from Execution.executionData)
// ============================================================================

export interface TimeMetadata {
    delta: number // milliseconds
}

export interface UsageMetadata {
    total_tokens: number
    total_cost: number // USD
}

export interface NodeExecutionOutput {
    timeMetadata?: TimeMetadata
    usageMetadata?: UsageMetadata
    [key: string]: unknown
}

export interface NodeExecutionData {
    nodeLabel: string
    nodeId: string
    /**
     * Node payload — the runtime emits this as `{ input, output, state, error, ... }`.
     * `data.output` carries `content`, `timeMetadata`, `usageMetadata`, etc.
     * Shape varies by node type, hence `Record<string, unknown>`.
     */
    data: Record<string, unknown>
    previousNodeIds: string[]
    status: ExecutionState
    /** Node type name — used for icon lookup */
    name?: string
    /** Index within an iteration group (0-based) */
    iterationIndex?: number
    iterationContext?: Record<string, unknown>
    /** Parent node ID for iteration child nodes */
    parentNodeId?: string
}

// ============================================================================
// Execution Tree (built client-side from flat NodeExecutionData[])
// ============================================================================

export interface ExecutionTreeNode {
    id: string
    nodeId: string
    nodeLabel: string
    status: ExecutionState
    /**
     * Resolved node type name — `useExecutionTree` always populates this for
     * non-virtual nodes (falling back to `data.name` then `nodeId.split('_')[0]`).
     * Empty string for virtual iteration container nodes (consumers gate on
     * `isVirtualNode` before reading).
     */
    name: string
    /** True for virtual iteration container nodes (not real execution nodes) */
    isVirtualNode?: boolean
    iterationIndex?: number
    children: ExecutionTreeNode[]
    /** Reference back to the raw execution data for the detail panel */
    raw?: NodeExecutionData
}

// ============================================================================
// API Filter / Pagination
// ============================================================================

export interface ExecutionFilters {
    state?: ExecutionState | ''
    startDate?: Date | null
    endDate?: Date | null
    agentflowId?: string
    agentflowName?: string
    sessionId?: string
}

export interface ExecutionListParams extends ExecutionFilters {
    page: number
    limit: number
}

export interface ExecutionListResponse {
    data: Execution[]
    total: number
}

// ============================================================================
// HITL (Human-in-the-Loop) — passed to onHumanInput callback
// ============================================================================

export interface HumanInputParams {
    question: string
    chatId: string
    humanInput: {
        type: 'proceed' | 'reject'
        startNodeId: string
        feedback?: string
    }
}
