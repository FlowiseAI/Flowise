import { makeFlowEdge, makeFlowNode, makeNodeData } from '@test-utils/factories'

import type { FlowEdge, FlowNode } from '../types'

import { validateFlow, validateNode } from './flowValidation'

const makeNode = (id: string, name: string, label?: string) => makeFlowNode(id, { data: { id, name, label: label || name } })

const makeEdge = makeFlowEdge

describe('validateFlow', () => {
    it('should return error for empty flow', () => {
        const result = validateFlow([], [])
        expect(result.valid).toBe(false)
        expect(result.errors).toContainEqual(expect.objectContaining({ message: expect.stringContaining('empty') }))
    })

    it('should return error when no start node exists', () => {
        const nodes = [makeNode('a', 'llmAgentflow')]
        const result = validateFlow(nodes, [])
        expect(result.valid).toBe(false)
        expect(result.errors).toContainEqual(expect.objectContaining({ message: expect.stringContaining('start node') }))
    })

    it('should return error for multiple start nodes', () => {
        const nodes = [makeNode('a', 'startAgentflow'), makeNode('b', 'startAgentflow')]
        const result = validateFlow(nodes, [])
        expect(result.valid).toBe(false)
        expect(result.errors).toContainEqual(expect.objectContaining({ message: expect.stringContaining('only have one') }))
    })

    it('should pass for a valid simple flow', () => {
        const nodes = [makeNode('a', 'startAgentflow'), makeNode('b', 'llmAgentflow'), makeNode('c', 'directReplyAgentflow')]
        const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]
        const result = validateFlow(nodes, edges)
        expect(result.valid).toBe(true)
    })

    it('should warn for disconnected nodes (not in any edge)', () => {
        const nodes = [makeNode('a', 'startAgentflow'), makeNode('b', 'llmAgentflow')]
        const edges: FlowEdge[] = []
        const result = validateFlow(nodes, edges)
        expect(result.errors).toContainEqual(
            expect.objectContaining({ nodeId: 'a', type: 'warning', message: 'This node is not connected to anything' })
        )
        expect(result.errors).toContainEqual(
            expect.objectContaining({ nodeId: 'b', type: 'warning', message: 'This node is not connected to anything' })
        )
    })

    it('should ignore sticky notes in disconnection checks', () => {
        const nodes = [makeNode('a', 'startAgentflow'), makeNode('b', 'stickyNoteAgentflow')]
        const edges: FlowEdge[] = []
        const result = validateFlow(nodes, edges)
        const stickyErrors = result.errors.filter((e) => e.nodeId === 'b')
        expect(stickyErrors).toHaveLength(0)
    })

    it('should return error when flow contains a cycle', () => {
        const nodes = [makeNode('a', 'startAgentflow'), makeNode('b', 'llmAgentflow'), makeNode('c', 'llmAgentflow')]
        const edges = [makeEdge('a', 'b'), makeEdge('b', 'c'), makeEdge('c', 'b')]
        const result = validateFlow(nodes, edges)
        expect(result.valid).toBe(false)
        expect(result.errors).toContainEqual(expect.objectContaining({ message: expect.stringContaining('cycle') }))
    })

    // --- Hanging edge detection ---
    it('should warn about hanging edge with missing source', () => {
        const nodes = [makeNode('a', 'startAgentflow'), makeNode('b', 'llmAgentflow')]
        const edges = [makeEdge('a', 'b'), makeEdge('nonexistent', 'b')]
        const result = validateFlow(nodes, edges)
        expect(result.errors).toContainEqual(
            expect.objectContaining({
                nodeId: 'b',
                message: expect.stringContaining('non-existent source node')
            })
        )
    })

    it('should warn about hanging edge with missing target', () => {
        const nodes = [makeNode('a', 'startAgentflow'), makeNode('b', 'llmAgentflow')]
        const edges = [makeEdge('a', 'b'), makeEdge('a', 'nonexistent')]
        const result = validateFlow(nodes, edges)
        expect(result.errors).toContainEqual(
            expect.objectContaining({
                nodeId: 'a',
                message: expect.stringContaining('non-existent target node')
            })
        )
    })

    it('should warn about hanging edge with both missing', () => {
        const nodes = [makeNode('a', 'startAgentflow')]
        const edges = [makeEdge('x', 'y')]
        const result = validateFlow(nodes, edges)
        expect(result.errors).toContainEqual(
            expect.objectContaining({
                edgeId: 'x-y',
                message: 'Disconnected edge - both source and target nodes do not exist'
            })
        )
    })
})

