import { Redis } from '@upstash/redis'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { UpstashRedisChatMessageHistory } from 'langchain/stores/message/upstash_redis'
import { mapStoredMessageToChatMessage, AIMessage, HumanMessage, StoredMessage } from 'langchain/schema'
import { IMessage, INode, INodeData, INodeParams, MessageType } from '../../../src/Interface'
import { convertBaseMessagetoIMessage, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ICommonObject } from '../../../src/Interface'

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
        this.version = 1.0
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
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return initalizeUpstashRedis(nodeData, options)
    }
}

const initalizeUpstashRedis = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const baseURL = nodeData.inputs?.baseURL as string
    const sessionTTL = nodeData.inputs?.sessionTTL as string
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
    const upstashRestToken = getCredentialParam('upstashRestToken', credentialData, nodeData)

    const client = new Redis({
        url: baseURL,
        token: upstashRestToken
    })

    const redisChatMessageHistory = new UpstashRedisChatMessageHistory({
        sessionId: sessionId ? sessionId : chatId,
        sessionTTL: sessionTTL ? parseInt(sessionTTL, 10) : undefined,
        client
    })

    const memory = new BufferMemoryExtended({
        memoryKey: 'chat_history',
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

class BufferMemoryExtended extends BufferMemory {
    isSessionIdUsingChatMessageId = false
    sessionId = ''
    redisClient: Redis

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.isSessionIdUsingChatMessageId = fields.isSessionIdUsingChatMessageId
        this.sessionId = fields.sessionId
        this.redisClient = fields.redisClient
    }

    async getChatMessages(overrideSessionId = ''): Promise<IMessage[]> {
        if (!this.redisClient) return []

        const id = overrideSessionId ?? this.sessionId
        const rawStoredMessages: StoredMessage[] = await this.redisClient.lrange<StoredMessage>(id, 0, -1)
        const orderedMessages = rawStoredMessages.reverse()
        const previousMessages = orderedMessages.filter((x): x is StoredMessage => x.type !== undefined && x.data.content !== undefined)
        const baseMessages = previousMessages.map(mapStoredMessageToChatMessage)
        return convertBaseMessagetoIMessage(baseMessages)
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
}

module.exports = { nodeClass: UpstashRedisBackedChatMemory_Memory }
