import { filterNodeByClient } from './index'
import type { INode } from 'flowise-components'

const makeNode = (overrides: Partial<INode> = {}): INode =>
    ({
        name: 'startAgentflow',
        label: 'Start',
        type: 'Start',
        icon: '',
        version: 1,
        category: 'Agent Flows',
        baseClasses: ['Start'],
        inputs: [],
        ...overrides
    } as INode)

describe('filterNodeByClient', () => {
    describe('when no client is provided', () => {
        it('returns the node unchanged', () => {
            const node = makeNode({
                inputs: [
                    { label: 'Input Type', name: 'startInputType', type: 'options', client: ['agentflowv2'] },
                    { label: 'Ephemeral Memory', name: 'startEphemeralMemory', type: 'boolean' }
                ]
            })
            const result = filterNodeByClient(node)
            expect(result.inputs).toHaveLength(2)
        })
    })

    describe('when client is agentflowsdk', () => {
        it('removes params scoped to agentflowv2 only', () => {
            const node = makeNode({
                inputs: [
                    { label: 'Webhook Trigger', name: 'webhookTrigger', type: 'string', client: ['agentflowv2'] },
                    { label: 'Ephemeral Memory', name: 'startEphemeralMemory', type: 'boolean' }
                ]
            })
            const result = filterNodeByClient(node, 'agentflowsdk')
            expect(result.inputs).toHaveLength(1)
            expect(result.inputs![0].name).toBe('startEphemeralMemory')
        })

        it('keeps params with no client restriction', () => {
            const node = makeNode({
                inputs: [
                    { label: 'Chat Input', name: 'chatInput', type: 'string' },
                    { label: 'Form Input', name: 'formInput', type: 'string' }
                ]
            })
            const result = filterNodeByClient(node, 'agentflowsdk')
            expect(result.inputs).toHaveLength(2)
        })

        it('keeps params scoped to agentflowsdk', () => {
            const node = makeNode({
                inputs: [{ label: 'SDK Only', name: 'sdkOnly', type: 'string', client: ['agentflowsdk'] }]
            })
            const result = filterNodeByClient(node, 'agentflowsdk')
            expect(result.inputs).toHaveLength(1)
        })

        it('filters options inside a param scoped to agentflowv2 only', () => {
            const node = makeNode({
                inputs: [
                    {
                        label: 'Input Type',
                        name: 'startInputType',
                        type: 'options',
                        options: [
                            { label: 'Chat Input', name: 'chatInput' },
                            { label: 'Webhook Trigger', name: 'webhookTrigger', client: ['agentflowv2'] }
                        ]
                    }
                ]
            })
            const result = filterNodeByClient(node, 'agentflowsdk')
            expect(result.inputs![0].options).toHaveLength(1)
            expect(result.inputs![0].options![0]).toMatchObject({ name: 'chatInput' })
        })
    })

    describe('when client is agentflowv2', () => {
        it('removes params scoped to agentflowsdk only', () => {
            const node = makeNode({
                inputs: [
                    { label: 'SDK Only', name: 'sdkOnly', type: 'string', client: ['agentflowsdk'] },
                    { label: 'Ephemeral Memory', name: 'startEphemeralMemory', type: 'boolean' }
                ]
            })
            const result = filterNodeByClient(node, 'agentflowv2')
            expect(result.inputs).toHaveLength(1)
            expect(result.inputs![0].name).toBe('startEphemeralMemory')
        })

        it('keeps params scoped to agentflowv2', () => {
            const node = makeNode({
                inputs: [{ label: 'Webhook URL', name: 'webhookURL', type: 'string', client: ['agentflowv2'] }]
            })
            const result = filterNodeByClient(node, 'agentflowv2')
            expect(result.inputs).toHaveLength(1)
        })
    })

    describe('when node has no inputs', () => {
        it('returns the node unchanged', () => {
            const node = makeNode({ inputs: undefined })
            const result = filterNodeByClient(node, 'agentflowsdk')
            expect(result.inputs).toBeUndefined()
        })
    })

    describe('nested tabs filtering', () => {
        it('removes tab params scoped to agentflowv2 only', () => {
            const node = makeNode({
                inputs: [
                    {
                        label: 'Settings',
                        name: 'settings',
                        type: 'tabs',
                        tabs: [
                            { label: 'Shared Tab', name: 'sharedTab', type: 'string' },
                            { label: 'Canvas Only Tab', name: 'canvasTab', type: 'string', client: ['agentflowv2'] }
                        ]
                    }
                ]
            })
            const result = filterNodeByClient(node, 'agentflowsdk')
            expect(result.inputs![0].tabs).toHaveLength(1)
            expect(result.inputs![0].tabs![0].name).toBe('sharedTab')
        })

        it('recurses into nested tabs', () => {
            const node = makeNode({
                inputs: [
                    {
                        label: 'Outer',
                        name: 'outer',
                        type: 'tabs',
                        tabs: [
                            {
                                label: 'Inner',
                                name: 'inner',
                                type: 'tabs',
                                tabs: [
                                    { label: 'Shared', name: 'shared', type: 'string' },
                                    { label: 'Canvas Only', name: 'canvasOnly', type: 'string', client: ['agentflowv2'] }
                                ]
                            }
                        ]
                    }
                ]
            })
            const result = filterNodeByClient(node, 'agentflowsdk')
            expect(result.inputs![0].tabs![0].tabs).toHaveLength(1)
            expect(result.inputs![0].tabs![0].tabs![0].name).toBe('shared')
        })
    })

    describe('nested array filtering', () => {
        it('removes array sub-params scoped to agentflowv2 only', () => {
            const node = makeNode({
                inputs: [
                    {
                        label: 'Headers',
                        name: 'headers',
                        type: 'array',
                        array: [
                            { label: 'Key', name: 'key', type: 'string' },
                            { label: 'Canvas Only Field', name: 'canvasField', type: 'string', client: ['agentflowv2'] }
                        ]
                    }
                ]
            })
            const result = filterNodeByClient(node, 'agentflowsdk')
            expect(result.inputs![0].array).toHaveLength(1)
            expect(result.inputs![0].array![0].name).toBe('key')
        })
    })

    describe('immutability', () => {
        it('does not mutate the original node', () => {
            const node = makeNode({
                inputs: [
                    { label: 'Webhook Trigger', name: 'webhookTrigger', type: 'string', client: ['agentflowv2'] },
                    { label: 'Ephemeral Memory', name: 'startEphemeralMemory', type: 'boolean' }
                ]
            })
            const result = filterNodeByClient(node, 'agentflowsdk')
            expect(node.inputs).toHaveLength(2)
            expect(result.inputs).toHaveLength(1)
        })
    })
})
