import { renderHook } from '@testing-library/react'

import { useAvailableVariables } from './useAvailableVariables'

// --- Mocks ---

const mockState = {
    nodes: [] as Array<{ id: string; data: Record<string, unknown> }>,
    edges: [] as Array<{ source: string; target: string }>
}

jest.mock('@/infrastructure/store', () => ({
    useAgentflowContext: () => ({
        state: mockState
    })
}))

// --- Helpers ---

function makeNode(id: string, name: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        data: {
            id,
            name,
            label: name,
            inputs: {},
            ...overrides
        }
    }
}

// --- Tests ---

describe('useAvailableVariables', () => {
    beforeEach(() => {
        mockState.nodes = []
        mockState.edges = []
    })

    it('always returns global variables (chat context + flow variables)', () => {
        const { result } = renderHook(() => useAvailableVariables('node_0'))

        const labels = result.current.map((i) => i.label)
        // Chat Context
        expect(labels).toContain('question')
        expect(labels).toContain('chat_history')
        expect(labels).toContain('current_date_time')
        expect(labels).toContain('runtime_messages_length')
        expect(labels).toContain('loop_count')
        expect(labels).toContain('file_attachment')
        // Flow Variables
        expect(labels).toContain('$flow.sessionId')
        expect(labels).toContain('$flow.chatId')
        expect(labels).toContain('$flow.chatflowId')
        expect(result.current).toHaveLength(9)
    })

    it('returns upstream node outputs based on edges', () => {
        mockState.nodes = [makeNode('llm_0', 'llmAgentflow'), makeNode('agent_0', 'agentAgentflow')]
        mockState.edges = [{ source: 'llm_0', target: 'agent_0' }]

        const { result } = renderHook(() => useAvailableVariables('agent_0'))

        const nodeOutputs = result.current.filter((i) => i.category === 'Node Outputs')
        expect(nodeOutputs).toHaveLength(1)
        expect(nodeOutputs[0].value).toBe('{{llm_0.data.instance}}')
        expect(nodeOutputs[0].label).toBe('llmAgentflow')
    })

    it('excludes startAgentflow from node outputs', () => {
        mockState.nodes = [makeNode('start_0', 'startAgentflow'), makeNode('agent_0', 'agentAgentflow')]
        mockState.edges = [{ source: 'start_0', target: 'agent_0' }]

        const { result } = renderHook(() => useAvailableVariables('agent_0'))

        const nodeOutputs = result.current.filter((i) => i.category === 'Node Outputs')
        expect(nodeOutputs).toHaveLength(0)
    })

    it('does not return downstream node outputs', () => {
        mockState.nodes = [makeNode('llm_0', 'llmAgentflow'), makeNode('agent_0', 'agentAgentflow')]
        mockState.edges = [{ source: 'llm_0', target: 'agent_0' }]

        const { result } = renderHook(() => useAvailableVariables('llm_0'))

        const nodeOutputs = result.current.filter((i) => i.category === 'Node Outputs')
        expect(nodeOutputs).toHaveLength(0)
    })

    it('uses chainName/functionName/variableName for display label when available', () => {
        mockState.nodes = [makeNode('func_0', 'customFunction', { inputs: { functionName: 'myFunc' }, label: 'Custom Function' })]
        mockState.edges = [{ source: 'func_0', target: 'target_0' }]

        const { result } = renderHook(() => useAvailableVariables('target_0'))

        const nodeOutputs = result.current.filter((i) => i.category === 'Node Outputs')
        expect(nodeOutputs[0].label).toBe('myFunc')
    })

    it('returns flow state variables from startAgentflow node', () => {
        mockState.nodes = [
            makeNode('start_0', 'startAgentflow', {
                inputs: {
                    startState: [{ key: 'count' }, { key: 'userName' }]
                }
            })
        ]

        const { result } = renderHook(() => useAvailableVariables('node_0'))

        const stateItems = result.current.filter((i) => i.category === 'Flow State')
        expect(stateItems).toHaveLength(2)
        expect(stateItems[0].label).toBe('$flow.state.count')
        expect(stateItems[0].value).toBe('{{$flow.state.count}}')
        expect(stateItems[1].label).toBe('$flow.state.userName')
    })

    it('returns empty state when no startAgentflow node exists', () => {
        mockState.nodes = [makeNode('agent_0', 'agentAgentflow')]

        const { result } = renderHook(() => useAvailableVariables('agent_0'))

        const stateItems = result.current.filter((i) => i.category === 'Flow State')
        expect(stateItems).toHaveLength(0)
    })

    it('handles malformed startState entries gracefully', () => {
        mockState.nodes = [
            makeNode('start_0', 'startAgentflow', {
                inputs: {
                    startState: [{ key: 'valid' }, null, { noKey: true }, 42]
                }
            })
        ]

        const { result } = renderHook(() => useAvailableVariables('node_0'))

        const stateItems = result.current.filter((i) => i.category === 'Flow State')
        expect(stateItems).toHaveLength(1)
        expect(stateItems[0].label).toBe('$flow.state.valid')
    })

    it('returns empty node outputs when node has no upstream connections', () => {
        mockState.nodes = [makeNode('lonely_0', 'agentAgentflow')]
        mockState.edges = []

        const { result } = renderHook(() => useAvailableVariables('lonely_0'))

        const nodeOutputs = result.current.filter((i) => i.category === 'Node Outputs')
        expect(nodeOutputs).toHaveLength(0)
    })
})
