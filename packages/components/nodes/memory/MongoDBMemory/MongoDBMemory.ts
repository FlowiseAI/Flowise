import { MongoClient, Collection, Document } from 'mongodb'
import { MongoDBChatMessageHistory } from 'langchain/stores/message/mongodb'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { mapStoredMessageToChatMessage, AIMessage, HumanMessage, BaseMessage } from 'langchain/schema'
import {
    convertBaseMessagetoIMessage,
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    serializeChatHistory
} from '../../../src/utils'
import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'

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
        this.icon = 'mongodb.svg'
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

    //@ts-ignore
    memoryMethods = {
        async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
            const mongodbMemory = await initializeMongoDB(nodeData, options)
            const sessionId = nodeData.inputs?.sessionId as string
            const chatId = options?.chatId as string
            options.logger.info(`Clearing MongoDB memory session ${sessionId ? sessionId : chatId}`)
            await mongodbMemory.clear()
            options.logger.info(`Successfully cleared MongoDB memory session ${sessionId ? sessionId : chatId}`)
        },
        async getChatMessages(nodeData: INodeData, options: ICommonObject): Promise<string> {
            const memoryKey = nodeData.inputs?.memoryKey as string
            const mongodbMemory = await initializeMongoDB(nodeData, options)
            const key = memoryKey ?? 'chat_history'
            const memoryResult = await mongodbMemory.loadMemoryVariables({})
            return serializeChatHistory(memoryResult[key])
        }
    }
}

const initializeMongoDB = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const databaseName = nodeData.inputs?.databaseName as string
    const collectionName = nodeData.inputs?.collectionName as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const chatId = options?.chatId as string

    let isSessionIdUsingChatMessageId = false
    let sessionId = ''

    if (!nodeData.inputs?.sessionId && chatId) {
        isSessionIdUsingChatMessageId = true
        sessionId = chatId
    } else {
        sessionId = nodeData.inputs?.sessionId
    }

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const mongoDBConnectUrl = getCredentialParam('mongoDBConnectUrl', credentialData, nodeData)

    const client = new MongoClient(mongoDBConnectUrl)
    await client.connect()

    const collection = client.db(databaseName).collection(collectionName)

    const mongoDBChatMessageHistory = new MongoDBChatMessageHistory({
        collection,
        sessionId
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
        memoryKey: memoryKey ?? 'chat_history',
        chatHistory: mongoDBChatMessageHistory,
        isSessionIdUsingChatMessageId,
        sessionId,
        collection
    })
}

interface BufferMemoryExtendedInput {
    isSessionIdUsingChatMessageId: boolean
    collection: Collection<Document>
    sessionId: string
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    sessionId = ''
    collection: Collection<Document>
    isSessionIdUsingChatMessageId? = false

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.sessionId = fields.sessionId
        this.collection = fields.collection
    }

    async getChatMessages(overrideSessionId = '', returnBaseMessages = false): Promise<IMessage[] | BaseMessage[]> {
        if (!this.collection) return []

        const id = overrideSessionId ?? this.sessionId
        const document = await this.collection.findOne({ sessionId: id })
        const messages = document?.messages || []
        const baseMessages = messages.map(mapStoredMessageToChatMessage)
        return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        if (!this.collection) return

        const id = overrideSessionId ?? this.sessionId
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')

        if (input) {
            const newInputMessage = new HumanMessage(input.text)
            const messageToAdd = [newInputMessage].map((msg) => msg.toDict())
            await this.collection.updateOne(
                { sessionId: id },
                {
                    $push: { messages: { $each: messageToAdd } }
                },
                { upsert: true }
            )
        }

        if (output) {
            const newOutputMessage = new AIMessage(output.text)
            const messageToAdd = [newOutputMessage].map((msg) => msg.toDict())
            await this.collection.updateOne(
                { sessionId: id },
                {
                    $push: { messages: { $each: messageToAdd } }
                },
                { upsert: true }
            )
        }
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        if (!this.collection) return

        const id = overrideSessionId ?? this.sessionId
        await this.collection.deleteOne({ sessionId: id })
        await this.clear()
    }

    async resumeMessages(): Promise<void> {
        return
    }
}

module.exports = { nodeClass: MongoDB_Memory }
