import {
    DynamoDBClient,
    DynamoDBClientConfig,
    GetItemCommand,
    GetItemCommandInput,
    UpdateItemCommand,
    UpdateItemCommandInput,
    DeleteItemCommand,
    DeleteItemCommandInput,
    AttributeValue
} from '@aws-sdk/client-dynamodb'
import { DynamoDBChatMessageHistory } from '@langchain/community/stores/message/dynamodb'
import { mapStoredMessageToChatMessage, AIMessage, HumanMessage, StoredMessage, BaseMessage } from '@langchain/core/messages'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import {
    convertBaseMessagetoIMessage,
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    mapChatMessageToBaseMessage
} from '../../../src/utils'
import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'

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
            credentialNames: ['dynamodbMemoryApi'],
            optional: true
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
                description:
                    'If not specified, a random id will be used. Learn <a target="_blank" href="https://docs.flowiseai.com/memory/long-term-memory#ui-and-embedded-chat">more</a>',
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
        return initializeDynamoDB(nodeData, options)
    }
}

const initializeDynamoDB = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const tableName = nodeData.inputs?.tableName as string
    const partitionKey = nodeData.inputs?.partitionKey as string
    const region = nodeData.inputs?.region as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const sessionId = nodeData.inputs?.sessionId as string

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const accessKeyId = getCredentialParam('accessKey', credentialData, nodeData)
    const secretAccessKey = getCredentialParam('secretAccessKey', credentialData, nodeData)

    let credentials: DynamoDBClientConfig['credentials'] | undefined
    if (accessKeyId && secretAccessKey) {
        credentials = {
            accessKeyId,
            secretAccessKey
        }
    }

    const config: DynamoDBClientConfig = {
        region,
        credentials
    }

    const client = new DynamoDBClient(config ?? {})

    const dynamoDb = new DynamoDBChatMessageHistory({
        tableName,
        partitionKey,
        sessionId,
        config
    })

    const memory = new BufferMemoryExtended({
        memoryKey: memoryKey ?? 'chat_history',
        chatHistory: dynamoDb,
        sessionId,
        dynamodbClient: client,
        tableName,
        partitionKey,
        dynamoKey: { [partitionKey]: { S: sessionId } }
    })
    return memory
}

interface BufferMemoryExtendedInput {
    dynamodbClient: DynamoDBClient
    sessionId: string
    tableName: string
    partitionKey: string
    dynamoKey: Record<string, AttributeValue>
}

interface DynamoDBSerializedChatMessage {
    M: {
        type: {
            S: string
        }
        text: {
            S: string
        }
        role?: {
            S: string
        }
    }
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    private tableName = ''
    private partitionKey = ''
    private dynamoKey: Record<string, AttributeValue>
    private messageAttributeName: string
    sessionId = ''
    dynamodbClient: DynamoDBClient

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.sessionId = fields.sessionId
        this.dynamodbClient = fields.dynamodbClient
        this.tableName = fields.tableName
        this.partitionKey = fields.partitionKey
        this.dynamoKey = fields.dynamoKey
    }

    overrideDynamoKey(overrideSessionId = '') {
        const existingDynamoKey = this.dynamoKey
        const partitionKey = this.partitionKey

        let newDynamoKey: Record<string, AttributeValue> = {}

        if (Object.keys(existingDynamoKey).includes(partitionKey)) {
            newDynamoKey[partitionKey] = { S: overrideSessionId }
        }

        return Object.keys(newDynamoKey).length ? newDynamoKey : existingDynamoKey
    }

    async addNewMessage(
        messages: StoredMessage[],
        client: DynamoDBClient,
        tableName = '',
        dynamoKey: Record<string, AttributeValue> = {},
        messageAttributeName = 'messages'
    ) {
        const params: UpdateItemCommandInput = {
            TableName: tableName,
            Key: dynamoKey,
            ExpressionAttributeNames: {
                '#m': messageAttributeName
            },
            ExpressionAttributeValues: {
                ':empty_list': {
                    L: []
                },
                ':m': {
                    L: messages.map((message) => {
                        const dynamoSerializedMessage: DynamoDBSerializedChatMessage = {
                            M: {
                                type: {
                                    S: message.type
                                },
                                text: {
                                    S: message.data.content
                                }
                            }
                        }
                        if (message.data.role) {
                            dynamoSerializedMessage.M.role = { S: message.data.role }
                        }
                        return dynamoSerializedMessage
                    })
                }
            },
            UpdateExpression: 'SET #m = list_append(if_not_exists(#m, :empty_list), :m)'
        }

        await client.send(new UpdateItemCommand(params))
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        if (!this.dynamodbClient) return []

        const dynamoKey = overrideSessionId ? this.overrideDynamoKey(overrideSessionId) : this.dynamoKey
        const tableName = this.tableName

        const messageAttributeName = this.messageAttributeName ? this.messageAttributeName : 'messages'
        const params: GetItemCommandInput = {
            TableName: tableName,
            Key: dynamoKey
        }

        const response = await this.dynamodbClient.send(new GetItemCommand(params))
        const items = response.Item ? response.Item[messageAttributeName]?.L ?? [] : []
        const messages = items
            .map((item) => ({
                type: item.M?.type.S,
                data: {
                    role: item.M?.role?.S,
                    content: item.M?.text.S
                }
            }))
            .filter((x): x is StoredMessage => x.type !== undefined && x.data.content !== undefined)
        const baseMessages = messages.map(mapStoredMessageToChatMessage)
        if (prependMessages?.length) {
            baseMessages.unshift(...mapChatMessageToBaseMessage(prependMessages))
        }
        return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        if (!this.dynamodbClient) return

        const dynamoKey = overrideSessionId ? this.overrideDynamoKey(overrideSessionId) : this.dynamoKey
        const tableName = this.tableName
        const messageAttributeName = this.messageAttributeName

        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')

        if (input) {
            const newInputMessage = new HumanMessage(input.text)
            const messageToAdd = [newInputMessage].map((msg) => msg.toDict())
            await this.addNewMessage(messageToAdd, this.dynamodbClient, tableName, dynamoKey, messageAttributeName)
        }

        if (output) {
            const newOutputMessage = new AIMessage(output.text)
            const messageToAdd = [newOutputMessage].map((msg) => msg.toDict())
            await this.addNewMessage(messageToAdd, this.dynamodbClient, tableName, dynamoKey, messageAttributeName)
        }
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        if (!this.dynamodbClient) return

        const dynamoKey = overrideSessionId ? this.overrideDynamoKey(overrideSessionId) : this.dynamoKey
        const tableName = this.tableName

        const params: DeleteItemCommandInput = {
            TableName: tableName,
            Key: dynamoKey
        }
        await this.dynamodbClient.send(new DeleteItemCommand(params))
        await this.clear()
    }
}

module.exports = { nodeClass: DynamoDb_Memory }
