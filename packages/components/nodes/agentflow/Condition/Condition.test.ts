const { nodeClass: Condition_Agentflow } = require('./Condition')
import { INodeData } from '../../../src/Interface'

// Helper function to create a valid INodeData object for Condition node
function createConditionNodeData(id: string, conditions: any[]): INodeData {
    return {
        id: id,
        label: 'Condition',
        name: 'conditionAgentflow',
        type: 'Condition',
        icon: 'condition.svg',
        version: 1.0,
        category: 'Agent Flows',
        baseClasses: ['Condition'],
        inputs: {
            conditions: conditions
        }
    }
}

describe('Condition Agentflow - Regex Operation', () => {
    let nodeClass: any

    beforeEach(() => {
        nodeClass = new Condition_Agentflow()
    })

    describe('Valid regex patterns', () => {
        it('should match when regex pattern matches value1', async () => {
            const conditions = [
                { type: 'string', value1: 'hello world', operation: 'regex', value2: 'hello' }
            ]
            const nodeData = createConditionNodeData('test-regex-1', conditions)
            const result = await nodeClass.run(nodeData, '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should not match when regex pattern does not match value1', async () => {
            const conditions = [
                { type: 'string', value1: 'hello world', operation: 'regex', value2: '^world' }
            ]
            const nodeData = createConditionNodeData('test-regex-2', conditions)
            const result = await nodeClass.run(nodeData, '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBeUndefined()
            expect(result.output.conditions[1].isFulfilled).toBe(true)
        })

        it('should match digits with [0-9]+ pattern', async () => {
            const conditions = [
                { type: 'string', value1: 'test123abc', operation: 'regex', value2: '[0-9]+' }
            ]
            const result = await nodeClass.run(createConditionNodeData('test-3', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should match email pattern', async () => {
            const conditions = [
                { type: 'string', value1: 'user@example.com', operation: 'regex', value2: '^[a-zA-Z0-9.]+@[a-zA-Z0-9.]+$' }
            ]
            const result = await nodeClass.run(createConditionNodeData('test-4', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })
    })

    describe('Invalid regex patterns', () => {
        it('should return false (not crash) for invalid regex pattern', async () => {
            const conditions = [
                { type: 'string', value1: 'test', operation: 'regex', value2: '[invalid(' }
            ]
            const result = await nodeClass.run(createConditionNodeData('test-invalid', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBeUndefined()
            expect(result.output.conditions[1].isFulfilled).toBe(true)
        })
    })

    describe('Edge cases', () => {
        it('should handle empty value1', async () => {
            const conditions = [
                { type: 'string', value1: '', operation: 'regex', value2: '.*' }
            ]
            const result = await nodeClass.run(createConditionNodeData('test-empty', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle null value1', async () => {
            const conditions = [
                { type: 'string', value1: null, operation: 'regex', value2: 'test' }
            ]
            const result = await nodeClass.run(createConditionNodeData('test-null', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBeUndefined()
            expect(result.output.conditions[1].isFulfilled).toBe(true)
        })

        it('should be case-sensitive by default', async () => {
            const conditions = [
                { type: 'string', value1: 'Hello', operation: 'regex', value2: 'hello' }
            ]
            const result = await nodeClass.run(createConditionNodeData('test-case', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBeUndefined()
            expect(result.output.conditions[1].isFulfilled).toBe(true)
        })
    })

    describe('Flowise input escaping', () => {
        it('should unescape brackets in pattern', async () => {
            const conditions = [
                { type: 'string', value1: 'test123abc', operation: 'regex', value2: '\\[0-9\\]+' }
            ]
            const result = await nodeClass.run(createConditionNodeData('test-brackets', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should unescape double-backslash pattern', async () => {
            const conditions = [
                { type: 'string', value1: 'test123abc', operation: 'regex', value2: '\\\\d+' }
            ]
            const result = await nodeClass.run(createConditionNodeData('test-backslash', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should unescape escaped asterisk', async () => {
            // User typed go*al, Flowise stored as go\*al
            const conditions = [
                { type: 'string', value1: 'goooal', operation: 'regex', value2: 'go\\*al' }
            ]
            const result = await nodeClass.run(createConditionNodeData('test-escaped-asterisk', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })
    })

    describe('Complex regex patterns - all metacharacters', () => {
        it('should handle ^ (start anchor)', async () => {
            const conditions = [{ type: 'string', value1: 'hello world', operation: 'regex', value2: '^hello' }]
            const result = await nodeClass.run(createConditionNodeData('test-caret', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle $ (end anchor)', async () => {
            const conditions = [{ type: 'string', value1: 'hello world', operation: 'regex', value2: 'world$' }]
            const result = await nodeClass.run(createConditionNodeData('test-dollar', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle . (any character)', async () => {
            const conditions = [{ type: 'string', value1: 'cat', operation: 'regex', value2: 'c.t' }]
            const result = await nodeClass.run(createConditionNodeData('test-dot', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle * (zero or more)', async () => {
            const conditions = [{ type: 'string', value1: 'goooal', operation: 'regex', value2: 'go*al' }]
            const result = await nodeClass.run(createConditionNodeData('test-star', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle + (one or more)', async () => {
            const conditions = [{ type: 'string', value1: 'goooal', operation: 'regex', value2: 'go+al' }]
            const result = await nodeClass.run(createConditionNodeData('test-plus', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle ? (zero or one)', async () => {
            const conditions = [{ type: 'string', value1: 'color', operation: 'regex', value2: 'colou?r' }]
            const result = await nodeClass.run(createConditionNodeData('test-question', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle | (alternation)', async () => {
            const conditions = [{ type: 'string', value1: 'cat', operation: 'regex', value2: 'cat|dog' }]
            const result = await nodeClass.run(createConditionNodeData('test-pipe', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle () (grouping)', async () => {
            const conditions = [{ type: 'string', value1: 'abcabc', operation: 'regex', value2: '(abc)+' }]
            const result = await nodeClass.run(createConditionNodeData('test-parens', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle {} (quantifier)', async () => {
            const conditions = [{ type: 'string', value1: 'aaa', operation: 'regex', value2: 'a{3}' }]
            const result = await nodeClass.run(createConditionNodeData('test-braces', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle complex email pattern', async () => {
            const conditions = [{
                type: 'string',
                value1: 'user@example.com',
                operation: 'regex',
                value2: '^[a-z]+@[a-z]+\\.(com|org)$'
            }]
            const result = await nodeClass.run(createConditionNodeData('test-complex', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle URL pattern', async () => {
            const conditions = [{
                type: 'string',
                value1: 'https://example.com/path?query=1',
                operation: 'regex',
                value2: '^https?://[a-z.]+/.*$'
            }]
            const result = await nodeClass.run(createConditionNodeData('test-url', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })

        it('should handle UUID pattern', async () => {
            const conditions = [{
                type: 'string',
                value1: '550e8400-e29b-41d4-a716-446655440000',
                operation: 'regex',
                value2: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            }]
            const result = await nodeClass.run(createConditionNodeData('test-uuid', conditions), '', { agentflowRuntime: { state: {} } })
            expect(result.output.conditions[0].isFulfilled).toBe(true)
        })
    })
})
