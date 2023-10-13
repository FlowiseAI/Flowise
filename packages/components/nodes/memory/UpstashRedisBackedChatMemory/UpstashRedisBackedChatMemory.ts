import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ICommonObject } from '../../../src'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { UpstashRedisChatMessageHistory } from 'langchain/stores/message/upstash_redis'

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
    const sessionTTL = nodeData.inputs?.sessionTTL as string
    const chatId = options?.chatId as string

    let isSessionIdUsingChatMessageId = false
    if (!sessionId && chatId) isSessionIdUsingChatMessageId = true

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const upstashRestToken = getCredentialParam('upstashRestToken', credentialData, nodeData)

    const redisChatMessageHistory = new UpstashRedisChatMessageHistory({
        sessionId: sessionId ? sessionId : chatId,
        sessionTTL: sessionTTL ? parseInt(sessionTTL, 10) : undefined,
        config: {
            url: baseURL,
            token: upstashRestToken
        }
    })

    const memory = new BufferMemoryExtended({
        chatHistory: redisChatMessageHistory,
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
