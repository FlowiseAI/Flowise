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
                label: 'Session Id',
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
        return initializeMongoDB(nodeData, options)
    }
}

const initializeMongoDB = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const databaseName = nodeData.inputs?.databaseName as string
    const collectionName = nodeData.inputs?.collectionName as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const sessionId = nodeData.inputs?.sessionId as string

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const mongoDBConnectUrl = getCredentialParam('mongoDBConnectUrl', credentialData, nodeData)
    const driverInfo = { name: 'Flowise', version: (await getVersion()).version }

    return new BufferMemoryExtended({
        memoryKey: memoryKey ?? 'chat_history',
        sessionId,
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
        const collection = client.db(this.mongoConnection.databaseName).collection(this.mongoConnection.collectionName)

        const id = overrideSessionId ? overrideSessionId : this.sessionId
        const document = await collection.findOne({ sessionId: id })
        const messages = document?.messages || []
        const baseMessages = messages.map(mapStoredMessageToChatMessage)
        if (prependMessages?.length) {
            baseMessages.unshift(...(await mapChatMessageToBaseMessage(prependMessages)))
        }

        await client.close()
        return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        const client = new MongoClient(this.mongoConnection.mongoDBConnectUrl, { driverInfo: this.mongoConnection.driverInfo })
        const collection = client.db(this.mongoConnection.databaseName).collection(this.mongoConnection.collectionName)

        const id = overrideSessionId ? overrideSessionId : this.sessionId
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')

        if (input) {
            const newInputMessage = new HumanMessage(input.text)
            const messageToAdd = [newInputMessage].map((msg) => msg.toDict())
            await collection.updateOne(
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
            await collection.updateOne(
                { sessionId: id },
                {
                    $push: { messages: { $each: messageToAdd } }
                },
                { upsert: true }
            )
        }

        await client.close()
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        const client = new MongoClient(this.mongoConnection.mongoDBConnectUrl, { driverInfo: this.mongoConnection.driverInfo })
        const collection = client.db(this.mongoConnection.databaseName).collection(this.mongoConnection.collectionName)

        const id = overrideSessionId ? overrideSessionId : this.sessionId
        await collection.deleteOne({ sessionId: id })
        await this.clear()

        await client.close()
    }
}

module.exports = { nodeClass: MongoDB_Memory }
