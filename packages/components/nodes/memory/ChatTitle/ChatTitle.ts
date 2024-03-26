import {
    DynamoDBClient,
    DynamoDBClientConfig,
    GetItemCommand,
    GetItemCommandInput,
    UpdateItemCommand,
    UpdateItemCommandInput,
    AttributeValue
} from '@aws-sdk/client-dynamodb'
import { DynamoDBChatMessageHistory } from '@langchain/community/stores/message/dynamodb'
import { mapStoredMessageToChatMessage, AIMessage, HumanMessage, StoredMessage, BaseMessage } from '@langchain/core/messages'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { convertBaseMessagetoIMessage, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'
import { now } from 'lodash'

export type IChatItem = {
    attributes: IChatAttributes
}

export type IChatAttributes = {
    messages: IChatMessage[]
}

export type IChatMessage = {
    text: string
    createdAt: string
    type: string
}

class ChatTitle_Memory implements INode {
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
        this.label = 'Fireflower Chat Title Generator'
        this.name = 'ChatTitle'
        this.version = 1.1
        this.type = 'ChatTitle'
        this.icon = 'fireflower-logo.svg'
        this.category = 'Memory'
        this.description = 'Retrieves conversation and generates title'
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
                type: 'string',
                default: 'PK'
            },
            {
                label: 'Sort Key',
                name: 'sortKey',
                type: 'string',
                default: 'SK'
            },
            {
                label: 'Region',
                name: 'region',
                type: 'string',
                description: 'The aws region in which table is located',
                default: 'us-west-2'
            },
            {
                label: 'Chat ID',
                name: 'sessionId',
                type: 'string',
                description: 'This is what will be used as the Sort Key',
                default: 'chat123',
                additionalParams: true,
                optional: false
            },
            {
                label: 'User ID',
                name: 'userId',
                type: 'string',
                description: 'This is what will be used as the Partition Key.',
                default: 'user123',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'messages',
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return initializeChatTitle(nodeData, options)
    }
}

const initializeChatTitle = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const tableName = nodeData.inputs?.tableName as string
    const partitionKey = nodeData.inputs?.partitionKey as string
    const sortKey = nodeData.inputs?.sortKey as string
    const region = nodeData.inputs?.region as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const sessionId = nodeData.inputs?.sessionId as string
    const userId = nodeData.inputs?.userId as string

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const accessKeyId = getCredentialParam('accessKey', credentialData, nodeData)
    const secretAccessKey = getCredentialParam('secretAccessKey', credentialData, nodeData)
    const sessionToken = getCredentialParam('apiSessionKey', credentialData, nodeData)

    const config: DynamoDBClientConfig = {
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
            sessionToken
        }
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
        userId,
        dynamodbClient: client,
        tableName,
        partitionKey,
        sortKey,
        dynamoKey: { [partitionKey]: { S: sessionId } }
    })
    return memory
}

interface BufferMemoryExtendedInput {
    dynamodbClient: DynamoDBClient
    sessionId: string
    userId: string
    tableName: string
    partitionKey: string
    sortKey: string
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
        createdAt: {
            S: string
        }
    }
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    private tableName = ''
    private partitionKey = ''
    private sortKey = ''
    private dynamoKey: Record<string, AttributeValue>
    private messageAttributeName: string
    sessionId = ''
    userId = ''
    dynamodbClient: DynamoDBClient

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.sessionId = fields.sessionId
        this.userId = fields.userId
        this.dynamodbClient = fields.dynamodbClient
        this.tableName = fields.tableName
        this.partitionKey = fields.partitionKey
        this.sortKey = fields.sortKey
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

        // skip the human data. We only want the AI one that contains the LLM response
        if (messages[0].type == 'human'){
            return;
        }

        const params: UpdateItemCommandInput = {
          TableName: tableName,
          Key: {
            [this.partitionKey]: { S: this.userId },
            [this.sortKey]: { S: this.sessionId }
          },
          UpdateExpression: "SET title = :newTitle",
          ExpressionAttributeValues: {
            ":newTitle": { S: messages[0].data.content },
          },
        };
      
        await client.send(new UpdateItemCommand(params));
      }


    async getChatMessages(overrideSessionId = '', returnBaseMessages = false): Promise<IMessage[] | BaseMessage[]> {
        if (!this.dynamodbClient) return []

        const dynamoKey = overrideSessionId ? this.overrideDynamoKey(overrideSessionId) : this.dynamoKey
        const tableName = this.tableName

        const messageAttributeName = this.messageAttributeName ? this.messageAttributeName : 'messages'
        const params: GetItemCommandInput = {
            TableName: tableName,
            // Key: dynamoKey
            Key: {
                [this.partitionKey]: { S: this.userId },
                [this.sortKey]: { S: this.sessionId }
            },            
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
        return
    }
}

module.exports = { nodeClass: ChatTitle_Memory }
