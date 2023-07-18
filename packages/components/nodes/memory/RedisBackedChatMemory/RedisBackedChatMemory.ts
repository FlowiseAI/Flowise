import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ICommonObject } from '../../../src'
import { BufferMemory } from 'langchain/memory'
import { RedisChatMessageHistory, RedisChatMessageHistoryInput } from 'langchain/stores/message/redis'
import { createClient } from 'redis'

class RedisBackedChatMemory_Memory implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Redis-Backed Chat Memory'
        this.name = 'RedisBackedChatMemory'
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
                description: 'if empty, chatId will be used automatically',
                default: '',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Session Timeouts',
                name: 'sessionTTL',
                type: 'number',
                description: 'Omit this parameter to make sessions never expire',
                optional: true
            },
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return initalizeRedis(nodeData, options)
    }

    async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
        const redis = initalizeRedis(nodeData, options)
        redis.clear()
    }
}

const initalizeRedis = (nodeData: INodeData, options: ICommonObject): BufferMemory => {
    const baseURL = nodeData.inputs?.baseURL as string
    const sessionId = nodeData.inputs?.sessionId as string
    const sessionTTL = nodeData.inputs?.sessionTTL as number
    const memoryKey = nodeData.inputs?.memoryKey as string

    const chatId = options?.chatId as string

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

    let redisChatMessageHistory = new RedisChatMessageHistory(obj)
    let redis = new BufferMemory({ memoryKey, chatHistory: redisChatMessageHistory, returnMessages: true })

    return redis
}

module.exports = { nodeClass: RedisBackedChatMemory_Memory }
