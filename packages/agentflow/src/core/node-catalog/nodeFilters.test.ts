import { makeNodeData } from '@test-utils/factories'

import { DEFAULT_AGENTFLOW_NODES } from '../node-config'

import { filterNodesByComponents, groupNodesByCategory, isAgentflowNode } from './nodeFilters'

const makeNode = (name: string, category?: string) => makeNodeData({ name, label: name, category: category || 'Agent Flows' })

describe('filterNodesByComponents', () => {
    const allNodes = [
        makeNode('startAgentflow'),
        makeNode('llmAgentflow'),
        makeNode('agentAgentflow'),
        makeNode('customNodeNotInDefaults'),
        makeNode('anotherCustom')
    ]

    it('should return only default agentflow nodes when no components specified', () => {
        const result = filterNodesByComponents(allNodes)
        result.forEach((node) => {
            expect(DEFAULT_AGENTFLOW_NODES).toContain(node.name)
        })
        expect(result.find((n) => n.name === 'customNodeNotInDefaults')).toBeUndefined()
    })

    it('should return only default agentflow nodes for empty components array', () => {
        const result = filterNodesByComponents(allNodes, [])
        expect(result.find((n) => n.name === 'customNodeNotInDefaults')).toBeUndefined()
    })

    it('should filter to specified components', () => {
        const result = filterNodesByComponents(allNodes, ['llmAgentflow', 'customNodeNotInDefaults'])
        const names = result.map((n) => n.name)
        expect(names).toContain('llmAgentflow')
        expect(names).toContain('customNodeNotInDefaults')
    })

    it('should always include startAgentflow even if not in components list', () => {
        const result = filterNodesByComponents(allNodes, ['llmAgentflow'])
        const names = result.map((n) => n.name)
        expect(names).toContain('startAgentflow')
    })

    it('should return empty array when no nodes match', () => {
        const result = filterNodesByComponents(allNodes, ['nonExistent'])
        // Only startAgentflow should be present (always included)
        expect(result.map((n) => n.name)).toEqual(['startAgentflow'])
    })
})

describe('isAgentflowNode', () => {
    it('should return true for default agentflow nodes', () => {
        expect(isAgentflowNode('startAgentflow')).toBe(true)
        expect(isAgentflowNode('llmAgentflow')).toBe(true)
        expect(isAgentflowNode('directReplyAgentflow')).toBe(true)
    })

    it('should return false for non-agentflow nodes', () => {
        expect(isAgentflowNode('randomNode')).toBe(false)
        expect(isAgentflowNode('')).toBe(false)
    })
})

describe('groupNodesByCategory', () => {
    it('should group nodes by their category', () => {
        const nodes = [makeNode('llmAgentflow', 'AI'), makeNode('agentAgentflow', 'AI'), makeNode('httpAgentflow', 'Utilities')]
        const grouped = groupNodesByCategory(nodes)
        expect(grouped['AI']).toHaveLength(2)
        expect(grouped['Utilities']).toHaveLength(1)
    })

    it('should use "Other" for nodes without a category', () => {
        const nodes = [makeNode('test')]
        nodes[0].category = undefined
        const grouped = groupNodesByCategory(nodes)
        expect(grouped['Other']).toHaveLength(1)
    })

    it('should return empty object for empty input', () => {
        expect(groupNodesByCategory([])).toEqual({})
    })
})
