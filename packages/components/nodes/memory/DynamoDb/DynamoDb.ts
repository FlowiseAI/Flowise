import { ICommonObject, INode, INodeData, INodeParams, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src'
import { DynamoDBChatMessageHistory } from 'langchain/stores/message/dynamodb'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'

class DynamoDb_Memory implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'DynamoDB Chat Memory'
        this.name = 'DynamoDBChatMemory'
        this.version = 1.0
        this.type = 'DynamoDBChatMemory'
        this.icon = 'dynamodb.svg'
        this.category = 'Memory'
        this.description = 'Stores the conversation in dynamo db table'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['dynamodbMemoryApi']
        }
        this.inputs = [
            {
                label: 'Table Name',
                name: 'tableName',
                type: 'string'
            },
            {
                label: 'Partition Key',
                name: 'partitionKey',
                type: 'string'
            },
            {
                label: 'Region',
                name: 'region',
                type: 'string',
                description: 'The aws region in which table is located',
                placeholder: 'us-east-1'
            },
            {
                label: 'Session ID',
                name: 'sessionId',
                type: 'string',
                description: 'If not specified, the first CHAT_MESSAGE_ID will be used as sessionId',
                default: '',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history',
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return initalizeDynamoDB(nodeData, options)
    }

    async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
        const dynamodbMemory = await initalizeDynamoDB(nodeData, options)
        const sessionId = nodeData.inputs?.sessionId as string
        const chatId = options?.chatId as string
        options.logger.info(`Clearing DynamoDb memory session ${sessionId ? sessionId : chatId}`)
        await dynamodbMemory.clear()
        options.logger.info(`Successfully cleared DynamoDb memory session ${sessionId ? sessionId : chatId}`)
    }
}

const initalizeDynamoDB = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const tableName = nodeData.inputs?.tableName as string
    const partitionKey = nodeData.inputs?.partitionKey as string
    const sessionId = nodeData.inputs?.sessionId as string
    const region = nodeData.inputs?.region as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const chatId = options.chatId

    let isSessionIdUsingChatMessageId = false
    if (!sessionId && chatId) isSessionIdUsingChatMessageId = true

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const accessKeyId = getCredentialParam('accessKey', credentialData, nodeData)
    const secretAccessKey = getCredentialParam('secretAccessKey', credentialData, nodeData)

    const dynamoDb = new DynamoDBChatMessageHistory({
        tableName,
        partitionKey,
        sessionId: sessionId ? sessionId : chatId,
        config: {
            region,
            credentials: {
                accessKeyId,
                secretAccessKey
            }
        }
    })

    const memory = new BufferMemoryExtended({
        memoryKey,
        chatHistory: dynamoDb,
        returnMessages: true,
        isSessionIdUsingChatMessageId
    })
    return memory
}

interface BufferMemoryExtendedInput {
    isSessionIdUsingChatMessageId: boolean
}

class BufferMemoryExtended extends BufferMemory {
    isSessionIdUsingChatMessageId? = false

    constructor(fields: BufferMemoryInput & Partial<BufferMemoryExtendedInput>) {
        super(fields)
        this.isSessionIdUsingChatMessageId = fields.isSessionIdUsingChatMessageId
    }
}

module.exports = { nodeClass: DynamoDb_Memory }
