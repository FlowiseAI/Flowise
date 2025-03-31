import { MongoClient } from 'mongodb'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { mapStoredMessageToChatMessage, AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages'
import {
    convertBaseMessagetoIMessage,
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    getVersion,
    mapChatMessageToBaseMessage
} from '../../../src/utils'
import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'

// TODO: Add ability to specify env variable and use singleton pattern (i.e initialize MongoDB on server and pass to component)

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
                label: 'Username',
                name: 'username',
                type: 'string',
                description:
                    'Enter the username that will be used as the userID for the chat history. If not specified, a random id will be used. Learn <a target="_blank" href="https://docs.flowiseai.com/memory/long-term-memory#ui-and-embedded-chat">more</a>',
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
}

const initializeMongoDB = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const databaseName = nodeData.inputs?.databaseName as string
    const collectionName = nodeData.inputs?.collectionName as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    // Use the username input as the userID (falling back to an empty string if not provided)
    const userID = nodeData.inputs?.username as string

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const mongoDBConnectUrl = getCredentialParam('mongoDBConnectUrl', credentialData, nodeData)
    const driverInfo = { name: 'Flowise', version: (await getVersion()).version }

    return new BufferMemoryExtended({
        memoryKey: memoryKey ?? 'chat_history',
        sessionId: userID, // Using the username as the session/user id.
        mongoConnection: {
            databaseName,
            collectionName,
            mongoDBConnectUrl,
            driverInfo
        }
    })
}

interface BufferMemoryExtendedInput {
    sessionId: string
    mongoConnection: {
        databaseName: string
        collectionName: string
        mongoDBConnectUrl: string
        driverInfo: { name: string; version: string }
    }
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    // We use the sessionId field as the userID (derived from the username input)
    sessionId = ''
    mongoConnection: {
        databaseName: string
        collectionName: string
        mongoDBConnectUrl: string
        driverInfo: { name: string; version: string }
    }

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.sessionId = fields.sessionId
        this.mongoConnection = fields.mongoConnection
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const client = new MongoClient(this.mongoConnection.mongoDBConnectUrl, { driverInfo: this.mongoConnection.driverInfo })
        await client.connect()
        const collection = client.db(this.mongoConnection.databaseName).collection(this.mongoConnection.collectionName)
        // Use the provided username (or fallback to stored sessionId) as userID
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        const document = await collection.findOne({ userID: id })
        const chatHistory: string = document?.chatHistory || ""
        
        // Convert the stored string into BaseMessage objects by splitting on newline.
        let baseMessages: BaseMessage[] = []
        if (chatHistory) {
            baseMessages = chatHistory
                .split("\n")
                .filter(line => line.trim() !== "")
                .map(line => {
                    if (line.startsWith("User:")) {
                        return new HumanMessage(line.replace("User:", "").trim())
                    } else if (line.startsWith("AI:")) {
                        return new AIMessage(line.replace("AI:", "").trim())
                    } else {
                        return new HumanMessage(line.trim())
                    }
                })
        }

        if (prependMessages?.length) {
            baseMessages.unshift(...(await mapChatMessageToBaseMessage(prependMessages)))
        }

        await client.close()
        return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        const client = new MongoClient(this.mongoConnection.mongoDBConnectUrl, { driverInfo: this.mongoConnection.driverInfo })
        await client.connect()
        const collection = client.db(this.mongoConnection.databaseName).collection(this.mongoConnection.collectionName)
        const id = overrideSessionId ? overrideSessionId : this.sessionId

        // Build a single string with new messages.
        // Prefix "User:" for user messages and "AI:" for api messages.
        const newMessages = msgArray.map(msg => {
            if (msg.type === 'userMessage') {
                return "User: " + msg.text
            } else if (msg.type === 'apiMessage') {
                return "AI: " + msg.text
            }
            return msg.text
        }).join("\n")

        // Retrieve any existing chatHistory, then append the new messages.
        const document = await collection.findOne({ userID: id })
        const updatedChatHistory = document?.chatHistory
            ? document.chatHistory + "\n" + newMessages
            : newMessages

        await collection.updateOne(
            { userID: id },
            {
                $set: {
                    userID: id,
                    chatHistory: updatedChatHistory,
                    lastUpdated: new Date()
                }
            },
            { upsert: true }
        )
        await client.close()
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        const client = new MongoClient(this.mongoConnection.mongoDBConnectUrl, { driverInfo: this.mongoConnection.driverInfo })
        await client.connect()
        const collection = client.db(this.mongoConnection.databaseName).collection(this.mongoConnection.collectionName)
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        await collection.deleteOne({ userID: id })
        await this.clear()
        await client.close()
    }
}

module.exports = { nodeClass: MongoDB_Memory }
