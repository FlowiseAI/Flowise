const { nodeClass: JSONPathExtractor_Tools } = require('./JSONPathExtractor')
import { INodeData } from '../../../src/Interface'

// Mock the getBaseClasses function
jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn(() => ['Tool', 'StructuredTool'])
}))

// Helper function to create a valid INodeData object
function createNodeData(id: string, inputs: any): INodeData {
    return {
        id: id,
        label: 'JSON Path Extractor',
        name: 'jsonPathExtractor',
        type: 'JSONPathExtractor',
        icon: 'jsonpathextractor.svg',
        version: 1.0,
        category: 'Tools',
        baseClasses: ['JSONPathExtractor', 'Tool'],
        inputs: inputs
    }
}

describe('JSONPathExtractor', () => {
    let nodeClass: any

    beforeEach(() => {
        nodeClass = new JSONPathExtractor_Tools()
    })

    describe('Tool Initialization', () => {
        it('should throw error when path is not provided', async () => {
            const nodeData = createNodeData('test-node-1', {
                path: ''
            })

            await expect(nodeClass.init(nodeData, '')).rejects.toThrow('JSON Path is required')
        })

        it('should initialize tool with path and default returnNullOnError', async () => {
            const nodeData = createNodeData('test-node-2', {
                path: 'data.value'
            })

            const tool = await nodeClass.init(nodeData, '')
            expect(tool).toBeDefined()
            expect(tool.name).toBe('json_path_extractor')
        })

        it('should initialize tool with custom returnNullOnError', async () => {
            const nodeData = createNodeData('test-node-3', {
                path: 'data.value',
                returnNullOnError: true
            })

            const tool = await nodeClass.init(nodeData, '')
            expect(tool).toBeDefined()
        })
    })

    describe('JSONPathExtractorTool Functionality', () => {
        describe('Positive test cases - Path extraction', () => {
            const successCases = [
                {
                    name: 'simple path from object',
                    path: 'data.value',
                    input: { data: { value: 'test' } },
                    expected: 'test'
                },
                {
                    name: 'nested path from object',
                    path: 'user.profile.name',
                    input: { user: { profile: { name: 'John' } } },
                    expected: 'John'
                },
                {
                    name: 'array index access',
                    path: 'items[0].name',
                    input: { items: [{ name: 'first' }, { name: 'second' }] },
                    expected: 'first'
                },
                {
                    name: 'multi-dimensional array',
                    path: 'matrix[0][1]',
                    input: {
                        matrix: [
                            ['a', 'b'],
                            ['c', 'd']
                        ]
                    },
                    expected: 'b'
                },
                {
                    name: 'object return (stringified)',
                    path: 'data',
                    input: { data: { nested: 'object' } },
                    expected: '{"nested":"object"}'
                },
                {
                    name: 'array return (stringified)',
                    path: 'tags',
                    input: { tags: ['a', 'b', 'c'] },
                    expected: '["a","b","c"]'
                },
                {
                    name: 'deep nesting',
                    path: 'a.b.c.d.e',
                    input: { a: { b: { c: { d: { e: 'deep' } } } } },
                    expected: 'deep'
                },
                {
                    name: 'array at root with index',
                    path: '[1]',
                    input: ['first', 'second', 'third'],
                    expected: 'second'
                }
            ]

            test.each(successCases)('should extract $name', async ({ path, input, expected }) => {
                const nodeData = createNodeData(`test-node-${path}`, {
                    path: path,
                    returnNullOnError: false
                })
                const tool = await nodeClass.init(nodeData, '')
                const result = await tool._call({ json: input })
                expect(result).toBe(expected)
            })
        })

        describe('Primitive value handling', () => {
            const primitiveTests = [
                { name: 'string', path: 'val', input: { val: 'text' }, expected: 'text' },
                { name: 'number', path: 'val', input: { val: 42 }, expected: '42' },
                { name: 'zero', path: 'val', input: { val: 0 }, expected: '0' },
                { name: 'boolean true', path: 'val', input: { val: true }, expected: 'true' },
                { name: 'boolean false', path: 'val', input: { val: false }, expected: 'false' },
                { name: 'null', path: 'val', input: { val: null }, expected: 'null' },
                { name: 'empty string', path: 'val', input: { val: '' }, expected: '' }
            ]

            test.each(primitiveTests)('should handle $name value', async ({ path, input, expected }) => {
                const nodeData = createNodeData(`test-primitive`, {
                    path: path,
                    returnNullOnError: false
                })
                const tool = await nodeClass.init(nodeData, '')
                const result = await tool._call({ json: input })
                expect(result).toBe(expected)
            })
        })

        describe('Special characters in keys', () => {
            const specialCharTests = [
                { name: 'dashes', path: 'data.key-with-dash', input: { data: { 'key-with-dash': 'value' } } },
                { name: 'spaces', path: 'data.key with spaces', input: { data: { 'key with spaces': 'value' } } },
                { name: 'unicode', path: 'data.emoji🔑', input: { data: { 'emoji🔑': 'value' } } },
                { name: 'numeric strings', path: 'data.123', input: { data: { '123': 'value' } } }
            ]

            test.each(specialCharTests)('should handle $name in keys', async ({ path, input }) => {
                const nodeData = createNodeData(`test-special`, {
                    path: path,
                    returnNullOnError: false
                })
                const tool = await nodeClass.init(nodeData, '')
                const result = await tool._call({ json: input })
                expect(result).toBe('value')
            })
        })

        describe('Error handling - throw mode', () => {
            const errorCases = [
                {
                    name: 'path not found',
                    path: 'data.value',
                    input: { data: { other: 'value' } },
                    errorPattern: /Path "data.value" not found in JSON/
                },
                {
                    name: 'invalid JSON string',
                    path: 'data',
                    input: 'invalid json',
                    errorPattern: /Invalid JSON string/
                },
                {
                    name: 'array index on object',
                    path: 'data[0]',
                    input: { data: { key: 'value' } },
                    errorPattern: /Path "data\[0\]" not found in JSON/
                },
                {
                    name: 'out of bounds array',
                    path: 'items[10]',
                    input: { items: ['a', 'b'] },
                    errorPattern: /Path "items\[10\]" not found in JSON/
                }
            ]

            test.each(errorCases)('should throw error for $name', async ({ path, input, errorPattern }) => {
                const nodeData = createNodeData(`test-error`, {
                    path: path,
                    returnNullOnError: false
                })
                const tool = await nodeClass.init(nodeData, '')
                await expect(tool._call({ json: input })).rejects.toThrow(errorPattern)
            })
        })

        describe('Error handling - null mode', () => {
            const nullCases = [
                { name: 'path not found', path: 'missing.path', input: { data: 'value' } },
                { name: 'invalid JSON string', path: 'data', input: 'invalid json' },
                { name: 'null in path', path: 'data.nested.value', input: { data: { nested: null } } },
                { name: 'empty array access', path: 'items[0]', input: { items: [] } },
                { name: 'property on primitive', path: 'value.nested', input: { value: 'string' } }
            ]

            test.each(nullCases)('should return null for $name', async ({ path, input }) => {
                const nodeData = createNodeData(`test-null`, {
                    path: path,
                    returnNullOnError: true
                })
                const tool = await nodeClass.init(nodeData, '')
                const result = await tool._call({ json: input })
                expect(result).toBe('null')
            })

            it('should still extract valid paths when returnNullOnError is true', async () => {
                const nodeData = createNodeData('test-valid-null-mode', {
                    path: 'data.value',
                    returnNullOnError: true
                })
                const tool = await nodeClass.init(nodeData, '')
                const result = await tool._call({
                    json: { data: { value: 'test' } }
                })
                expect(result).toBe('test')
            })
        })

        describe('Complex structures', () => {
            it('should handle deeply nested arrays and objects', async () => {
                const nodeData = createNodeData('test-complex', {
                    path: 'users[0].addresses[1].city',
                    returnNullOnError: false
                })
                const tool = await nodeClass.init(nodeData, '')
                const result = await tool._call({
                    json: {
                        users: [
                            {
                                addresses: [{ city: 'New York' }, { city: 'Los Angeles' }]
                            }
                        ]
                    }
                })
                expect(result).toBe('Los Angeles')
            })
        })
    })
})
