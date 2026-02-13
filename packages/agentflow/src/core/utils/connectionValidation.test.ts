import type { FlowEdge, FlowNode } from '../types'

import { isValidConnectionAgentflowV2 } from './connectionValidation'

describe('isValidConnectionAgentflowV2', () => {
    const makeNode = (id: string): FlowNode => ({
        id,
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: { id, name: id, label: id }
    })

    const makeEdge = (source: string, target: string): FlowEdge => ({
        id: `${source}-${target}`,
        source,
        target,
        type: 'default'
    })

    it('should reject self-connections', () => {
        const nodes = [makeNode('a')]
        const edges: FlowEdge[] = []

        expect(isValidConnectionAgentflowV2({ source: 'a', target: 'a' }, nodes, edges)).toBe(false)
    })

    it('should allow valid connections', () => {
        const nodes = [makeNode('a'), makeNode('b')]
        const edges: FlowEdge[] = []

        expect(isValidConnectionAgentflowV2({ source: 'a', target: 'b' }, nodes, edges)).toBe(true)
    })

    it('should reject connections that would create a direct cycle', () => {
        const nodes = [makeNode('a'), makeNode('b')]
        const edges = [makeEdge('a', 'b')]

        expect(isValidConnectionAgentflowV2({ source: 'b', target: 'a' }, nodes, edges)).toBe(false)
    })

    it('should reject connections that would create an indirect cycle', () => {
        const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
        const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')]

        expect(isValidConnectionAgentflowV2({ source: 'c', target: 'a' }, nodes, edges)).toBe(false)
    })

    it('should allow connections in the same direction (non-cyclic)', () => {
        const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
        const edges = [makeEdge('a', 'b')]

        expect(isValidConnectionAgentflowV2({ source: 'b', target: 'c' }, nodes, edges)).toBe(true)
    })
})