describe('validateNode', () => {
    it('should return error for node with no name', () => {
        const node = makeNode('a', '')
        const errors = validateNode(node)
        expect(errors).toContainEqual(expect.objectContaining({ type: 'error', message: expect.stringContaining('missing a name') }))
    })

    it('should return no errors for valid node', () => {
        const node = makeNode('a', 'llmAgentflow')
        expect(validateNode(node)).toHaveLength(0)
    })

    it('should warn about missing required inputs', () => {
        const node: FlowNode = {
            ...makeNode('a', 'llmAgentflow'),
            data: {
                id: 'a',
                name: 'llmAgentflow',
                label: 'LLM',
                inputs: [{ id: 'p1', name: 'model', label: 'Model', type: 'string', optional: false }],
                inputValues: {}
            }
        }
        const errors = validateNode(node)
        expect(errors).toContainEqual(expect.objectContaining({ type: 'warning', message: 'Model is required' }))
    })

    it('should not warn about optional inputs', () => {
        const node: FlowNode = {
            ...makeNode('a', 'llmAgentflow'),
            data: {
                id: 'a',
                name: 'llmAgentflow',
                label: 'LLM',
                inputs: [{ id: 'p1', name: 'apiKey', label: 'API Key', type: 'string', optional: true }],
                inputValues: {}
            }
        }
        const errors = validateNode(node)
        expect(errors).toHaveLength(0)
    })

    it('should skip hidden fields (show condition not met)', () => {
        const node: FlowNode = {
            ...makeNode('a', 'llmAgentflow'),
            data: {
                id: 'a',
                name: 'llmAgentflow',
                label: 'LLM',
                inputs: [{ id: 'p1', name: 'apiKey', label: 'API Key', type: 'string', optional: false, show: { mode: 'api' } }],
                inputValues: { mode: 'local' }
            }
        }
        const errors = validateNode(node)
        const apiKeyErrors = errors.filter((e) => e.message.includes('API Key'))
        expect(apiKeyErrors).toHaveLength(0)
    })

    // --- Credential validation ---
    it('should warn about missing required credential', () => {
        const node: FlowNode = {
            ...makeNode('a', 'llmAgentflow'),
            data: {
                id: 'a',
                name: 'llmAgentflow',
                label: 'LLM',
                inputs: [{ id: 'cred', name: 'credential', label: 'Credential', type: 'string', optional: false }],
                inputValues: {}
            }
        }
        const errors = validateNode(node)
        expect(errors).toContainEqual(expect.objectContaining({ message: 'Credential is required' }))
        // Should produce exactly one error, not a duplicate from the general required-field check
        const credErrors = errors.filter((e) => e.message.includes('required'))
        expect(credErrors).toHaveLength(1)
    })

    it('should not warn about credential when value is set', () => {
        const node: FlowNode = {
            ...makeNode('a', 'llmAgentflow'),
            data: {
                id: 'a',
                name: 'llmAgentflow',
                label: 'LLM',
                inputs: [{ id: 'cred', name: 'credential', label: 'Credential', type: 'string', optional: false }],
                inputValues: { credential: 'some-credential-id' }
            }
        }
        const errors = validateNode(node)
        const credErrors = errors.filter((e) => e.message === 'Credential is required')
        expect(credErrors).toHaveLength(0)
    })

    // --- Array sub-field validation ---
    it('should validate required array sub-fields', () => {
        const node: FlowNode = {
            ...makeNode('a', 'conditionAgentflow'),
            data: {
                id: 'a',
                name: 'conditionAgentflow',
                label: 'Condition',
                inputs: [
                    {
                        id: 'conds',
                        name: 'conditions',
                        label: 'Conditions',
                        type: 'array',
                        array: [{ id: 'f1', name: 'fieldName', label: 'Field Name', type: 'string', optional: false }]
                    }
                ],
                inputValues: {
                    conditions: [{ fieldName: '' }, { fieldName: 'valid' }]
                }
            }
        }
        const errors = validateNode(node)
        expect(errors).toContainEqual(expect.objectContaining({ message: 'Conditions item #1: Field Name is required' }))
        const item2Errors = errors.filter((e) => e.message.includes('item #2'))
        expect(item2Errors).toHaveLength(0)
    })

    // --- asyncOptions / asyncMultiOptions validation ---
    it('should warn when required asyncOptions field is visible and empty', () => {
        const node: FlowNode = {
            ...makeNode('a', 'llmAgentflow'),
            data: {
                id: 'a',
                name: 'llmAgentflow',
                label: 'LLM',
                inputs: [{ id: 'p1', name: 'model', label: 'Model', type: 'asyncOptions', optional: false, loadMethod: 'listModels' }],
                inputValues: {}
            }
        }
        const errors = validateNode(node)
        expect(errors).toContainEqual(expect.objectContaining({ type: 'warning', message: 'Model is required' }))
    })

    it('should not warn when asyncOptions field has a selected value', () => {
        const node: FlowNode = {
            ...makeNode('a', 'llmAgentflow'),
            data: {
                id: 'a',
                name: 'llmAgentflow',
                label: 'LLM',
                inputs: [{ id: 'p1', name: 'model', label: 'Model', type: 'asyncOptions', optional: false, loadMethod: 'listModels' }],
                inputValues: { model: 'gpt-4o' }
            }
        }
        const errors = validateNode(node)
        const modelErrors = errors.filter((e) => e.message.includes('Model'))
        expect(modelErrors).toHaveLength(0)
    })

    it('should not warn about a field that is hidden by an asyncOptions value', () => {
        // Field B has show: { model: 'gpt-4o' }. When model !== 'gpt-4o', field B is hidden.
        const node: FlowNode = {
            ...makeNode('a', 'llmAgentflow'),
            data: {
                id: 'a',
                name: 'llmAgentflow',
                label: 'LLM',
                inputs: [
                    { id: 'p1', name: 'model', label: 'Model', type: 'asyncOptions', optional: false, loadMethod: 'listModels' },
                    { id: 'p2', name: 'temperature', label: 'Temperature', type: 'number', optional: false, show: { model: 'gpt-4o' } }
                ],
                inputValues: { model: 'claude-3' } // temperature is hidden
            }
        }
        const errors = validateNode(node)
        const tempErrors = errors.filter((e) => e.message.includes('Temperature'))
        expect(tempErrors).toHaveLength(0)
    })

    it('should warn about a required field made visible by asyncOptions value', () => {
        // When model === 'gpt-4o', Temperature becomes required and is empty.
        const node: FlowNode = {
            ...makeNode('a', 'llmAgentflow'),
            data: {
                id: 'a',
                name: 'llmAgentflow',
                label: 'LLM',
                inputs: [
                    { id: 'p1', name: 'model', label: 'Model', type: 'asyncOptions', optional: false, loadMethod: 'listModels' },
                    { id: 'p2', name: 'temperature', label: 'Temperature', type: 'number', optional: false, show: { model: 'gpt-4o' } }
                ],
                inputValues: { model: 'gpt-4o' } // temperature is visible but empty
            }
        }
        const errors = validateNode(node)
        expect(errors).toContainEqual(expect.objectContaining({ type: 'warning', message: 'Temperature is required' }))
    })

    it('should correctly resolve asyncMultiOptions JSON array value for show/hide conditions', () => {
        // Field B shows when tools includes 'calculator'. asyncMultiOptions stores as JSON array string.
        const node: FlowNode = {
            ...makeNode('a', 'agentNode'),
            data: {
                id: 'a',
                name: 'agentNode',
                label: 'Agent',
                inputs: [
                    { id: 'p1', name: 'tools', label: 'Tools', type: 'asyncMultiOptions', optional: true, loadMethod: 'listTools' },
                    {
                        id: 'p2',
                        name: 'calcConfig',
                        label: 'Calculator Config',
                        type: 'string',
                        optional: false,
                        show: { tools: ['calculator'] }
                    }
                ],
                // JSON array string — calcConfig should be visible
                inputValues: { tools: '["calculator","search"]' }
            }
        }
        const errors = validateNode(node)
        // calcConfig is visible and empty → should be flagged
        expect(errors).toContainEqual(expect.objectContaining({ message: 'Calculator Config is required' }))
    })

    // --- Nested config validation ---
    it('should validate nested component config required fields', () => {
        const availableNodes = [
            makeNodeData({
                name: 'openAIChat',
                inputs: [{ id: 'ak', name: 'apiKey', label: 'API Key', type: 'string', optional: false }]
            })
        ]
        const node: FlowNode = {
            ...makeNode('a', 'llmAgentflow'),
            data: {
                id: 'a',
                name: 'llmAgentflow',
                label: 'LLM',
                inputs: [{ id: 'model', name: 'model', label: 'Chat Model', type: 'string' }],
                inputValues: {
                    model: 'openAIChat',
                    modelConfig: { apiKey: '' }
                }
            }
        }
        const errors = validateNode(node, availableNodes)
        expect(errors).toContainEqual(expect.objectContaining({ message: 'Chat Model configuration: API Key is required' }))
    })
})
