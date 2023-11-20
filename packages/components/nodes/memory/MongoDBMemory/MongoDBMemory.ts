import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { MongoDBChatMessageHistory } from 'langchain/stores/message/mongodb'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { BaseMessage, mapStoredMessageToChatMessage } from 'langchain/schema'
import { MongoClient } from 'mongodb'

class MongoDB_Memory implements INode {
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
        this.label = 'MongoDB Atlas Chat Memory'
        this.name = 'MongoDBAtlasChatMemory'
        this.version = 1.0
        this.type = 'MongoDBAtlasChatMemory'
        this.icon = 'mongodb.png'
        this.category = 'Memory'
        this.description = 'Stores the conversation in MongoDB Atlas'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mongoDBUrlApi']
        }
        this.inputs = [
            {
                label: 'Database',
                name: 'databaseName',
                placeholder: '<DB_NAME>',
                type: 'string'
            },
            {
                label: 'Collection Name',
                name: 'collectionName',
                placeholder: '<COLLECTION_NAME>',
                type: 'string'
            },
            {
                label: 'Session Id',
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
        return initializeMongoDB(nodeData, options)
    }

    async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
        const mongodbMemory = await initializeMongoDB(nodeData, options)
        const sessionId = nodeData.inputs?.sessionId as string
        const chatId = options?.chatId as string
        options.logger.info(`Clearing MongoDB memory session ${sessionId ? sessionId : chatId}`)
        await mongodbMemory.clear()
        options.logger.info(`Successfully cleared MongoDB memory session ${sessionId ? sessionId : chatId}`)
    }
}

const initializeMongoDB = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const databaseName = nodeData.inputs?.databaseName as string
    const collectionName = nodeData.inputs?.collectionName as string
    const sessionId = nodeData.inputs?.sessionId as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const chatId = options?.chatId as string

    let isSessionIdUsingChatMessageId = false
    if (!sessionId && chatId) isSessionIdUsingChatMessageId = true

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    let mongoDBConnectUrl = getCredentialParam('mongoDBConnectUrl', credentialData, nodeData)

    const client = new MongoClient(mongoDBConnectUrl)
    await client.connect()
    const collection = client.db(databaseName).collection(collectionName)

    const mongoDBChatMessageHistory = new MongoDBChatMessageHistory({
        collection,
        sessionId: sessionId ? sessionId : chatId
    })

    mongoDBChatMessageHistory.getMessages = async (): Promise<BaseMessage[]> => {
        const document = await collection.findOne({
            sessionId: (mongoDBChatMessageHistory as any).sessionId
        })
        const messages = document?.messages || []
        return messages.map(mapStoredMessageToChatMessage)
    }

    mongoDBChatMessageHistory.addMessage = async (message: BaseMessage): Promise<void> => {
        const messages = [message].map((msg) => msg.toDict())
        await collection.updateOne(
            { sessionId: (mongoDBChatMessageHistory as any).sessionId },
            {
                $push: { messages: { $each: messages } }
            },
            { upsert: true }
        )
    }

    mongoDBChatMessageHistory.clear = async (): Promise<void> => {
        await collection.deleteOne({ sessionId: (mongoDBChatMessageHistory as any).sessionId })
    }

    return new BufferMemoryExtended({
        memoryKey,
        chatHistory: mongoDBChatMessageHistory,
        returnMessages: true,
        isSessionIdUsingChatMessageId
    })
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

module.exports = { nodeClass: MongoDB_Memory }
