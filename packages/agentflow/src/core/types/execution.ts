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
