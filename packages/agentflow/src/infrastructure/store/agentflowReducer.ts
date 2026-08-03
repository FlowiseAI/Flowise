import type { AgentflowAction, AgentflowState, FlowNode } from '@/core/types'

// Node types that size to content; strip stored width/height so they stay content-sized
const CONTENT_SIZED_NODE_TYPES = new Set(['agentFlow', 'stickyNote'])

export function normalizeNodes(nodes: FlowNode[]): FlowNode[] {
    return nodes.map((node) => {
        if (CONTENT_SIZED_NODE_TYPES.has(node.type)) {
            const { width: _width, height: _height, ...rest } = node
            return rest as FlowNode
        }
        return node
    })
}

export const initialState: AgentflowState = {
    nodes: [],
    edges: [],
    chatflow: null,
    isDirty: false,
    reactFlowInstance: null,
    editingNodeId: null,
    editDialogProps: null,
    executionState: null,
    componentNodes: []
}

export function agentflowReducer(state: AgentflowState, action: AgentflowAction): AgentflowState {
    switch (action.type) {
        case 'SET_NODES':
            return { ...state, nodes: normalizeNodes(action.payload) }
        case 'SET_EDGES':
            return { ...state, edges: action.payload }
        case 'SET_CHATFLOW':
            return { ...state, chatflow: action.payload }
        case 'SET_DIRTY':
            return { ...state, isDirty: action.payload }
        case 'SET_REACTFLOW_INSTANCE':
            return { ...state, reactFlowInstance: action.payload }
        case 'OPEN_EDIT_DIALOG':
            return {
                ...state,
                editingNodeId: action.payload.nodeId,
                editDialogProps: action.payload.dialogProps
            }
        case 'CLOSE_EDIT_DIALOG':
            return {
                ...state,
                editingNodeId: null,
                editDialogProps: null
            }
        case 'RESET':
            return initialState
        case 'START_EXECUTION':
            return {
                ...state,
                executionState: {
                    executionId: action.payload,
                    status: 'INPROGRESS',
                    nodeStates: {}
                }
            }
        case 'SET_NODE_EXECUTION_STATUS':
            return {
                ...state,
                executionState: {
                    executionId: state.executionState?.executionId ?? null,
                    status: state.executionState?.status ?? 'INPROGRESS',
                    nodeStates: {
                        ...state.executionState?.nodeStates,
                        [action.nodeId]: {
                            nodeId: action.nodeId,
                            status: action.status,
                            error: action.error
                        }
                    }
                }
            }
        case 'CLEAR_EXECUTION_STATE':
            return { ...state, executionState: null }
        case 'SET_COMPONENT_NODES':
            return { ...state, componentNodes: action.payload }
        default:
            return state
    }
}
