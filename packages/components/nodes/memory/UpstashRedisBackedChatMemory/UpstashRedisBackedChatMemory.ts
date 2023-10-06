import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ICommonObject } from '../../../src'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { UpstashRedisChatMessageHistory, UpstashRedisChatMessageHistoryInput } from 'langchain/stores/message/upstash_redis'
import { Redis, RedisConfigNodejs } from '@upstash/redis'

class UpstashRedisBackedChatMemory_Memory implements INode {
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
        this.label = 'Upstash Redis-Backed Chat Memory'
        this.name = 'UpstashRedisBackedChatMemory'
        this.version = 1.0
        this.type = 'UpstashRedisBackedChatMemory'
        this.icon = 'upstash.svg'
        this.category = 'Memory'
        this.description = 'Summarizes the conversation and stores the memory in upstash Redis server'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Configure password authentication on your upstash redis instance',
            credentialNames: ['upstashRedisMemoryApi']
        }
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseURL',
                type: 'string',
                default: 'https://<your-url>.upstash.io'
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
        return initalizeUpstashRedis(nodeData, options)
    }

    async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
        const redis = await initalizeUpstashRedis(nodeData, options)
        const sessionId = nodeData.inputs?.sessionId as string
        const chatId = options?.chatId as string
        options.logger.info(`Clearing Upstash Redis memory session ${sessionId ? sessionId : chatId}`)
        await redis.clear()
        options.logger.info(`Successfully cleared Upstash Redis memory session ${sessionId ? sessionId : chatId}`)
    }
}

const initalizeUpstashRedis = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const baseURL = nodeData.inputs?.baseURL as string
    const sessionId = nodeData.inputs?.sessionId as string
    const sessionTTL = nodeData.inputs?.sessionTTL as number
    const memoryKey = nodeData.inputs?.memoryKey as string
    const chatId = options?.chatId as string

    let isSessionIdUsingChatMessageId = false
    if (!sessionId && chatId) isSessionIdUsingChatMessageId = true

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const upstashRedisPassword = getCredentialParam('upstashRedisPassword', credentialData, nodeData)

    const upstashRedisConfig = { url: baseURL, token: upstashRedisPassword } as RedisConfigNodejs
    const redisClient = new Redis(upstashRedisConfig)
    let obj: UpstashRedisChatMessageHistoryInput = {
        sessionId: sessionId ? sessionId : chatId,
        client: redisClient
    }

    if (sessionTTL) {
        obj = {
            ...obj,
            sessionTTL
        }
    }

    const redisChatMessageHistory = new UpstashRedisChatMessageHistory(obj)

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

module.exports = { nodeClass: UpstashRedisBackedChatMemory_Memory }
