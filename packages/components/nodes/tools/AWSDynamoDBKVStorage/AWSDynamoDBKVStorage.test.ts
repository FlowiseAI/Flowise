// Mock AWS SDK DynamoDB client
jest.mock('@aws-sdk/client-dynamodb', () => {
    const mockSend = jest.fn()

    // Create mock constructors that capture inputs
    const PutItemCommandMock = jest.fn((input) => ({ input, _type: 'PutItemCommand' }))
    const QueryCommandMock = jest.fn((input) => ({ input, _type: 'QueryCommand' }))

    return {
        DynamoDBClient: jest.fn().mockImplementation(() => ({
            send: mockSend
        })),
        DescribeTableCommand: jest.fn(),
        ListTablesCommand: jest.fn(),
        PutItemCommand: PutItemCommandMock,
        QueryCommand: QueryCommandMock,
        __mockSend: mockSend
    }
})

// Mock AWS credentials utility
jest.mock('../../../src/awsToolsUtils', () => ({
    AWS_REGIONS: [
        { label: 'US East (N. Virginia)', name: 'us-east-1' },
        { label: 'US West (Oregon)', name: 'us-west-2' }
    ],
    DEFAULT_AWS_REGION: 'us-east-1',
    getAWSCredentials: jest.fn(() =>
        Promise.resolve({
            accessKeyId: 'test-access-key',
            secretAccessKey: 'test-secret-key',
            sessionToken: 'test-session-token'
        })
    )
}))

// Mock getBaseClasses function
jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn(() => ['Tool', 'StructuredTool'])
}))

