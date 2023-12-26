import { INode, INodeData, INodeParams, ICommonObject, IMessage, MessageType, FlowiseMemory, MemoryMethods } from '../../../src/Interface'
import {
    convertBaseMessagetoIMessage,
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    serializeChatHistory
} from '../../../src/utils'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { RedisChatMessageHistory, RedisChatMessageHistoryInput } from 'langchain/stores/message/ioredis'
import { mapStoredMessageToChatMessage, BaseMessage, AIMessage, HumanMessage } from 'langchain/schema'
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
            credentialNames: ['redisCacheApi', 'redisCacheUrlApi']
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

    //@ts-ignore
    memoryMethods = {
        async clearSessionMemory(nodeData: INodeData, options: ICommonObject): Promise<void> {
            const redis = await initalizeRedis(nodeData, options)
            const sessionId = nodeData.inputs?.sessionId as string
            const chatId = options?.chatId as string
            options.logger.info(`Clearing Redis memory session ${sessionId ? sessionId : chatId}`)
            await redis.clear()
            options.logger.info(`Successfully cleared Redis memory session ${sessionId ? sessionId : chatId}`)
        },
        async getChatMessages(nodeData: INodeData, options: ICommonObject): Promise<string> {
            const memoryKey = nodeData.inputs?.memoryKey as string
            const redis = await initalizeRedis(nodeData, options)
            const key = memoryKey ?? 'chat_history'
            const memoryResult = await redis.loadMemoryVariables({})
            return serializeChatHistory(memoryResult[key])
        }
    }
}

const initalizeRedis = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const sessionTTL = nodeData.inputs?.sessionTTL as number
    const memoryKey = nodeData.inputs?.memoryKey as string
    const windowSize = nodeData.inputs?.windowSize as number
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
    const redisUrl = getCredentialParam('redisUrl', credentialData, nodeData)

    let client: Redis
    if (!redisUrl || redisUrl === '') {
        const username = getCredentialParam('redisCacheUser', credentialData, nodeData)
        const password = getCredentialParam('redisCachePwd', credentialData, nodeData)
        const portStr = getCredentialParam('redisCachePort', credentialData, nodeData)
        const host = getCredentialParam('redisCacheHost', credentialData, nodeData)
        const sslEnabled = getCredentialParam('redisCacheSslEnabled', credentialData, nodeData)

        const tlsOptions = sslEnabled === true ? { tls: { rejectUnauthorized: false } } : {}

        client = new Redis({
            port: portStr ? parseInt(portStr) : 6379,
            host,
            username,
            password,
            ...tlsOptions
        })
    } else {
        client = new Redis(redisUrl)
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

    redisChatMessageHistory.getMessages = async (): Promise<BaseMessage[]> => {
        const rawStoredMessages = await client.lrange((redisChatMessageHistory as any).sessionId, windowSize ? -windowSize : 0, -1)
        const orderedMessages = rawStoredMessages.reverse().map((message) => JSON.parse(message))
        return orderedMessages.map(mapStoredMessageToChatMessage)
    }

    redisChatMessageHistory.addMessage = async (message: BaseMessage): Promise<void> => {
        const messageToAdd = [message].map((msg) => msg.toDict())
        await client.lpush((redisChatMessageHistory as any).sessionId, JSON.stringify(messageToAdd[0]))
        if (sessionTTL) {
            await client.expire((redisChatMessageHistory as any).sessionId, sessionTTL)
        }
    }

    redisChatMessageHistory.clear = async (): Promise<void> => {
        await client.del((redisChatMessageHistory as any).sessionId)
    }

    const memory = new BufferMemoryExtended({
        memoryKey: memoryKey ?? 'chat_history',
        chatHistory: redisChatMessageHistory,
        isSessionIdUsingChatMessageId,
        sessionId,
        redisClient: client
    })
    return memory
}

interface BufferMemoryExtendedInput {
    isSessionIdUsingChatMessageId: boolean
    redisClient: Redis
    sessionId: string
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    isSessionIdUsingChatMessageId? = false
    sessionId = ''
    redisClient: Redis

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.isSessionIdUsingChatMessageId = fields.isSessionIdUsingChatMessageId
        this.sessionId = fields.sessionId
        this.redisClient = fields.redisClient
    }

    async getChatMessages(overrideSessionId = '', returnBaseMessage = false): Promise<IMessage[] | BaseMessage[]> {
        if (!this.redisClient) return []

        const id = overrideSessionId ?? this.sessionId
        const rawStoredMessages = await this.redisClient.lrange(id, 0, -1)
        const orderedMessages = rawStoredMessages.reverse().map((message) => JSON.parse(message))
        const baseMessages = orderedMessages.map(mapStoredMessageToChatMessage)
        return returnBaseMessage ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        if (!this.redisClient) return

        const id = overrideSessionId ?? this.sessionId
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')

        if (input) {
            const newInputMessage = new HumanMessage(input.text)
            const messageToAdd = [newInputMessage].map((msg) => msg.toDict())
            await this.redisClient.lpush(id, JSON.stringify(messageToAdd[0]))
        }

        if (output) {
            const newOutputMessage = new AIMessage(output.text)
            const messageToAdd = [newOutputMessage].map((msg) => msg.toDict())
            await this.redisClient.lpush(id, JSON.stringify(messageToAdd[0]))
        }
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        if (!this.redisClient) return

        const id = overrideSessionId ?? this.sessionId
        await this.redisClient.del(id)
        await this.clear()
    }

    async resumeMessages(): Promise<void> {
        return
    }
}

module.exports = { nodeClass: RedisBackedChatMemory_Memory }
