import { z } from 'zod'
import { StructuredTool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { AWS_REGIONS, DEFAULT_AWS_REGION, AWSCredentials, getAWSCredentials } from '../../../src/awsToolsUtils'
import { DynamoDBClient, DescribeTableCommand, ListTablesCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'

// Operation enum
enum Operation {
    STORE = 'store',
    RETRIEVE = 'retrieve'
}

// Constants
const ERROR_PLACEHOLDER = 'error'
const KEY_SEPARATOR = '#'
const MAX_KEY_LENGTH = 2048 // DynamoDB limit for partition key

// Helper function to create DynamoDB client
function createDynamoDBClient(credentials: AWSCredentials, region: string): DynamoDBClient {
    return new DynamoDBClient({
        region,
        credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            ...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
        }
    })
}

// Helper function to build full key with optional prefix
function buildFullKey(key: string, keyPrefix: string): string {
    const fullKey = keyPrefix ? `${keyPrefix}${KEY_SEPARATOR}${key}` : key

    // Validate key length (DynamoDB limit)
    if (fullKey.length > MAX_KEY_LENGTH) {
        throw new Error(`Key too long. Maximum length is ${MAX_KEY_LENGTH} characters, got ${fullKey.length}`)
    }

    return fullKey
}

// Helper function to validate and sanitize input
function validateKey(key: string): void {
    if (!key || key.trim().length === 0) {
        throw new Error('Key must be a non-empty string')
    }
}

/**
 * Tool for storing key-value pairs in DynamoDB with automatic versioning
 */
class DynamoDBStoreTool extends StructuredTool {
    name = 'dynamodb_kv_store'
    description = 'Store a text value with a key in DynamoDB. Input must be an object with "key" and "value" properties.'
    schema = z.object({
        key: z.string().min(1).describe('The key to store the value under'),
        value: z.string().describe('The text value to store')
    })
    private readonly dynamoClient: DynamoDBClient
    private readonly tableName: string
    private readonly keyPrefix: string

    constructor(dynamoClient: DynamoDBClient, tableName: string, keyPrefix: string = '') {
        super()
        this.dynamoClient = dynamoClient
        this.tableName = tableName
        this.keyPrefix = keyPrefix
    }

    async _call({ key, value }: z.infer<typeof this.schema>): Promise<string> {
        try {
            validateKey(key)
            const fullKey = buildFullKey(key, this.keyPrefix)
            const timestamp = Date.now()
            const isoTimestamp = new Date(timestamp).toISOString()

            const putCommand = new PutItemCommand({
                TableName: this.tableName,
                Item: {
                    pk: { S: fullKey },
                    sk: { S: timestamp.toString() },
                    value: { S: value },
                    timestamp: { S: isoTimestamp }
                }
            })

            await this.dynamoClient.send(putCommand)
            return `Successfully stored value with key "${key}" at ${isoTimestamp}`
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to store value: ${errorMessage}`)
        }
    }
}

/**
 * Tool for retrieving key-value pairs from DynamoDB with version control
 */
class DynamoDBRetrieveTool extends StructuredTool {
    name = 'dynamodb_kv_retrieve'
    description =
        'Retrieve a value by key from DynamoDB. Returns JSON with value and timestamp. Specify which version to get (1=latest, 2=2nd latest, etc).'
    schema = z.object({
        key: z.string().min(1).describe('The key to retrieve the value for'),
        nthLatest: z
            .string()
            .regex(/^\d+$/, 'Must be a positive number')
            .describe(
                'Which version to retrieve: "1" for latest, "2" for 2nd latest, "3" for 3rd latest, etc. Use "1" to get the most recent value.'
            )
            .optional()
            .default('1')
    })
    private readonly dynamoClient: DynamoDBClient
    private readonly tableName: string
    private readonly keyPrefix: string

    constructor(dynamoClient: DynamoDBClient, tableName: string, keyPrefix: string = '') {
        super()
        this.dynamoClient = dynamoClient
        this.tableName = tableName
        this.keyPrefix = keyPrefix
    }

    async _call(input: z.infer<typeof this.schema>): Promise<string> {
        try {
            const { key, nthLatest = '1' } = input
            validateKey(key)
            const fullKey = buildFullKey(key, this.keyPrefix)

            // Convert string to number and validate
            const nthLatestNum = parseInt(nthLatest, 10)
            if (isNaN(nthLatestNum) || nthLatestNum < 1) {
                throw new Error('nthLatest must be a positive number (1 or greater)')
            }

            const queryCommand = new QueryCommand({
                TableName: this.tableName,
                KeyConditionExpression: 'pk = :pk',
                ExpressionAttributeValues: {
                    ':pk': { S: fullKey }
                },
                ScanIndexForward: false, // Sort descending (newest first)
                Limit: nthLatestNum
            })

            const result = await this.dynamoClient.send(queryCommand)

            if (!result.Items || result.Items.length === 0) {
                return JSON.stringify({
                    value: null,
                    timestamp: null
                })
            }

            if (result.Items.length < nthLatestNum) {
                return JSON.stringify({
                    value: null,
                    timestamp: null
                })
            }

            const item = result.Items[nthLatestNum - 1]
            const value = item.value?.S || null
            const timestamp = item.timestamp?.S || item.sk?.S || null

            // Return JSON with value and timestamp
            return JSON.stringify({
                value: value,
                timestamp: timestamp
            })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to retrieve value: ${errorMessage}`)
        }
    }
}

/**
 * Node implementation for AWS DynamoDB KV Storage tools
 */