describe('AWSDynamoDBKVStorage', () => {
    let AWSDynamoDBKVStorage_Tools: any
    let mockSend: jest.Mock
    let PutItemCommandMock: jest.Mock
    let QueryCommandMock: jest.Mock

    // Helper function to create a node instance
    const createNode = () => new AWSDynamoDBKVStorage_Tools()

    // Helper function to create nodeData
    const createNodeData = (overrides = {}) => ({
        inputs: {
            region: 'us-east-1',
            tableName: 'test-table',
            keyPrefix: '',
            operation: 'store',
            ...overrides
        }
    })

    beforeEach(async () => {
        // Clear all mocks before each test
        jest.clearAllMocks()

        // Get the mock functions
        const dynamoDBModule = require('@aws-sdk/client-dynamodb')
        mockSend = dynamoDBModule.__mockSend
        PutItemCommandMock = dynamoDBModule.PutItemCommand
        QueryCommandMock = dynamoDBModule.QueryCommand

        mockSend.mockReset()
        PutItemCommandMock.mockClear()
        QueryCommandMock.mockClear()

        // Dynamic import to get fresh module instance
        const module = (await import('./AWSDynamoDBKVStorage')) as any
        AWSDynamoDBKVStorage_Tools = module.nodeClass
    })

    describe('AWSDynamoDBKVStorage_Tools Node', () => {
        it('should have correct input parameters', () => {
            const node = createNode()
            const inputNames = node.inputs.map((input: any) => input.name)

            expect(inputNames).toEqual(['region', 'tableName', 'keyPrefix', 'operation'])
        })
    })

    describe('loadMethods - listTables', () => {
        it('should list valid DynamoDB tables with correct schema', async () => {
            const node = createNode()

            // Mock responses for list and describe commands
            mockSend
                .mockResolvedValueOnce({
                    TableNames: ['table1', 'table2', 'invalid-table']
                })
                .mockResolvedValueOnce({
                    Table: {
                        KeySchema: [
                            { AttributeName: 'pk', KeyType: 'HASH' },
                            { AttributeName: 'sk', KeyType: 'RANGE' }
                        ]
                    }
                })
                .mockResolvedValueOnce({
                    Table: {
                        KeySchema: [
                            { AttributeName: 'pk', KeyType: 'HASH' },
                            { AttributeName: 'sk', KeyType: 'RANGE' }
                        ]
                    }
                })
                .mockResolvedValueOnce({
                    Table: {
                        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }]
                    }
                })

            const nodeData = { inputs: { region: 'us-east-1' } }

            const result = await node.loadMethods.listTables(nodeData, {})

            expect(result).toEqual([
                {
                    label: 'table1',
                    name: 'table1',
                    description: 'Table with pk (partition) and sk (sort) keys'
                },
                {
                    label: 'table2',
                    name: 'table2',
                    description: 'Table with pk (partition) and sk (sort) keys'
                }
            ])
        })

        it('should return error when no tables found', async () => {
            const node = createNode()

            mockSend.mockResolvedValueOnce({
                TableNames: []
            })

            const nodeData = { inputs: { region: 'us-east-1' } }

            const result = await node.loadMethods.listTables(nodeData, {})

            expect(result).toEqual([
                {
                    label: 'No tables found',
                    name: 'error',
                    description: 'No DynamoDB tables found in this region'
                }
            ])
        })

        it('should return error when no compatible tables found', async () => {
            const node = createNode()

            mockSend
                .mockResolvedValueOnce({
                    TableNames: ['invalid-table']
                })
                .mockResolvedValueOnce({
                    Table: {
                        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }]
                    }
                })

            const nodeData = { inputs: { region: 'us-east-1' } }

            const result = await node.loadMethods.listTables(nodeData, {})

            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({
                label: 'No compatible tables found',
                name: 'error'
            })
            expect(result[0].description).toContain('Found 1 table(s) with different schema')
        })

        it('should handle AWS credentials error', async () => {
            const node = createNode()
            const { getAWSCredentials } = require('../../../src/awsToolsUtils')

            getAWSCredentials.mockRejectedValueOnce(new Error('AWS Access Key not found'))

            const nodeData = { inputs: { region: 'us-east-1' } }

            const result = await node.loadMethods.listTables(nodeData, {})

            expect(result).toEqual([
                {
                    label: 'AWS Credentials Required',
                    name: 'error',
                    description: 'Enter AWS Access Key ID and Secret Access Key'
                }
            ])
        })
    })

    describe('init method', () => {
        it.each([
            ['store', 'test-prefix', 'dynamodb_kv_store', 'Store a text value with a key in DynamoDB'],
            ['retrieve', '', 'dynamodb_kv_retrieve', 'Retrieve a value by key from DynamoDB']
        ])('should create correct tool for %s operation', async (operation, keyPrefix, expectedName, expectedDescription) => {
            const node = createNode()
            const nodeData = createNodeData({ keyPrefix, operation })

            const tool = await node.init(nodeData, '', {})

            expect(tool.name).toBe(expectedName)
            expect(tool.description).toContain(expectedDescription)
        })

        it.each([
            ['error', '', 'Valid DynamoDB Table selection is required'],
            ['test-table', 'prefix#invalid', 'Key prefix cannot contain "#" character']
        ])('should throw error for invalid config (table: %s, prefix: %s)', async (tableName, keyPrefix, expectedError) => {
            const node = createNode()
            const nodeData = createNodeData({ tableName, keyPrefix })

            await expect(node.init(nodeData, '', {})).rejects.toThrow(expectedError)
        })
    })

    describe('DynamoDBStoreTool', () => {
        it('should store value successfully', async () => {
            const node = createNode()

            mockSend.mockResolvedValueOnce({})

            const nodeData = createNodeData({ keyPrefix: 'test' })

            const tool = await node.init(nodeData, '', {})
            const result = await tool._call({ key: 'mykey', value: 'myvalue' })

            expect(result).toContain('Successfully stored value with key "mykey"')
            expect(mockSend).toHaveBeenCalledTimes(1)

            // Verify PutItemCommand was called with correct parameters
            expect(PutItemCommandMock).toHaveBeenCalledTimes(1)
            const putCommandInput = PutItemCommandMock.mock.calls[0][0]

            expect(putCommandInput).toMatchObject({
                TableName: 'test-table',
                Item: {
                    pk: { S: 'test#mykey' },
                    value: { S: 'myvalue' }
                }
            })

            // Verify timestamp fields exist
            expect(putCommandInput.Item.sk).toBeDefined()
            expect(putCommandInput.Item.timestamp).toBeDefined()
        })

        it.each([
            ['', 'Key must be a non-empty string'],
            ['   ', 'Key must be a non-empty string'],
            ['a'.repeat(2049), 'Key too long']
        ])('should handle invalid key: "%s"', async (key, expectedError) => {
            const node = createNode()

            const nodeData = createNodeData()

            const tool = await node.init(nodeData, '', {})
            await expect(tool._call({ key, value: 'myvalue' })).rejects.toThrow(expectedError)
        })

        it.each([
            ['store', { key: 'mykey', value: 'myvalue' }, 'Failed to store value: DynamoDB error'],
            ['retrieve', { key: 'mykey' }, 'Failed to retrieve value: DynamoDB error']
        ])('should handle DynamoDB error for %s', async (operation, callParams, expectedError) => {
            const node = createNode()
            mockSend.mockRejectedValueOnce(new Error('DynamoDB error'))

            const nodeData = createNodeData({ operation })
            const tool = await node.init(nodeData, '', {})

            await expect(tool._call(callParams)).rejects.toThrow(expectedError)
        })
    })

    describe('DynamoDBRetrieveTool', () => {
        it('should retrieve latest value successfully', async () => {
            const node = createNode()

            mockSend.mockResolvedValueOnce({
                Items: [
                    {
                        pk: { S: 'test#mykey' },
                        sk: { S: '1234567890' },
                        value: { S: 'myvalue' },
                        timestamp: { S: '2024-01-01T00:00:00.000Z' }
                    }
                ]
            })

            const nodeData = createNodeData({ keyPrefix: 'test', operation: 'retrieve' })

            const tool = await node.init(nodeData, '', {})
            const result = await tool._call({ key: 'mykey' })
            const parsed = JSON.parse(result)

            expect(parsed).toEqual({
                value: 'myvalue',
                timestamp: '2024-01-01T00:00:00.000Z'
            })
            expect(mockSend).toHaveBeenCalledTimes(1)

            // Verify QueryCommand was called with correct parameters
            expect(QueryCommandMock).toHaveBeenCalledTimes(1)
            const queryCommandInput = QueryCommandMock.mock.calls[0][0]

            expect(queryCommandInput).toMatchObject({
                TableName: 'test-table',
                KeyConditionExpression: 'pk = :pk',
                ExpressionAttributeValues: {
                    ':pk': { S: 'test#mykey' }
                },
                ScanIndexForward: false,
                Limit: 1
            })
        })

        it('should retrieve nth latest value', async () => {
            const node = createNode()

            mockSend.mockResolvedValueOnce({
                Items: [
                    {
                        pk: { S: 'mykey' },
                        sk: { S: '1234567892' },
                        value: { S: 'newest' },
                        timestamp: { S: '2024-01-03T00:00:00.000Z' }
                    },
                    {
                        pk: { S: 'mykey' },
                        sk: { S: '1234567891' },
                        value: { S: 'second' },
                        timestamp: { S: '2024-01-02T00:00:00.000Z' }
                    },
                    {
                        pk: { S: 'mykey' },
                        sk: { S: '1234567890' },
                        value: { S: 'oldest' },
                        timestamp: { S: '2024-01-01T00:00:00.000Z' }
                    }
                ]
            })

            const nodeData = createNodeData({ operation: 'retrieve' })

            const tool = await node.init(nodeData, '', {})
            const result = await tool._call({ key: 'mykey', nthLatest: '2' })
            const parsed = JSON.parse(result)

            expect(parsed).toEqual({
                value: 'second',
                timestamp: '2024-01-02T00:00:00.000Z'
            })

            // Verify QueryCommand was called with Limit: 2
            expect(QueryCommandMock).toHaveBeenCalledTimes(1)
            const queryCommandInput = QueryCommandMock.mock.calls[0][0]
            expect(queryCommandInput.Limit).toBe(2)
        })

        it('should return null when key not found', async () => {
            const node = createNode()

            mockSend.mockResolvedValueOnce({
                Items: []
            })

            const nodeData = createNodeData({ operation: 'retrieve' })

            const tool = await node.init(nodeData, '', {})
            const result = await tool._call({ key: 'nonexistent' })
            const parsed = JSON.parse(result)

            expect(parsed).toEqual({
                value: null,
                timestamp: null
            })
        })

        it('should return null when nth version does not exist', async () => {
            const node = createNode()

            mockSend.mockResolvedValueOnce({
                Items: [
                    {
                        pk: { S: 'mykey' },
                        sk: { S: '1234567890' },
                        value: { S: 'only-one' },
                        timestamp: { S: '2024-01-01T00:00:00.000Z' }
                    }
                ]
            })

            const nodeData = createNodeData({ operation: 'retrieve' })

            const tool = await node.init(nodeData, '', {})
            const result = await tool._call({ key: 'mykey', nthLatest: '3' })
            const parsed = JSON.parse(result)

            expect(parsed).toEqual({
                value: null,
                timestamp: null
            })
        })

        it.each([
            ['0', 'nthLatest must be a positive number'],
            ['-1', 'nthLatest must be a positive number']
        ])('should reject invalid nthLatest value "%s"', async (nthLatest, expectedError) => {
            const node = createNode()

            const nodeData = createNodeData({ operation: 'retrieve' })

            const tool = await node.init(nodeData, '', {})
            await expect(tool._call({ key: 'mykey', nthLatest })).rejects.toThrow(expectedError)
        })

        it.each([
            ['', 'Key must be a non-empty string'],
            ['   ', 'Key must be a non-empty string']
        ])('should handle invalid key for retrieve: "%s"', async (key, expectedError) => {
            const node = createNode()

            const nodeData = createNodeData({ operation: 'retrieve' })

            const tool = await node.init(nodeData, '', {})
            await expect(tool._call({ key })).rejects.toThrow(expectedError)
        })
    })

    describe('Helper Functions', () => {
        it.each([
            ['myapp', 'userdata', 'myapp#userdata'],
            ['', 'userdata', 'userdata']
        ])('should build full key correctly (prefix: "%s", key: "%s", expected: "%s")', async (keyPrefix, key, expectedFullKey) => {
            const node = createNode()
            mockSend.mockResolvedValueOnce({})
            const nodeData = createNodeData({ keyPrefix })

            const tool = await node.init(nodeData, '', {})
            await tool._call({ key, value: 'test' })

            // Verify the put command was called with the correct full key
            expect(mockSend).toHaveBeenCalledTimes(1)
            expect(PutItemCommandMock).toHaveBeenCalledTimes(1)

            const putCommandInput = PutItemCommandMock.mock.calls[0][0]
            expect(putCommandInput.Item.pk.S).toBe(expectedFullKey)
        })

        it.each([
            [{ accessKeyId: 'test-key', secretAccessKey: 'test-secret', sessionToken: 'test-token' }, 'with session token'],
            [{ accessKeyId: 'test-key', secretAccessKey: 'test-secret' }, 'without session token']
        ])('should work %s', async (credentials, _description) => {
            const node = createNode()
            const { getAWSCredentials } = require('../../../src/awsToolsUtils')

            getAWSCredentials.mockResolvedValueOnce(credentials)
            mockSend.mockResolvedValueOnce({})

            const nodeData = createNodeData()

            const tool = await node.init(nodeData, '', {})
            await tool._call({ key: 'test', value: 'value' })
            expect(getAWSCredentials).toHaveBeenCalled()
        })
    })
})
