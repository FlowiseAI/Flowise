import { Redis, RedisOptions } from 'ioredis'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { mapStoredMessageToChatMessage, BaseMessage, AIMessage, HumanMessage } from '@langchain/core/messages'
import { INode, INodeData, INodeParams, ICommonObject, MessageType, IMessage, MemoryMethods, FlowiseMemory } from '../../../src/Interface'
import {
    convertBaseMessagetoIMessage,
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    mapChatMessageToBaseMessage
} from '../../../src/utils'

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
                description: 'Seconds till a session expires. If not specified, the session will never expire.',
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
        return await initializeRedis(nodeData, options)
    }
}

const initializeRedis = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const sessionTTL = nodeData.inputs?.sessionTTL as number
    const memoryKey = nodeData.inputs?.memoryKey as string
    const sessionId = nodeData.inputs?.sessionId as string
    const windowSize = nodeData.inputs?.windowSize as number

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const redisUrl = getCredentialParam('redisUrl', credentialData, nodeData)
    const orgId = options.orgId as string

    const redisOptions = redisUrl
        ? redisUrl
        : ({
              port: parseInt(getCredentialParam('redisCachePort', credentialData, nodeData) || '6379'),
              host: getCredentialParam('redisCacheHost', credentialData, nodeData),
              username: getCredentialParam('redisCacheUser', credentialData, nodeData),
              password: getCredentialParam('redisCachePwd', credentialData, nodeData),
              tls: getCredentialParam('redisCacheSslEnabled', credentialData, nodeData) ? { rejectUnauthorized: false } : undefined
          } as RedisOptions)

    const memory = new BufferMemoryExtended({
        memoryKey: memoryKey ?? 'chat_history',
        sessionId,
        windowSize,
        sessionTTL,
        redisOptions,
        orgId
    })

    return memory
}

interface BufferMemoryExtendedInput {
    sessionId: string
    windowSize?: number
    sessionTTL?: number
    orgId: string
    redisOptions: RedisOptions | string
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    sessionId = ''
    orgId = ''
    windowSize?: number
    sessionTTL?: number
    redisOptions: RedisOptions | string

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.sessionId = fields.sessionId
        this.windowSize = fields.windowSize
        this.sessionTTL = fields.sessionTTL
        this.orgId = fields.orgId
        this.redisOptions = fields.redisOptions
    }

    private async withRedisClient<T>(fn: (client: Redis) => Promise<T>): Promise<T> {
        const client =
            typeof this.redisOptions === 'string'
                ? new Redis(this.redisOptions, {
                      keepAlive:
                          process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                              ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                              : undefined
                  })
                : new Redis({
                      ...this.redisOptions,
                      keepAlive:
                          process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                              ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                              : undefined
                  })
        try {
            return await fn(client)
        } finally {
            await client.quit()
        }
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        return this.withRedisClient(async (client) => {
            const id = overrideSessionId ? overrideSessionId : this.sessionId
            const rawStoredMessages = await client.lrange(id, this.windowSize ? this.windowSize * -1 : 0, -1)
            const orderedMessages = rawStoredMessages.reverse().map((message) => JSON.parse(message))
            const baseMessages = orderedMessages.map(mapStoredMessageToChatMessage)
            if (prependMessages?.length) {
                baseMessages.unshift(...(await mapChatMessageToBaseMessage(prependMessages, this.orgId)))
            }
            return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
        })
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        await this.withRedisClient(async (client) => {
            const id = overrideSessionId ? overrideSessionId : this.sessionId
            const input = msgArray.find((msg) => msg.type === 'userMessage')
            const output = msgArray.find((msg) => msg.type === 'apiMessage')

            if (input) {
                const newInputMessage = new HumanMessage(input.text)
                const messageToAdd = [newInputMessage].map((msg) => msg.toDict())
                await client.lpush(id, JSON.stringify(messageToAdd[0]))
                if (this.sessionTTL) await client.expire(id, this.sessionTTL)
            }

            if (output) {
                const newOutputMessage = new AIMessage(output.text)
                const messageToAdd = [newOutputMessage].map((msg) => msg.toDict())
                await client.lpush(id, JSON.stringify(messageToAdd[0]))
                if (this.sessionTTL) await client.expire(id, this.sessionTTL)
            }
        })
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        await this.withRedisClient(async (client) => {
            const id = overrideSessionId ? overrideSessionId : this.sessionId
            await client.del(id)
            await this.clear()
        })
    }
}

module.exports = { nodeClass: RedisBackedChatMemory_Memory }
