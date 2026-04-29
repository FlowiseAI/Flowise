// ============================================================================
// Execution Types
// ============================================================================

export type ExecutionStatus = 'PENDING' | 'INPROGRESS' | 'FINISHED' | 'ERROR' | 'STOPPED' | 'TERMINATED' | 'WAITING_FOR_INPUT'

export interface NodeExecutionState {
    nodeId: string
    status: ExecutionStatus
    error?: string
    startedAt?: string
    finishedAt?: string
}

export interface FlowExecutionState {
    executionId: string | null
    status: ExecutionStatus
    nodeStates: Record<string, NodeExecutionState>
}

export interface Execution {
    id: string
    chatflowId: string
    agentflowId?: string
    sessionId?: string
    status: ExecutionStatus
    state?: string
    executionData?: string
    createdDate: string
    stoppedDate?: string
}
