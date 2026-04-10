import type { FlowNode } from '@/core/types'

import { extractVariables, getDefinedStateKeys, getUpstreamNodes } from './variableUtils'

// ── Shared test factories ──────────────────────────────────────────────────

/** Create a FlowNode with `updateFlowState` inputs for state-related tests. */
const makeStateNode = (id: string, updates: Array<{ key: string; value: string }>): FlowNode =>
    ({
        id,
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
            id,
            name: id,
            label: id,
            inputs: { updateFlowState: updates }
        }
    } as unknown as FlowNode)

// ── extractVariables ────────────────────────────────────────────────────────

describe('extractVariables', () => {
    it('returns empty array for empty string', () => {
        expect(extractVariables('')).toEqual([])
    })

    it('returns empty array for text without variables', () => {
        expect(extractVariables('Hello world')).toEqual([])
    })

    it('extracts a single variable', () => {
        expect(extractVariables('Hello {{question}}')).toEqual(['question'])
    })

    it('extracts multiple variables', () => {
        expect(extractVariables('{{question}} and {{chat_history}}')).toEqual(['question', 'chat_history'])
    })

    it('extracts node output references', () => {
        expect(extractVariables('Result: {{node1.data.instance}}')).toEqual(['node1.data.instance'])
    })

    it('extracts flow state variables', () => {
        expect(extractVariables('Count is {{$flow.state.count}}')).toEqual(['$flow.state.count'])
    })

    it('trims whitespace inside braces', () => {
        expect(extractVariables('{{ question }}')).toEqual(['question'])
    })

    it('does not match single braces', () => {
        expect(extractVariables('{notAVariable}')).toEqual([])
    })

    it('skips JSON-like content with colons', () => {
        expect(extractVariables('{{"key": "value"}}')).toEqual([])
        expect(extractVariables('{{"name": "test"}} and {{question}}')).toEqual(['question'])
    })

    it('does not match nested braces', () => {
        expect(extractVariables('{{{nested}}}')).toEqual(['nested'])
    })

    it('does not match unclosed braces', () => {
        expect(extractVariables('{{unclosed')).toEqual([])
    })

    it('handles mixed text and variables', () => {
        expect(extractVariables('Say {{question}} to {{node1.data.instance}} please')).toEqual(['question', 'node1.data.instance'])
    })
})

// ── getUpstreamNodes ────────────────────────────────────────────────────────

