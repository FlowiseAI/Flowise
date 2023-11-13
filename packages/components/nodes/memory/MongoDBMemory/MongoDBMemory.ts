import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { MongoDBChatMessageHistory } from 'langchain/stores/message/mongodb'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
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
                label: 'Session ID',
                name: 'sessionId',
                type: 'string',
                default: '5f9cf7c08d5b1a06b80fae61',
                description: 'Must be an Hex String of 24 chars. This will be the objectId of the document in MongoDB Atlas'
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
        options.logger.info(`Clearing MongoDB memory session ${sessionId}`)
        await mongodbMemory.clear()
        options.logger.info(`Successfully cleared MongoDB memory session ${sessionId}`)
    }
}

const initializeMongoDB = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const databaseName = nodeData.inputs?.databaseName as string
    const collectionName = nodeData.inputs?.collectionName as string
    const sessionId = nodeData.inputs?.sessionId as string
    const memoryKey = nodeData.inputs?.memoryKey as string

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    let mongoDBConnectUrl = getCredentialParam('mongoDBConnectUrl', credentialData, nodeData)

    const client = new MongoClient(mongoDBConnectUrl)
    await client.connect()
    const collection = client.db(databaseName).collection(collectionName)

    const mongoDBChatMessageHistory = new MongoDBChatMessageHistory({
        collection,
        sessionId: sessionId
    })

    return new BufferMemoryExtended({
        memoryKey,
        chatHistory: mongoDBChatMessageHistory,
        returnMessages: true,
        isSessionIdUsingChatMessageId: false
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
