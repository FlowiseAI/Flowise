import { makeFlowNode, makeNodeDataSchema } from '@test-utils/factories'

import type { NodeData, NodeDataSchema } from '../types'

import { getUniqueNodeId, getUniqueNodeLabel, initNode, resolveNodeType } from './nodeFactory'

const makeNode = (id: string, name: string, label: string) => makeFlowNode(id, { data: { id, name, label } })

describe('resolveNodeType', () => {
    it('should resolve StickyNote type to stickyNote', () => {
        expect(resolveNodeType('StickyNote')).toBe('stickyNote')
    })

    it('should resolve Iteration type to iteration', () => {
        expect(resolveNodeType('Iteration')).toBe('iteration')
    })

    it('should default to agentflowNode for unknown types', () => {
        expect(resolveNodeType('UnknownType')).toBe('agentflowNode')
    })
})

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

describe('initNode', () => {
    it('should set the new node id on the returned data', () => {
        const result = initNode(makeNodeDataSchema(), 'node_0')
        expect(result.id).toBe('node_0')
    })

    it('should classify whitelisted input types as inputParams (definitions)', () => {
        const nodeData = makeNodeDataSchema({
            inputs: [
                { id: '', name: 'temp', label: 'Temperature', type: 'number' },
                { id: '', name: 'model', label: 'Model', type: 'options', default: 'gpt-4' },
                { id: '', name: 'code', label: 'Code', type: 'code' }
            ]
        })
        const result = initNode(nodeData, 'n1')
        expect(result.inputParams).toHaveLength(3)
        result.inputParams!.forEach((p) => {
            expect(p.id).toMatch(/^n1-input-/)
        })
    })

    it('should generate input param ids using newNodeId, name, and type', () => {
        const nodeData = makeNodeDataSchema({
            inputs: [
                { id: '', name: 'foo', label: 'Foo', type: 'string' },
                { id: '', name: 'bar', label: 'Bar', type: 'number' }
            ]
        })
        const result = initNode(nodeData, 'n1')
        expect(result.inputParams).toEqual([
            expect.objectContaining({ id: 'n1-input-foo-string' }),
            expect.objectContaining({ id: 'n1-input-bar-number' })
        ])
    })

    it('should classify non-whitelisted input types as inputAnchors', () => {
        const nodeData = makeNodeDataSchema({
            inputs: [
                { id: '', name: 'llm', label: 'LLM', type: 'BaseChatModel' },
                { id: '', name: 'memory', label: 'Memory', type: 'BaseMemory' }
            ]
        })
        const result = initNode(nodeData, 'n1')
        expect(result.inputAnchors).toHaveLength(2)
        expect(result.inputParams).toHaveLength(0)
    })

    it('should split mixed input types between params and anchors', () => {
        const nodeData = makeNodeDataSchema({
            inputs: [
                { id: '', name: 'temp', label: 'Temperature', type: 'number' },
                { id: '', name: 'llm', label: 'LLM', type: 'BaseChatModel' },
                { id: '', name: 'prompt', label: 'Prompt', type: 'string' }
            ]
        })
        const result = initNode(nodeData, 'n1')
        expect(result.inputParams).toHaveLength(2)
        expect(result.inputAnchors).toHaveLength(1)
        expect(result.inputAnchors![0].name).toBe('llm')
    })

    it('should initialize default values for params', () => {
        const nodeData = makeNodeDataSchema({
            inputs: [
                { id: '', name: 'temp', label: 'Temperature', type: 'number', default: 0.7 },
                { id: '', name: 'model', label: 'Model', type: 'string' }
            ]
        })
        const result = initNode(nodeData, 'n1')
        expect(result.inputs!['temp']).toBe(0.7)
        expect(result.inputs!['model']).toBe('')
    })

    it('should create a single default output anchor for agentflow nodes', () => {
        const result = initNode(makeNodeDataSchema({ name: 'llmAgentflow', label: 'LLM' }), 'n1')
        expect(result.outputAnchors).toHaveLength(1)
        expect(result.outputAnchors![0]).toEqual({
            id: 'n1-output-llmAgentflow',
            label: 'LLM',
            name: 'llmAgentflow'
        })
    })

    it('should create one output anchor per output entry', () => {
        const nodeData = makeNodeDataSchema({
            name: 'testNode',
            label: 'Test Node',
            outputs: [
                { label: 'Out1', name: 'out1', type: 'string' },
                { label: 'Out2', name: 'out2', type: 'string' }
            ]
        })
        const result = initNode(nodeData, 'n1')
        expect(result.outputAnchors).toHaveLength(2)
        expect(result.outputAnchors![0]).toEqual({
            id: 'n1-output-0',
            label: 'Test Node',
            name: 'testNode'
        })
        expect(result.outputAnchors![1]).toEqual({
            id: 'n1-output-1',
            label: 'Test Node',
            name: 'testNode'
        })
    })

    it('should return empty outputAnchors when hideOutput is true', () => {
        const nodeData = makeNodeDataSchema({ hideOutput: true } as Partial<NodeDataSchema>)
        const result = initNode(nodeData, 'n1')
        expect(result.outputAnchors).toHaveLength(0)
    })

    it('should return empty outputAnchors when isAgentflow is false', () => {
        const result = initNode(makeNodeDataSchema(), 'n1', false)
        expect(result.outputAnchors).toHaveLength(0)
    })

    it('should prepend credential param when node has credential property', () => {
        const nodeData: Partial<NodeDataSchema> = {
            name: 'testNode',
            label: 'Test',
            inputs: [{ id: '', name: 'temperature', label: 'Temperature', type: 'number', default: 0.9 }],
            credential: {
                label: 'AWS Credential',
                type: 'credential',
                credentialNames: ['awsApi'],
                optional: true
            }
        }
        const nodeDataSchema = makeNodeDataSchema(nodeData)

        const result = initNode(nodeDataSchema, 'n1', false)

        expect(result.inputParams).toHaveLength(2)
        expect(result.inputParams![0]).toEqual(
            expect.objectContaining({
                name: 'FLOWISE_CREDENTIAL_ID',
                label: 'AWS Credential',
                type: 'credential',
                credentialNames: ['awsApi']
            })
        )
        expect(result.inputParams![1].name).toBe('temperature')
        expect(result.inputs!['FLOWISE_CREDENTIAL_ID']).toBe('')
    })

    it('should not add credential param when node has no credential property', () => {
        const nodeData = makeNodeDataSchema({
            inputs: [{ id: '', name: 'temperature', label: 'Temperature', type: 'number' }]
        })
        const result = initNode(nodeData, 'n1', false)
        expect(result.inputParams).toHaveLength(1)
        expect(result.inputParams![0].name).toBe('temperature')
    })

    it('should not add credential param when credentialNames is empty', () => {
        const nodeData = makeNodeDataSchema({
            inputs: [{ id: '', name: 'temperature', label: 'Temperature', type: 'number' }],
            credential: {
                label: 'Credential',
                type: 'credential',
                credentialNames: []
            }
        })

        const result = initNode(nodeData, 'n1', false)
        expect(result.inputParams).toHaveLength(1)
        expect(result.inputParams![0].name).toBe('temperature')
    })

    it('should not prepend credential param when credential is a string ID (runtime selection)', () => {
        const nodeData = makeNodeDataSchema({
            inputs: [{ id: '', name: 'temperature', label: 'Temperature', type: 'number' }],
            credential: 'some-credential-id'
        })

        const result = initNode(nodeData, 'n1', false)
        expect(result.inputParams).toHaveLength(1)
        expect(result.inputParams![0].name).toBe('temperature')
    })

    it('should strip server-only metadata like filePath from node data', () => {
        const nodeData = makeNodeDataSchema({
            filePath: '/some/server/path/Agent.js',
            badge: 'NEW',
            author: 'Flowise',
            documentation: 'https://docs.example.com',
            tags: ['LLM', 'OpenAI'],
            loadMethods: { listModels: () => Promise.resolve([]) }
        } as Partial<NodeDataSchema>)
        const result = initNode(nodeData, 'n1')
        expect(result).not.toHaveProperty('filePath')
        expect(result).not.toHaveProperty('author')
        expect(result).not.toHaveProperty('loadMethods')
        expect(result.badge).toBe('NEW')
        expect(result.tags).toEqual(['LLM', 'OpenAI'])
        expect(result.documentation).toBe('https://docs.example.com')
    })

    it('should strip runtime-only state from node data', () => {
        const nodeData = makeNodeDataSchema({
            status: 'FINISHED',
            error: 'some error',
            warning: 'some warning',
            hint: 'some hint',
            validationErrors: ['error1'],
            selected: true
        } as Partial<NodeDataSchema>)
        const result = initNode(nodeData, 'n1')
        expect(result).not.toHaveProperty('status')
        expect(result).not.toHaveProperty('error')
        expect(result).not.toHaveProperty('warning')
        expect(result).not.toHaveProperty('hint')
        expect(result).not.toHaveProperty('validationErrors')
        expect(result).not.toHaveProperty('selected')
    })

    it('should generate dynamic outputAnchors for conditionAgentflow nodes', () => {
        const conditionNodeData = makeNodeDataSchema({
            name: 'conditionAgentflow',
            label: 'Condition',
            inputs: [
                {
                    id: 'conditions',
                    name: 'conditions',
                    label: 'Conditions',
                    type: 'array',
                    default: [{ type: 'string', value1: '', operation: 'equal', value2: '' }],
                    array: [{ id: 'type', name: 'type', label: 'Type', type: 'options' }]
                }
            ],
            outputs: [
                { label: '0', name: '0', type: 'Condition' },
                { label: '1', name: '1', type: 'Condition' }
            ]
        })

        const result = initNode(conditionNodeData, 'conditionAgentflow_0')

        expect(result.outputAnchors).toHaveLength(2)
        expect(result.outputAnchors![0]).toEqual(
            expect.objectContaining({ id: 'conditionAgentflow_0-output-0', name: '0', label: '0', description: 'Condition 0' })
        )
        expect(result.outputAnchors![1]).toEqual(
            expect.objectContaining({ id: 'conditionAgentflow_0-output-1', name: '1', label: '1', description: 'Else' })
        )
    })

    it('should generate dynamic outputAnchors for conditionAgentAgentflow nodes', () => {
        const conditionAgentNodeData = makeNodeDataSchema({
            name: 'conditionAgentAgentflow',
            label: 'Condition Agent',
            inputs: [
                {
                    id: 'conditionAgentScenarios',
                    name: 'conditionAgentScenarios',
                    label: 'Scenarios',
                    type: 'array',
                    default: [{ scenario: '' }, { scenario: '' }],
                    array: [{ id: 'scenario', name: 'scenario', label: 'Scenario', type: 'string' }]
                }
            ],
            outputs: [
                { label: '0', name: '0', type: 'output' },
                { label: '1', name: '1', type: 'output' }
            ]
        })

        const result = initNode(conditionAgentNodeData, 'conditionAgentAgentflow_0')

        expect(result.outputAnchors).toHaveLength(2)
        expect(result.outputAnchors![0]).toEqual(
            expect.objectContaining({ id: 'conditionAgentAgentflow_0-output-0', name: '0', label: '0', description: 'Scenario 0' })
        )
        expect(result.outputAnchors![1]).toEqual(
            expect.objectContaining({ id: 'conditionAgentAgentflow_0-output-1', name: '1', label: '1', description: 'Scenario 1' })
        )
    })
})
