import { makeFlowEdge, makeFlowNode } from '@test-utils/factories'

import type { FlowEdge, FlowNode } from '../types'

import { generateExportFlowData } from './flowExport'

const makeNode = (id: string, overrides?: Partial<FlowNode>) =>
    makeFlowNode(id, { selected: true, data: { id, name: 'testNode', label: 'Test' }, ...overrides })

const makeEdge = (source: string, target: string, overrides?: Partial<FlowEdge>) =>
    makeFlowEdge(source, target, { selected: true, ...overrides })

describe('generateExportFlowData', () => {
    it('should deselect all nodes and edges', () => {
        const flowData = {
            nodes: [makeNode('a'), makeNode('b')],
            edges: [makeEdge('a', 'b')]
        }
        const result = generateExportFlowData(flowData)
        result.nodes.forEach((n) => expect(n.selected).toBe(false))
        result.edges.forEach((e) => expect(e.selected).toBe(false))
    })

    it('should strip credential data from nodes', () => {
        const flowData = {
            nodes: [
                makeNode('a', {
                    data: { id: 'a', name: 'llm', label: 'LLM', credential: 'secret-credential-id' } as FlowNode['data']
                })
            ],
            edges: []
        }
        const result = generateExportFlowData(flowData)
        expect(result.nodes[0].data.credential).toBeUndefined()
    })

    it('should preserve other node data', () => {
        const flowData = {
            nodes: [
                makeNode('a', {
                    data: { id: 'a', name: 'llm', label: 'LLM', inputValues: { model: 'gpt-4' } }
                })
            ],
            edges: []
        }
        const result = generateExportFlowData(flowData)
        expect(result.nodes[0].data.name).toBe('llm')
        expect(result.nodes[0].data.inputValues).toEqual({ model: 'gpt-4' })
        expect(result.nodes[0].position).toEqual({ x: 0, y: 0 })
    })

    it('should not mutate the original flow data', () => {
        const original = {
            nodes: [makeNode('a')],
            edges: [makeEdge('a', 'b')]
        }
        generateExportFlowData(original)
        expect(original.nodes[0].selected).toBe(true)
        expect(original.edges[0].selected).toBe(true)
    })
})
