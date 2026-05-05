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
    editDialogProps: null,
    executionState: null,
    componentNodes: []
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
            editDialogProps: null,
            executionState: null,
            componentNodes: []
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

    it('START_EXECUTION should set executionId, INPROGRESS status, and empty nodeStates', () => {
        const result = agentflowReducer(initialState, { type: 'START_EXECUTION', payload: 'exec-123' })
        expect(result.executionState).toEqual({
            executionId: 'exec-123',
            status: 'INPROGRESS',
            nodeStates: {}
        })
    })

    it('START_EXECUTION should replace existing execution state', () => {
        const state: AgentflowState = {
            ...initialState,
            executionState: {
                executionId: 'old-exec',
                status: 'FINISHED',
                nodeStates: { 'node-1': { nodeId: 'node-1', status: 'FINISHED' } }
            }
        }
        const result = agentflowReducer(state, { type: 'START_EXECUTION', payload: 'new-exec' })
        expect(result.executionState?.executionId).toBe('new-exec')
        expect(result.executionState?.status).toBe('INPROGRESS')
        expect(result.executionState?.nodeStates).toEqual({})
    })

    it('SET_NODE_EXECUTION_STATUS should add a node state entry', () => {
        const state: AgentflowState = {
            ...initialState,
            executionState: { executionId: 'exec-123', status: 'INPROGRESS', nodeStates: {} }
        }
        const result = agentflowReducer(state, {
            type: 'SET_NODE_EXECUTION_STATUS',
            nodeId: 'node-1',
            status: 'FINISHED'
        })
        expect(result.executionState?.nodeStates['node-1']).toEqual({
            nodeId: 'node-1',
            status: 'FINISHED',
            error: undefined
        })
    })

    it('SET_NODE_EXECUTION_STATUS should include error message when provided', () => {
        const state: AgentflowState = {
            ...initialState,
            executionState: { executionId: 'exec-123', status: 'INPROGRESS', nodeStates: {} }
        }
        const result = agentflowReducer(state, {
            type: 'SET_NODE_EXECUTION_STATUS',
            nodeId: 'node-1',
            status: 'ERROR',
            error: 'Something went wrong'
        })
        expect(result.executionState?.nodeStates['node-1']).toEqual({
            nodeId: 'node-1',
            status: 'ERROR',
            error: 'Something went wrong'
        })
    })

    it('SET_NODE_EXECUTION_STATUS should update an existing node state', () => {
        const state: AgentflowState = {
            ...initialState,
            executionState: {
                executionId: 'exec-123',
                status: 'INPROGRESS',
                nodeStates: { 'node-1': { nodeId: 'node-1', status: 'INPROGRESS' } }
            }
        }
        const result = agentflowReducer(state, {
            type: 'SET_NODE_EXECUTION_STATUS',
            nodeId: 'node-1',
            status: 'FINISHED'
        })
        expect(result.executionState?.nodeStates['node-1']?.status).toBe('FINISHED')
    })

    it('SET_NODE_EXECUTION_STATUS should preserve other node states', () => {
        const state: AgentflowState = {
            ...initialState,
            executionState: {
                executionId: 'exec-123',
                status: 'INPROGRESS',
                nodeStates: { 'node-1': { nodeId: 'node-1', status: 'FINISHED' } }
            }
        }
        const result = agentflowReducer(state, {
            type: 'SET_NODE_EXECUTION_STATUS',
            nodeId: 'node-2',
            status: 'INPROGRESS'
        })
        expect(result.executionState?.nodeStates['node-1']?.status).toBe('FINISHED')
        expect(result.executionState?.nodeStates['node-2']?.status).toBe('INPROGRESS')
    })

    it('CLEAR_EXECUTION_STATE should set executionState to null', () => {
        const state: AgentflowState = {
            ...initialState,
            executionState: {
                executionId: 'exec-123',
                status: 'FINISHED',
                nodeStates: { 'node-1': { nodeId: 'node-1', status: 'FINISHED' } }
            }
        }
        const result = agentflowReducer(state, { type: 'CLEAR_EXECUTION_STATE' })
        expect(result.executionState).toBeNull()
    })

    it('CLEAR_EXECUTION_STATE when already null should remain null', () => {
        const result = agentflowReducer(initialState, { type: 'CLEAR_EXECUTION_STATE' })
        expect(result.executionState).toBeNull()
    })

    it('SET_COMPONENT_NODES should store the provided nodes', () => {
        const nodes = [{ name: 'agentAgentflow', label: 'Agent', version: 3.2 }] as AgentflowState['componentNodes']
        const result = agentflowReducer(initialState, { type: 'SET_COMPONENT_NODES', payload: nodes })
        expect(result.componentNodes).toEqual(nodes)
    })

    it('SET_COMPONENT_NODES should replace existing componentNodes', () => {
        const state: AgentflowState = {
            ...initialState,
            componentNodes: [{ name: 'llmAgentflow', label: 'LLM' }] as AgentflowState['componentNodes']
        }
        const newNodes = [{ name: 'agentAgentflow', label: 'Agent' }] as AgentflowState['componentNodes']
        const result = agentflowReducer(state, { type: 'SET_COMPONENT_NODES', payload: newNodes })
        expect(result.componentNodes).toEqual(newNodes)
    })

    it('initialState should have an empty componentNodes array', () => {
        expect(initialState.componentNodes).toEqual([])
    })
})
