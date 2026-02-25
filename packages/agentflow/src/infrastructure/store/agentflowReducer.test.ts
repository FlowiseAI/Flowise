import { makeFlowEdge, makeFlowNode } from '@test-utils/factories'

import type { AgentflowAction, AgentflowState, FlowNode } from '@/core/types'

import { agentflowReducer, normalizeNodes } from './agentflowReducer'

const makeNode = (id: string, type = 'agentFlow', overrides?: Partial<FlowNode>) => makeFlowNode(id, { type, ...overrides })

const makeEdge = makeFlowEdge

const initialState: AgentflowState = {
    nodes: [],
    edges: [],
    chatflow: null,
    isDirty: false,
    reactFlowInstance: null,
    editingNodeId: null,
    editDialogProps: null
}

describe('normalizeNodes', () => {
    it('should strip width and height from content-sized node types', () => {
        const nodes = [makeNode('a', 'agentFlow', { width: 300, height: 200 })]
        const result = normalizeNodes(nodes)
        expect(result[0].width).toBeUndefined()
        expect(result[0].height).toBeUndefined()
    })

    it('should strip width and height from stickyNote nodes', () => {
        const nodes = [makeNode('s', 'stickyNote', { width: 200, height: 150 })]
        const result = normalizeNodes(nodes)
        expect(result[0].width).toBeUndefined()
        expect(result[0].height).toBeUndefined()
    })

    it('should preserve width and height for other node types', () => {
        const nodes = [makeNode('a', 'iterationNode', { width: 400, height: 300 })]
        const result = normalizeNodes(nodes)
        expect(result[0].width).toBe(400)
        expect(result[0].height).toBe(300)
    })

    it('should preserve all other node properties', () => {
        const nodes = [makeNode('a', 'agentFlow', { width: 300, height: 200, selected: true })]
        const result = normalizeNodes(nodes)
        expect(result[0].id).toBe('a')
        expect(result[0].position).toEqual({ x: 0, y: 0 })
        expect(result[0].selected).toBe(true)
    })

    it('should return empty array for empty input', () => {
        expect(normalizeNodes([])).toEqual([])
    })
})

describe('agentflowReducer', () => {
    it('should handle SET_NODES and normalize them', () => {
        const nodes = [makeNode('a', 'agentFlow', { width: 300 })]
        const result = agentflowReducer(initialState, { type: 'SET_NODES', payload: nodes })
        expect(result.nodes).toHaveLength(1)
        expect(result.nodes[0].width).toBeUndefined()
    })

    it('should handle SET_EDGES', () => {
        const edges = [makeEdge('a', 'b')]
        const result = agentflowReducer(initialState, { type: 'SET_EDGES', payload: edges })
        expect(result.edges).toEqual(edges)
    })

    it('should handle SET_CHATFLOW', () => {
        const chatflow = { id: 'flow-1', name: 'Test Flow' }
        const result = agentflowReducer(initialState, { type: 'SET_CHATFLOW', payload: chatflow })
        expect(result.chatflow).toEqual(chatflow)
    })

    it('should handle SET_CHATFLOW with null', () => {
        const state = { ...initialState, chatflow: { id: '1', name: 'Test' } }
        const result = agentflowReducer(state, { type: 'SET_CHATFLOW', payload: null })
        expect(result.chatflow).toBeNull()
    })

    it('should open edit dialog with nodeId and dialogProps', () => {
        const state = initialState
        const action: AgentflowAction = {
            type: 'OPEN_EDIT_DIALOG',
            payload: {
                nodeId: 'node-123',
                dialogProps: {
                    inputParams: [],
                    data: { id: 'node-123', name: 'sendResponse', label: 'Send Response 1' },
                    disabled: false
                }
            }
        }
        const newState = agentflowReducer(state, action)

        expect(newState.editingNodeId).toBe('node-123')
        expect(newState.editDialogProps).toEqual(action.payload.dialogProps)
    })

    it('should close edit dialog and clear state', () => {
        const state = {
            ...initialState,
            editingNodeId: 'node-123',
            editDialogProps: {
                /* ... */
            }
        }
        const newState = agentflowReducer(state, { type: 'CLOSE_EDIT_DIALOG' })

        expect(newState.editingNodeId).toBeNull()
        expect(newState.editDialogProps).toBeNull()
    })

    it('should handle SET_DIRTY', () => {
        const result = agentflowReducer(initialState, { type: 'SET_DIRTY', payload: true })
        expect(result.isDirty).toBe(true)
    })

    it('should handle SET_REACTFLOW_INSTANCE', () => {
        const mockInstance = { fitView: jest.fn() } as unknown as AgentflowState['reactFlowInstance']
        const result = agentflowReducer(initialState, { type: 'SET_REACTFLOW_INSTANCE', payload: mockInstance })
        expect(result.reactFlowInstance).toBe(mockInstance)
    })

    it('should handle RESET', () => {
        const dirtyState: AgentflowState = {
            nodes: [makeNode('a')],
            edges: [makeEdge('a', 'b')],
            chatflow: { id: '1', name: 'Test' },
            isDirty: true,
            reactFlowInstance: null,
            editingNodeId: null,
            editDialogProps: null
        }
        const result = agentflowReducer(dirtyState, { type: 'RESET' })
        expect(result.nodes).toEqual([])
        expect(result.edges).toEqual([])
        expect(result.chatflow).toBeNull()
        expect(result.isDirty).toBe(false)
    })

    it('should return current state for unknown action', () => {
        const result = agentflowReducer(initialState, { type: 'UNKNOWN' } as unknown as AgentflowAction)
        expect(result).toBe(initialState)
    })

    it('should not mutate previous state', () => {
        const state: AgentflowState = { ...initialState, nodes: [makeNode('a', 'customNode')] }
        const newNodes = [makeNode('b', 'customNode')]
        agentflowReducer(state, { type: 'SET_NODES', payload: newNodes })
        expect(state.nodes).toHaveLength(1)
        expect(state.nodes[0].id).toBe('a')
    })
})
