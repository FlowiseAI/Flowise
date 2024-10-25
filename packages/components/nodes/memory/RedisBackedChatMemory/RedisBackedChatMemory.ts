import { Redis, RedisOptions } from 'ioredis'
import { isEqual } from 'lodash'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { RedisChatMessageHistory, RedisChatMessageHistoryInput } from '@langchain/community/stores/message/ioredis'
import { mapStoredMessageToChatMessage, BaseMessage, AIMessage, HumanMessage } from '@langchain/core/messages'
import { INode, INodeData, INodeParams, ICommonObject, MessageType, IMessage, MemoryMethods, FlowiseMemory } from '../../../src/Interface'
import {
    convertBaseMessagetoIMessage,
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    mapChatMessageToBaseMessage
} from '../../../src/utils'

let redisClientSingleton: Redis
let redisClientOption: RedisOptions
let redisClientUrl: string

const getRedisClientbyOption = (option: RedisOptions) => {
    if (!redisClientSingleton) {
        // if client doesn't exists
        redisClientSingleton = new Redis(option)
        redisClientOption = option
        return redisClientSingleton
    } else if (redisClientSingleton && !isEqual(option, redisClientOption)) {
        // if client exists but option changed
        redisClientSingleton.quit()
        redisClientSingleton = new Redis(option)
        redisClientOption = option
        return redisClientSingleton
    }
    return redisClientSingleton
}

const getRedisClientbyUrl = (url: string) => {
    if (!redisClientSingleton) {
        // if client doesn't exists
        redisClientSingleton = new Redis(url)
        redisClientUrl = url
        return redisClientSingleton
    } else if (redisClientSingleton && url !== redisClientUrl) {
        // if client exists but option changed
        redisClientSingleton.quit()
        redisClientSingleton = new Redis(url)
        redisClientUrl = url
        return redisClientSingleton
    }
    return redisClientSingleton
}

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
            credentialNames: ['redisCacheApi', 'redisCacheUrlApi']
        }
        this.inputs = [
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
            },
            {
                label: 'Window Size',
                name: 'windowSize',
                type: 'number',
                description: 'Window of size k to surface the last k back-and-forth to use as memory.',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return await initalizeRedis(nodeData, options)
    }
}

const initalizeRedis = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const sessionTTL = nodeData.inputs?.sessionTTL as number
    const memoryKey = nodeData.inputs?.memoryKey as string
    const sessionId = nodeData.inputs?.sessionId as string
    const windowSize = nodeData.inputs?.windowSize as number

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const redisUrl = getCredentialParam('redisUrl', credentialData, nodeData)

    let client: Redis

    if (!redisUrl || redisUrl === '') {
        const username = getCredentialParam('redisCacheUser', credentialData, nodeData)
        const password = getCredentialParam('redisCachePwd', credentialData, nodeData)
        const portStr = getCredentialParam('redisCachePort', credentialData, nodeData)
        const host = getCredentialParam('redisCacheHost', credentialData, nodeData)
        const sslEnabled = getCredentialParam('redisCacheSslEnabled', credentialData, nodeData)

        const tlsOptions = sslEnabled === true ? { tls: { rejectUnauthorized: false } } : {}

        client = getRedisClientbyOption({
            port: portStr ? parseInt(portStr) : 6379,
            host,
            username,
            password,
            ...tlsOptions
        })
    } else {
        client = getRedisClientbyUrl(redisUrl)
    }

    let obj: RedisChatMessageHistoryInput = {
        sessionId,
        client
    }

    if (sessionTTL) {
        obj = {
            ...obj,
            sessionTTL
        }
    }

    const redisChatMessageHistory = new RedisChatMessageHistory(obj)

    const memory = new BufferMemoryExtended({
        memoryKey: memoryKey ?? 'chat_history',
        chatHistory: redisChatMessageHistory,
        sessionId,
        windowSize,
        redisClient: client,
        sessionTTL
    })

    return memory
}

interface BufferMemoryExtendedInput {
    redisClient: Redis
    sessionId: string
    windowSize?: number
    sessionTTL?: number
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    sessionId = ''
    redisClient: Redis
    windowSize?: number
    sessionTTL?: number

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.sessionId = fields.sessionId
        this.redisClient = fields.redisClient
        this.windowSize = fields.windowSize
        this.sessionTTL = fields.sessionTTL
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        if (!this.redisClient) return []

        const id = overrideSessionId ? overrideSessionId : this.sessionId
        const rawStoredMessages = await this.redisClient.lrange(id, this.windowSize ? this.windowSize * -1 : 0, -1)
        const orderedMessages = rawStoredMessages.reverse().map((message) => JSON.parse(message))
        const baseMessages = orderedMessages.map(mapStoredMessageToChatMessage)
        if (prependMessages?.length) {
            baseMessages.unshift(...(await mapChatMessageToBaseMessage(prependMessages)))
        }
        return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        if (!this.redisClient) return

        const id = overrideSessionId ? overrideSessionId : this.sessionId
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')

        if (input) {
            const newInputMessage = new HumanMessage(input.text)
            const messageToAdd = [newInputMessage].map((msg) => msg.toDict())
            await this.redisClient.lpush(id, JSON.stringify(messageToAdd[0]))
            if (this.sessionTTL) await this.redisClient.expire(id, this.sessionTTL)
        }

        if (output) {
            const newOutputMessage = new AIMessage(output.text)
            const messageToAdd = [newOutputMessage].map((msg) => msg.toDict())
            await this.redisClient.lpush(id, JSON.stringify(messageToAdd[0]))
            if (this.sessionTTL) await this.redisClient.expire(id, this.sessionTTL)
        }
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        if (!this.redisClient) return

        const id = overrideSessionId ? overrideSessionId : this.sessionId
        await this.redisClient.del(id)
        await this.clear()
    }
}

module.exports = { nodeClass: RedisBackedChatMemory_Memory }
