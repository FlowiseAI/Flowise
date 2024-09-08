import { Redis, RedisConfigNodejs } from '@upstash/redis'
import { isEqual } from 'lodash'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { UpstashRedisChatMessageHistory } from '@langchain/community/stores/message/upstash_redis'
import { mapStoredMessageToChatMessage, AIMessage, HumanMessage, StoredMessage, BaseMessage } from '@langchain/core/messages'
import { FlowiseMemory, IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'
import {
    convertBaseMessagetoIMessage,
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    mapChatMessageToBaseMessage
} from '../../../src/utils'
import { ICommonObject } from '../../../src/Interface'

let redisClientSingleton: Redis
let redisClientOption: RedisConfigNodejs

const getRedisClientbyOption = (option: RedisConfigNodejs) => {
    if (!redisClientSingleton) {
        // if client doesn't exists
        redisClientSingleton = new Redis(option)
        redisClientOption = option
        return redisClientSingleton
    } else if (redisClientSingleton && !isEqual(option, redisClientOption)) {
        // if client exists but option changed
        redisClientSingleton = new Redis(option)
        redisClientOption = option
        return redisClientSingleton
    }
    return redisClientSingleton
}

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
        this.name = 'upstashRedisBackedChatMemory'
        this.version = 2.0
        this.type = 'UpstashRedisBackedChatMemory'
        this.icon = 'upstash.svg'
        this.category = 'Memory'
        this.description = 'Summarizes the conversation and stores the memory in Upstash Redis server'
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
                label: 'Upstash Redis REST URL',
                name: 'baseURL',
                type: 'string',
                placeholder: 'https://<your-url>.upstash.io'
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
}

const initalizeUpstashRedis = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const baseURL = nodeData.inputs?.baseURL as string
    const sessionId = nodeData.inputs?.sessionId as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const _sessionTTL = nodeData.inputs?.sessionTTL as string
    const sessionTTL = _sessionTTL ? parseInt(_sessionTTL, 10) : undefined

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const upstashRestToken = getCredentialParam('upstashRestToken', credentialData, nodeData)

    const client = getRedisClientbyOption({
        url: baseURL,
        token: upstashRestToken
    })

    const redisChatMessageHistory = new UpstashRedisChatMessageHistory({
        sessionId,
        sessionTTL,
        client
    })

    const memory = new BufferMemoryExtended({
        memoryKey: memoryKey ?? 'chat_history',
        chatHistory: redisChatMessageHistory,
        sessionId,
        sessionTTL,
        redisClient: client
    })

    return memory
}

interface BufferMemoryExtendedInput {
    redisClient: Redis
    sessionId: string
    sessionTTL?: number
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    sessionId = ''
    redisClient: Redis
    sessionTTL?: number

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.sessionId = fields.sessionId
        this.redisClient = fields.redisClient
        this.sessionTTL = fields.sessionTTL
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        if (!this.redisClient) return []

        const id = overrideSessionId ? overrideSessionId : this.sessionId
        const rawStoredMessages: StoredMessage[] = await this.redisClient.lrange<StoredMessage>(id, 0, -1)
        const orderedMessages = rawStoredMessages.reverse()
        const previousMessages = orderedMessages.filter((x): x is StoredMessage => x.type !== undefined && x.data.content !== undefined)
        const baseMessages = previousMessages.map(mapStoredMessageToChatMessage)
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

module.exports = { nodeClass: UpstashRedisBackedChatMemory_Memory }
