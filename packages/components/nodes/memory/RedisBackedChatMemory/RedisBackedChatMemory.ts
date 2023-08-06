import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ICommonObject } from '../../../src'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { RedisChatMessageHistory, RedisChatMessageHistoryInput } from 'langchain/stores/message/redis'
import { createClient } from 'redis'

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

    constructor() {
        this.label = 'Redis-Backed Chat Memory'
        this.name = 'RedisBackedChatMemory'
        this.version = 1.0
        this.type = 'RedisBackedChatMemory'
        this.icon = 'redis.svg'
        this.category = 'Memory'
        this.description = 'Summarizes the conversation and stores the memory in Redis server'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseURL',
                type: 'string',
                default: 'redis://localhost:6379'
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
        return initalizeRedis(nodeData, options)
    }

    async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
        const redis = initalizeRedis(nodeData, options)
        const sessionId = nodeData.inputs?.sessionId as string
        const chatId = options?.chatId as string
        options.logger.info(`Clearing Redis memory session ${sessionId ? sessionId : chatId}`)
        await redis.clear()
        options.logger.info(`Successfully cleared Redis memory session ${sessionId ? sessionId : chatId}`)
    }
}

const initalizeRedis = (nodeData: INodeData, options: ICommonObject): BufferMemory => {
    const baseURL = nodeData.inputs?.baseURL as string
    const sessionId = nodeData.inputs?.sessionId as string
    const sessionTTL = nodeData.inputs?.sessionTTL as number
    const memoryKey = nodeData.inputs?.memoryKey as string
    const chatId = options?.chatId as string

    let isSessionIdUsingChatMessageId = false
    if (!sessionId && chatId) isSessionIdUsingChatMessageId = true

    const redisClient = createClient({ url: baseURL })
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