class AWSDynamoDBKVStorage_Tools implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'AWS DynamoDB KV Storage'
        this.name = 'awsDynamoDBKVStorage'
        this.version = 1.0
        this.type = 'AWSDynamoDBKVStorage'
        this.icon = 'dynamodbkvstorage.svg'
        this.category = 'Tools'
        this.description = 'Store and retrieve versioned text values in AWS DynamoDB'
        this.baseClasses = [this.type, ...getBaseClasses(DynamoDBStoreTool)]
        this.credential = {
            label: 'AWS Credentials',
            name: 'credential',
            type: 'credential',
            credentialNames: ['awsApi']
        }
        this.inputs = [
            {
                label: 'AWS Region',
                name: 'region',
                type: 'options',
                options: AWS_REGIONS,
                default: DEFAULT_AWS_REGION,
                description: 'AWS Region where your DynamoDB tables are located'
            },
            {
                label: 'DynamoDB Table',
                name: 'tableName',
                type: 'asyncOptions',
                loadMethod: 'listTables',
                description: 'Select a DynamoDB table with partition key "pk" and sort key "sk"',
                refresh: true
            },
            {
                label: 'Key Prefix',
                name: 'keyPrefix',
                type: 'string',
                description: 'Optional prefix to add to all keys (e.g., "myapp" would make keys like "myapp#userdata")',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                    { label: 'Store', name: Operation.STORE },
                    { label: 'Retrieve', name: Operation.RETRIEVE }
                ],
                default: Operation.STORE,
                description: 'Choose whether to store or retrieve data'
            }
        ]
    }

    loadMethods: Record<string, (nodeData: INodeData, options?: ICommonObject) => Promise<INodeOptionsValue[]>> = {
        listTables: async (nodeData: INodeData, options?: ICommonObject): Promise<INodeOptionsValue[]> => {
            try {
                const credentials = await getAWSCredentials(nodeData, options ?? {})
                const region = (nodeData.inputs?.region as string) || DEFAULT_AWS_REGION
                const dynamoClient = createDynamoDBClient(credentials, region)

                const listCommand = new ListTablesCommand({})
                const listResponse = await dynamoClient.send(listCommand)

                if (!listResponse.TableNames || listResponse.TableNames.length === 0) {
                    return [
                        {
                            label: 'No tables found',
                            name: ERROR_PLACEHOLDER,
                            description: 'No DynamoDB tables found in this region'
                        }
                    ]
                }

                const validTables: INodeOptionsValue[] = []
                const invalidTables: string[] = []

                // Check tables in parallel for better performance
                const tableChecks = await Promise.allSettled(
                    listResponse.TableNames.map(async (tableName) => {
                        const describeCommand = new DescribeTableCommand({
                            TableName: tableName
                        })
                        const describeResponse = await dynamoClient.send(describeCommand)

                        const keySchema = describeResponse.Table?.KeySchema
                        if (keySchema) {
                            const hasPk = keySchema.some((key) => key.AttributeName === 'pk' && key.KeyType === 'HASH')
                            const hasSk = keySchema.some((key) => key.AttributeName === 'sk' && key.KeyType === 'RANGE')

                            if (hasPk && hasSk) {
                                return {
                                    valid: true,
                                    table: {
                                        label: tableName,
                                        name: tableName,
                                        description: `Table with pk (partition) and sk (sort) keys`
                                    }
                                }
                            }
                        }
                        return { valid: false, tableName }
                    })
                )

                tableChecks.forEach((result) => {
                    if (result.status === 'fulfilled') {
                        if (result.value.valid) {
                            validTables.push(result.value.table!)
                        } else if (result.value.tableName) {
                            invalidTables.push(result.value.tableName)
                        }
                    }
                })

                if (validTables.length === 0) {
                    return [
                        {
                            label: 'No compatible tables found',
                            name: ERROR_PLACEHOLDER,
                            description: `No tables with partition key "pk" and sort key "sk" found. ${
                                invalidTables.length > 0 ? `Found ${invalidTables.length} table(s) with different schema.` : ''
                            } Please create a table with these keys.`
                        }
                    ]
                }

                // Sort tables alphabetically
                validTables.sort((a, b) => a.label.localeCompare(b.label))

                return validTables
            } catch (error) {
                if (error instanceof Error && error.message.includes('AWS Access Key')) {
                    return [
                        {
                            label: 'AWS Credentials Required',
                            name: ERROR_PLACEHOLDER,
                            description: 'Enter AWS Access Key ID and Secret Access Key'
                        }
                    ]
                }
                console.error('Error loading DynamoDB tables:', error)
                return [
                    {
                        label: 'Error Loading Tables',
                        name: ERROR_PLACEHOLDER,
                        description: `Failed to load tables: ${error instanceof Error ? error.message : String(error)}`
                    }
                ]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentials = await getAWSCredentials(nodeData, options)

        const region = (nodeData.inputs?.region as string) || DEFAULT_AWS_REGION
        const tableName = nodeData.inputs?.tableName as string
        const keyPrefix = (nodeData.inputs?.keyPrefix as string) || ''
        const operation = (nodeData.inputs?.operation as string) || Operation.STORE

        if (!tableName || tableName === ERROR_PLACEHOLDER) {
            throw new Error('Valid DynamoDB Table selection is required')
        }

        // Validate key prefix doesn't contain separator
        if (keyPrefix && keyPrefix.includes(KEY_SEPARATOR)) {
            throw new Error(`Key prefix cannot contain "${KEY_SEPARATOR}" character`)
        }

        const dynamoClient = createDynamoDBClient(credentials, region)

        if (operation === Operation.STORE) {
            return new DynamoDBStoreTool(dynamoClient, tableName, keyPrefix)
        } else {
            return new DynamoDBRetrieveTool(dynamoClient, tableName, keyPrefix)
        }
    }
}

module.exports = { nodeClass: AWSDynamoDBKVStorage_Tools }
