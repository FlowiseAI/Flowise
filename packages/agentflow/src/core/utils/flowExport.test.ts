import { makeFlowEdge, makeFlowNode } from '@test-utils/factories'

import { FlowEdge, FlowNode } from '../types'

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

    it('should preserve allowlisted node data fields', () => {
        const flowData = {
            nodes: [
                makeNode('a', {
                    data: {
                        id: 'a',
                        name: 'llm',
                        label: 'LLM',
                        version: 1,
                        type: 'Agent',
                        color: '#ff0000',
                        hideInput: false,
                        baseClasses: ['BaseLLM'],
                        category: 'Agent Flows',
                        description: 'An LLM node',
                        icon: 'llm.svg',
                        inputs: [{ id: 'i1', name: 'model', label: 'Model', type: 'string' }],
                        inputValues: { model: 'gpt-4' },
                        inputAnchors: [],
                        outputAnchors: [],
                        outputs: []
                    }
                })
            ],
            edges: []
        }
        const result = generateExportFlowData(flowData)
        const data = result.nodes[0].data
        expect(data.name).toBe('llm')
        expect(data.label).toBe('LLM')
        expect(data.version).toBe(1)
        expect(data.type).toBe('Agent')
        expect(data.color).toBe('#ff0000')
        expect(data.icon).toBe('llm.svg')
        expect(data.category).toBe('Agent Flows')
        expect(data.description).toBe('An LLM node')
        expect(data.inputValues).toEqual({ model: 'gpt-4' })
    })

    it('should strip runtime-only state from exported data', () => {
        const flowData = {
            nodes: [
                makeNode('a', {
                    data: {
                        id: 'a',
                        name: 'llm',
                        label: 'LLM',
                        status: 'FINISHED',
                        error: 'some error',
                        warning: 'some warning',
                        hint: 'a hint',
                        validationErrors: ['err1']
                    } as FlowNode['data']
                })
            ],
            edges: []
        }
        const result = generateExportFlowData(flowData)
        const data = result.nodes[0].data
        expect(data).not.toHaveProperty('status')
        expect(data).not.toHaveProperty('error')
        expect(data).not.toHaveProperty('warning')
        expect(data).not.toHaveProperty('hint')
        expect(data).not.toHaveProperty('validationErrors')
    })

    it('should strip password, file, and folder input values', () => {
        const flowData = {
            nodes: [
                makeNode('a', {
                    data: {
                        id: 'a',
                        name: 'llm',
                        label: 'LLM',
                        inputs: [
                            { id: 'i1', name: 'apiKey', label: 'API Key', type: 'password' },
                            { id: 'i2', name: 'upload', label: 'Upload', type: 'file' },
                            { id: 'i3', name: 'dir', label: 'Directory', type: 'folder' },
                            { id: 'i4', name: 'model', label: 'Model', type: 'string' }
                        ],
                        inputValues: {
                            apiKey: 'sk-secret',
                            upload: 'base64data',
                            dir: '/some/path',
                            model: 'gpt-4'
                        }
                    } as FlowNode['data']
                })
            ],
            edges: []
        }
        const result = generateExportFlowData(flowData)
        const values = result.nodes[0].data.inputValues!
        expect(values).not.toHaveProperty('apiKey')
        expect(values).not.toHaveProperty('upload')
        expect(values).not.toHaveProperty('dir')
        expect(values.model).toBe('gpt-4')
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