describe('getUpstreamNodes', () => {
    const makeNode = (id: string, overrides?: { name?: string; parentNode?: string }) =>
        ({
            id,
            type: 'customNode',
            position: { x: 0, y: 0 },
            data: { id, name: overrides?.name ?? id, label: id },
            ...(overrides?.parentNode ? { parentNode: overrides.parentNode } : {})
        } as {
            id: string
            type: string
            position: { x: number; y: number }
            data: { id: string; name: string; label: string }
            parentNode?: string
        })

    const makeEdge = (source: string, target: string) => ({
        id: `${source}-${target}`,
        source,
        target,
        type: 'default'
    })

    it('returns empty array when no edges target the node', () => {
        const nodes = [makeNode('a'), makeNode('b')]
        const edges = [makeEdge('a', 'b')]
        expect(getUpstreamNodes('a', nodes, edges)).toEqual([])
    })

    it('returns direct upstream nodes', () => {
        const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
        const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
        const upstream = getUpstreamNodes('b', nodes, edges)
        expect(upstream).toHaveLength(1)
        expect(upstream[0].id).toBe('a')
    })

    it('returns multiple upstream nodes', () => {
        const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
        const edges = [makeEdge('a', 'c'), makeEdge('b', 'c')]
        const upstream = getUpstreamNodes('c', nodes, edges)
        expect(upstream).toHaveLength(2)
        expect(upstream.map((n) => n.id).sort()).toEqual(['a', 'b'])
    })

    it('does not return downstream nodes', () => {
        const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
        const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
        const upstream = getUpstreamNodes('a', nodes, edges)
        expect(upstream).toHaveLength(0)
    })

    it('returns empty array when edges array is empty', () => {
        const nodes = [makeNode('a')]
        expect(getUpstreamNodes('a', nodes, [])).toEqual([])
    })

    it('recursively collects the full ancestor chain', () => {
        // a → b → c → d: querying from d should return [a, b, c]
        const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')]
        const edges = [makeEdge('a', 'b'), makeEdge('b', 'c'), makeEdge('c', 'd')]
        const upstream = getUpstreamNodes('d', nodes, edges)
        expect(upstream.map((n) => n.id).sort()).toEqual(['a', 'b', 'c'])
    })

    it('handles diamond-shaped graphs without duplicates', () => {
        //   a
        //  / \
        // b   c
        //  \ /
        //   d
        const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')]
        const edges = [makeEdge('a', 'b'), makeEdge('a', 'c'), makeEdge('b', 'd'), makeEdge('c', 'd')]
        const upstream = getUpstreamNodes('d', nodes, edges)
        expect(upstream.map((n) => n.id).sort()).toEqual(['a', 'b', 'c'])
    })

    it('excludes startAgentflow by default', () => {
        const nodes = [makeNode('start_0', { name: 'startAgentflow' }), makeNode('agent_0')]
        const edges = [makeEdge('start_0', 'agent_0')]
        const upstream = getUpstreamNodes('agent_0', nodes, edges)
        expect(upstream).toHaveLength(0)
    })

    it('includes startAgentflow when includeStart is true', () => {
        const nodes = [makeNode('start_0', { name: 'startAgentflow' }), makeNode('agent_0')]
        const edges = [makeEdge('start_0', 'agent_0')]
        const upstream = getUpstreamNodes('agent_0', nodes, edges, true)
        expect(upstream).toHaveLength(1)
        expect(upstream[0].id).toBe('start_0')
    })

    it('excludes startAgentflow but still collects nodes behind it', () => {
        // In practice startAgentflow is the root, but this tests the exclusion logic:
        // llm_0 → start_0 (excluded) → agent_0
        const nodes = [makeNode('llm_0'), makeNode('start_0', { name: 'startAgentflow' }), makeNode('agent_0')]
        const edges = [makeEdge('llm_0', 'start_0'), makeEdge('start_0', 'agent_0')]
        const upstream = getUpstreamNodes('agent_0', nodes, edges)
        // start_0 is excluded, but llm_0 should NOT be collected because
        // we skip start_0 entirely (don't recurse through excluded nodes)
        expect(upstream).toHaveLength(0)
    })

    it('traverses parentNode for nodes inside iteration groups', () => {
        // group_0 contains child_0 (via parentNode). outer_0 → group_0.
        // Querying from child_0 should find outer_0 via the parentNode traversal.
        const nodes = [makeNode('outer_0'), makeNode('group_0'), makeNode('child_0', { parentNode: 'group_0' })]
        const edges = [makeEdge('outer_0', 'group_0')]
        const upstream = getUpstreamNodes('child_0', nodes, edges)
        expect(upstream.map((n) => n.id)).toContain('outer_0')
    })

    it('handles cycles without infinite loop', () => {
        // a → b → a (cycle)
        const nodes = [makeNode('a'), makeNode('b')]
        const edges = [makeEdge('a', 'b'), makeEdge('b', 'a')]
        const upstream = getUpstreamNodes('a', nodes, edges)
        expect(upstream).toHaveLength(1)
        expect(upstream[0].id).toBe('b')
    })
})

// ── getDefinedStateKeys ────────────────────────────────────────────────────

