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

// Iteration metadata (`parentNodeId`, `iterationIndex`, `iterationContext`) is
// nested in `data`, not at the top level — matches the runtime emission in
// `packages/server/src/utils/buildAgentflow.ts`.
export interface NodeExecutionDataPayload {
    name?: string
    parentNodeId?: string
    /** 0-based */
    iterationIndex?: number
    iterationContext?: Record<string, unknown>
    [key: string]: unknown
}

export interface NodeExecutionData {
    nodeLabel: string
    nodeId: string
    data: NodeExecutionDataPayload
    previousNodeIds: string[]
    status: ExecutionState
    name?: string
}

// ============================================================================
// Execution Tree (built client-side from flat NodeExecutionData[])
// ============================================================================

export interface ExecutionTreeNode {
    id: string
    nodeId: string
    nodeLabel: string
    /**
     * `ExecutionState` for real nodes; virtual iteration nodes additionally
     * surface `'UNKNOWN'` when the rollup over their children falls through
     * (legacy ExecutionDetails.jsx:438-446 parity).
     */
    status: ExecutionState | 'UNKNOWN'
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
