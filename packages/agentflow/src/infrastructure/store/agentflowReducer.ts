import type { AgentflowAction, AgentflowState, FlowNode } from '../../core/types'

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
    reactFlowInstance: null
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
        case 'RESET':
            return initialState
        default:
            return state
    }
}