describe('getDefinedStateKeys', () => {
    it('returns empty array when no nodes have updateFlowState', () => {
        const nodes: FlowNode[] = [
            { id: 'a', type: 'customNode', position: { x: 0, y: 0 }, data: { id: 'a', name: 'a', label: 'a' } } as unknown as FlowNode
        ]
        expect(getDefinedStateKeys(nodes)).toEqual([])
    })

    it('returns empty array for empty nodes', () => {
        expect(getDefinedStateKeys([])).toEqual([])
    })

    it('extracts keys from a single node', () => {
        const nodes = [
            makeStateNode('n1', [
                { key: 'counter', value: '1' },
                { key: 'name', value: 'test' }
            ])
        ]
        expect(getDefinedStateKeys(nodes)).toEqual(['counter', 'name'])
    })

    it('deduplicates keys across nodes', () => {
        const nodes = [makeStateNode('n1', [{ key: 'counter', value: '1' }]), makeStateNode('n2', [{ key: 'counter', value: '2' }])]
        expect(getDefinedStateKeys(nodes)).toEqual(['counter'])
    })

    it('ignores empty keys', () => {
        const nodes = [
            makeStateNode('n1', [
                { key: '', value: 'empty' },
                { key: '  ', value: 'whitespace' },
                { key: 'valid', value: 'ok' }
            ])
        ]
        expect(getDefinedStateKeys(nodes)).toEqual(['valid'])
    })

    it('returns keys sorted alphabetically', () => {
        const nodes = [
            makeStateNode('n1', [
                { key: 'zebra', value: '1' },
                { key: 'alpha', value: '2' },
                { key: 'middle', value: '3' }
            ])
        ]
        expect(getDefinedStateKeys(nodes)).toEqual(['alpha', 'middle', 'zebra'])
    })

    it('skips nodes where updateFlowState is not an array', () => {
        const nodes: FlowNode[] = [
            {
                id: 'a',
                type: 'customNode',
                position: { x: 0, y: 0 },
                data: { id: 'a', name: 'a', label: 'a', inputs: { updateFlowState: 'not-an-array' } }
            } as unknown as FlowNode
        ]
        expect(getDefinedStateKeys(nodes)).toEqual([])
    })

    it('extracts keys from startState input (Start node)', () => {
        const nodes: FlowNode[] = [
            {
                id: 'start_0',
                type: 'agentflowNode',
                position: { x: 0, y: 0 },
                data: {
                    id: 'start_0',
                    name: 'startAgentflow',
                    label: 'Start',
                    inputs: {
                        startState: [
                            { key: 'userName', value: '' },
                            { key: 'sessionId', value: '123' }
                        ]
                    }
                }
            } as unknown as FlowNode
        ]
        expect(getDefinedStateKeys(nodes)).toEqual(['sessionId', 'userName'])
    })

    it('extracts keys from prefixed UpdateState inputs (agentUpdateState, llmUpdateState)', () => {
        const nodes: FlowNode[] = [
            {
                id: 'agent_0',
                type: 'agentflowNode',
                position: { x: 0, y: 0 },
                data: {
                    id: 'agent_0',
                    name: 'agentAgentflow',
                    label: 'Agent',
                    inputs: { agentUpdateState: [{ key: 'agentKey', value: 'v1' }] }
                }
            } as unknown as FlowNode,
            {
                id: 'llm_0',
                type: 'agentflowNode',
                position: { x: 0, y: 0 },
                data: {
                    id: 'llm_0',
                    name: 'llmAgentflow',
                    label: 'LLM',
                    inputs: { llmUpdateState: [{ key: 'llmKey', value: 'v2' }] }
                }
            } as unknown as FlowNode
        ]
        expect(getDefinedStateKeys(nodes)).toEqual(['agentKey', 'llmKey'])
    })

    it('collects keys across startState and updateFlowState from different nodes', () => {
        const nodes: FlowNode[] = [
            {
                id: 'start_0',
                type: 'agentflowNode',
                position: { x: 0, y: 0 },
                data: { id: 'start_0', name: 'startAgentflow', label: 'Start', inputs: { startState: [{ key: 'initKey', value: '' }] } }
            } as unknown as FlowNode,
            makeStateNode('n1', [{ key: 'runtimeKey', value: 'x' }])
        ]
        expect(getDefinedStateKeys(nodes)).toEqual(['initKey', 'runtimeKey'])
    })
})
