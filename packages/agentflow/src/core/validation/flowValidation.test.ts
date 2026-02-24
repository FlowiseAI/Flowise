import { makeFlowEdge, makeFlowNode } from '@test-utils/factories'

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

    it('should warn when start node has no outgoing connections', () => {
        const nodes = [makeNode('a', 'startAgentflow')]
        const result = validateFlow(nodes, [])
        expect(result.errors).toContainEqual(
            expect.objectContaining({ type: 'warning', message: expect.stringContaining('outgoing connection') })
        )
        // Warnings don't make the flow invalid
        expect(result.valid).toBe(true)
    })

    it('should warn for disconnected non-start nodes with no incoming edges', () => {
        const nodes = [makeNode('a', 'startAgentflow'), makeNode('b', 'llmAgentflow', 'LLM')]
        const edges: FlowEdge[] = []
        const result = validateFlow(nodes, edges)
        expect(result.errors).toContainEqual(
            expect.objectContaining({ nodeId: 'b', type: 'warning', message: expect.stringContaining('no incoming') })
        )
    })

    it('should warn for non-end nodes with no outgoing edges', () => {
        const nodes = [makeNode('a', 'startAgentflow'), makeNode('b', 'llmAgentflow', 'LLM')]
        const edges = [makeEdge('a', 'b')]
        const result = validateFlow(nodes, edges)
        expect(result.errors).toContainEqual(
            expect.objectContaining({ nodeId: 'b', type: 'warning', message: expect.stringContaining('no outgoing') })
        )
    })

    it('should not warn about outgoing edges for end nodes (directReplyAgentflow)', () => {
        const nodes = [makeNode('a', 'startAgentflow'), makeNode('b', 'directReplyAgentflow')]
        const edges = [makeEdge('a', 'b')]
        const result = validateFlow(nodes, edges)
        const outgoingWarnings = result.errors.filter((e) => e.nodeId === 'b' && e.message.includes('no outgoing'))
        expect(outgoingWarnings).toHaveLength(0)
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
})

describe('validateNode', () => {
    it('should return error for node with no name', () => {
        const node = makeNode('a', '')
        const errors = validateNode(node, [])
        expect(errors).toContainEqual(expect.objectContaining({ type: 'error', message: expect.stringContaining('missing a name') }))
    })

    it('should return no errors for valid node', () => {
        const node = makeNode('a', 'llmAgentflow')
        expect(validateNode(node, [])).toHaveLength(0)
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
        const errors = validateNode(node, [])
        expect(errors).toContainEqual(expect.objectContaining({ type: 'warning', message: expect.stringContaining('Model') }))
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
        const errors = validateNode(node, [])
        expect(errors).toHaveLength(0)
    })
})
