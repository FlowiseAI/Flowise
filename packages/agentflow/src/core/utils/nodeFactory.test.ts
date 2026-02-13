import type { NodeData } from '../types'

import { makeFlowNode, makeNodeData } from '@test-utils/factories'

import { getUniqueNodeId, getUniqueNodeLabel, initializeDefaultNodeData, initNode } from './nodeFactory'

const makeNode = (id: string, name: string, label: string) =>
    makeFlowNode(id, { data: { id, name, label } })

describe('getUniqueNodeId', () => {
    it('should return name_0 when no nodes exist', () => {
        const nodeData = { id: '', name: 'llmChain', label: 'LLM Chain' } as NodeData
        expect(getUniqueNodeId(nodeData, [])).toBe('llmChain_0')
    })

    it('should increment suffix when id already exists', () => {
        const nodeData = { id: '', name: 'llmChain', label: 'LLM Chain' } as NodeData
        const nodes = [makeNode('llmChain_0', 'llmChain', 'LLM Chain')]
        expect(getUniqueNodeId(nodeData, nodes)).toBe('llmChain_1')
    })

    it('should skip multiple existing ids', () => {
        const nodeData = { id: '', name: 'agent', label: 'Agent' } as NodeData
        const nodes = [makeNode('agent_0', 'agent', 'Agent'), makeNode('agent_1', 'agent', 'Agent'), makeNode('agent_2', 'agent', 'Agent')]
        expect(getUniqueNodeId(nodeData, nodes)).toBe('agent_3')
    })
})

describe('getUniqueNodeLabel', () => {
    it('should return original label for StickyNote type', () => {
        const nodeData = { id: '', name: 'stickyNote', label: 'Sticky Note', type: 'StickyNote' } as NodeData
        expect(getUniqueNodeLabel(nodeData, [])).toBe('Sticky Note')
    })

    it('should return original label for startAgentflow', () => {
        const nodeData = { id: '', name: 'startAgentflow', label: 'Start' } as NodeData
        expect(getUniqueNodeLabel(nodeData, [])).toBe('Start')
    })

    it('should return label with suffix 0 for new nodes', () => {
        const nodeData = { id: '', name: 'llmChain', label: 'LLM Chain' } as NodeData
        expect(getUniqueNodeLabel(nodeData, [])).toBe('LLM Chain 0')
    })

    it('should increment suffix based on existing node ids', () => {
        const nodeData = { id: '', name: 'llmChain', label: 'LLM Chain' } as NodeData
        const nodes = [makeNode('llmChain_0', 'llmChain', 'LLM Chain 0')]
        expect(getUniqueNodeLabel(nodeData, nodes)).toBe('LLM Chain 1')
    })
})

describe('initializeDefaultNodeData', () => {
    it('should return empty object for empty params', () => {
        expect(initializeDefaultNodeData([])).toEqual({})
    })

    it('should use default values when provided', () => {
        const params = [
            { name: 'temperature', default: 0.7 },
            { name: 'maxTokens', default: 1024 }
        ]
        expect(initializeDefaultNodeData(params)).toEqual({
            temperature: 0.7,
            maxTokens: 1024
        })
    })

    it('should use empty string when no default is provided', () => {
        const params = [{ name: 'apiKey' }, { name: 'model', default: 'gpt-4' }]
        expect(initializeDefaultNodeData(params)).toEqual({
            apiKey: '',
            model: 'gpt-4'
        })
    })
})

