import { INode, INodeData, INodeParams, ICommonObject } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { RedisChatMessageHistory, RedisChatMessageHistoryInput } from 'langchain/stores/message/ioredis'
import { mapStoredMessageToChatMessage, BaseMessage } from 'langchain/schema'
import { Redis } from 'ioredis'

class RedisBackedChatMemory_Memory implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Redis-Backed Chat Memory'
        this.name = 'RedisBackedChatMemory'
        this.version = 2.0
        this.type = 'RedisBackedChatMemory'
        this.icon = 'redis.svg'
        this.category = 'Memory'
        this.description = 'Summarizes the conversation and stores the memory in Redis server'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['redisApi']
        }
        this.inputs = [
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
                label: 'Session Timeouts',
                name: 'sessionTTL',
                type: 'number',
                description: 'Omit this parameter to make sessions never expire',
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
        return await initalizeRedis(nodeData, options)
    }

    async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
        const redis = await initalizeRedis(nodeData, options)
        const sessionId = nodeData.inputs?.sessionId as string
        const chatId = options?.chatId as string
        options.logger.info(`Clearing Redis memory session ${sessionId ? sessionId : chatId}`)
        await redis.clear()
        options.logger.info(`Successfully cleared Redis memory session ${sessionId ? sessionId : chatId}`)
    }
}

const initalizeRedis = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const sessionId = nodeData.inputs?.sessionId as string
    const sessionTTL = nodeData.inputs?.sessionTTL as number
    const memoryKey = nodeData.inputs?.memoryKey as string
    const chatId = options?.chatId as string

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const username = getCredentialParam('redisUser', credentialData, nodeData)
    const password = getCredentialParam('redisPwd', credentialData, nodeData)
    const portStr = getCredentialParam('redisPort', credentialData, nodeData)
    const host = getCredentialParam('redisHost', credentialData, nodeData)

    let isSessionIdUsingChatMessageId = false
    if (!sessionId && chatId) isSessionIdUsingChatMessageId = true

    const redisClient = new Redis({
        port: portStr ? parseInt(portStr) : 6379,
        host,
        username,
        password
    })

    let obj: RedisChatMessageHistoryInput = {
        sessionId: sessionId ? sessionId : chatId,
        client: redisClient
    }

    if (sessionTTL) {
        obj = {
            ...obj,
            sessionTTL
        }
    }

    const redisChatMessageHistory = new RedisChatMessageHistory(obj)

    redisChatMessageHistory.getMessages = async (): Promise<BaseMessage[]> => {
        const rawStoredMessages = await redisClient.lrange(sessionId ? sessionId : chatId, 0, -1)
        const orderedMessages = rawStoredMessages.reverse().map((message) => JSON.parse(message))
        return orderedMessages.map(mapStoredMessageToChatMessage)
    }

    redisChatMessageHistory.addMessage = async (message: BaseMessage): Promise<void> => {
        const messageToAdd = [message].map((msg) => msg.toDict())
        await redisClient.lpush(sessionId ? sessionId : chatId, JSON.stringify(messageToAdd[0]))
        if (sessionTTL) {
            await redisClient.expire(sessionId ? sessionId : chatId, sessionTTL)
        }
    }

    redisChatMessageHistory.clear = async (): Promise<void> => {
        await redisClient.del(sessionId ? sessionId : chatId)
    }

    const memory = new BufferMemoryExtended({
        memoryKey,
        chatHistory: redisChatMessageHistory,
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

module.exports = { nodeClass: RedisBackedChatMemory_Memory }
