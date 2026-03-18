// ============================================================================
// Context Types
// ============================================================================

import type { ReactFlowInstance } from 'reactflow'

import type { FlowConfig, FlowEdge, FlowNode } from './flow'
import type { InputParam, NodeData } from './node'

export interface ConfigContextValue {
    isDarkMode: boolean
    components?: string[]
    readOnly: boolean
}

/** Props passed to the edit node dialog (defined here to avoid core → features import) */
export interface EditDialogProps {
    inputParams?: InputParam[]
    data?: NodeData
    disabled?: boolean
}

export interface AgentflowState {
    nodes: FlowNode[]
    edges: FlowEdge[]
    chatflow: FlowConfig | null
    isDirty: boolean
    reactFlowInstance: ReactFlowInstance | null
    editingNodeId: string | null
    editDialogProps: EditDialogProps | null
}

export type AgentflowAction =
    | { type: 'SET_NODES'; payload: FlowNode[] }
    | { type: 'SET_EDGES'; payload: FlowEdge[] }
    | { type: 'SET_CHATFLOW'; payload: FlowConfig | null }
    | { type: 'SET_DIRTY'; payload: boolean }
    | { type: 'SET_REACTFLOW_INSTANCE'; payload: ReactFlowInstance | null }
    | { type: 'OPEN_EDIT_DIALOG'; payload: { nodeId: string; dialogProps: EditDialogProps } }
    | { type: 'CLOSE_EDIT_DIALOG' }
    | { type: 'RESET' }