describe('initNode', () => {
    it('should set the new node id on the returned data', () => {
        const result = initNode(makeNodeData(), 'node_0')
        expect(result.id).toBe('node_0')
    })

    it('should classify whitelisted input types as inputParams', () => {
        const nodeData = makeNodeData({
            inputParams: [
                { id: '', name: 'temp', label: 'Temperature', type: 'number' },
                { id: '', name: 'model', label: 'Model', type: 'options', default: 'gpt-4' },
                { id: '', name: 'code', label: 'Code', type: 'code' }
            ] as NodeData['inputParams']
        })
        const result = initNode(nodeData, 'n1')
        expect(result.inputParams).toHaveLength(3)
        result.inputParams!.forEach((p) => {
            expect(p.id).toMatch(/^n1-input-/)
        })
    })

    it('should classify non-whitelisted input types as inputAnchors', () => {
        const nodeData = makeNodeData({
            inputParams: [
                { id: '', name: 'llm', label: 'LLM', type: 'BaseChatModel' },
                { id: '', name: 'memory', label: 'Memory', type: 'BaseMemory' }
            ] as NodeData['inputParams']
        })
        const result = initNode(nodeData, 'n1')
        expect(result.inputAnchors).toHaveLength(2)
        expect(result.inputParams).toHaveLength(0)
    })

    it('should split mixed input types between params and anchors', () => {
        const nodeData = makeNodeData({
            inputParams: [
                { id: '', name: 'temp', label: 'Temperature', type: 'number' },
                { id: '', name: 'llm', label: 'LLM', type: 'BaseChatModel' },
                { id: '', name: 'prompt', label: 'Prompt', type: 'string' }
            ] as NodeData['inputParams']
        })
        const result = initNode(nodeData, 'n1')
        expect(result.inputParams).toHaveLength(2)
        expect(result.inputAnchors).toHaveLength(1)
        expect(result.inputAnchors![0].name).toBe('llm')
    })

    it('should initialize default values for params', () => {
        const nodeData = makeNodeData({
            inputParams: [
                { id: '', name: 'temp', label: 'Temperature', type: 'number', default: 0.7 },
                { id: '', name: 'model', label: 'Model', type: 'string' }
            ] as NodeData['inputParams']
        })
        const result = initNode(nodeData, 'n1')
        expect(result.inputs!['temp']).toBe(0.7)
        // initNode only sets defaults for params with an explicit `default` value,
        // unlike initializeDefaultNodeData which falls back to ''. Params without
        // a default are intentionally omitted so the UI can distinguish "unset" from "empty".
        expect(result.inputs!['model']).toBeUndefined()
    })

    it('should preserve existing inputs over defaults', () => {
        const nodeData = makeNodeData({
            inputs: { temp: 0.9 },
            inputParams: [{ id: '', name: 'temp', label: 'Temperature', type: 'number', default: 0.7 }] as NodeData['inputParams']
        })
        const result = initNode(nodeData, 'n1')
        expect(result.inputs!['temp']).toBe(0.9)
    })

    it('should fall back to inputAnchors when inputParams is absent', () => {
        const nodeData = makeNodeData({
            inputAnchors: [{ id: '', name: 'llm', label: 'LLM', type: 'BaseChatModel' }] as NodeData['inputAnchors']
        })
        const result = initNode(nodeData, 'n1')
        expect(result.inputAnchors).toHaveLength(1)
        expect(result.inputAnchors![0].id).toBe('n1-input-llm-BaseChatModel')
    })

    // Output anchor tests (exercises createAgentFlowOutputs)
    it('should create a single default output anchor for agentflow nodes', () => {
        const result = initNode(makeNodeData({ name: 'llmAgentflow', label: 'LLM' }), 'n1')
        expect(result.outputAnchors).toHaveLength(1)
        expect(result.outputAnchors![0]).toEqual({
            id: 'n1-output-llmAgentflow',
            label: 'LLM',
            name: 'llmAgentflow'
        })
    })

    it('should create one output anchor per output entry', () => {
        const nodeData = makeNodeData({
            outputs: [
                { label: 'Out1', name: 'out1', type: 'string' },
                { label: 'Out2', name: 'out2', type: 'string' }
            ]
        })
        const result = initNode(nodeData, 'n1')
        expect(result.outputAnchors).toHaveLength(2)
        expect(result.outputAnchors![0].id).toBe('n1-output-0')
        expect(result.outputAnchors![1].id).toBe('n1-output-1')
    })

    it('should return empty outputAnchors when hideOutput is true', () => {
        const nodeData = makeNodeData({ hideOutput: true } as Partial<NodeData>)
        const result = initNode(nodeData, 'n1')
        expect(result.outputAnchors).toHaveLength(0)
    })

    it('should return empty outputAnchors when isAgentflow is false', () => {
        const result = initNode(makeNodeData(), 'n1', false)
        expect(result.outputAnchors).toHaveLength(0)
    })
})
