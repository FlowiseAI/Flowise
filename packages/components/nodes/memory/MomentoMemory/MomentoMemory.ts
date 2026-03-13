import { CacheClient, Configurations, CredentialProvider } from '@gomomento/sdk'
import { mapStoredMessageToChatMessage, AIMessage, HumanMessage, BaseMessage, StoredMessage } from '@langchain/core/messages'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import {
    convertBaseMessagetoIMessage,
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    mapChatMessageToBaseMessage
} from '../../../src/utils'
import { FlowiseMemory, ICommonObject, IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'

class Momento_Memory implements INode {
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
        this.label = 'Momento Chat Memory'
        this.name = 'MomentoChatMemory'
        this.version = 1.0
        this.type = 'MomentoChatMemory'
        this.icon = 'Momento.svg'
        this.category = 'Memory'
        this.description = 'Stores the conversation in Momento cache'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['momentoCacheApi']
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
                description: 'Seconds till a session expires. If not specified, defaults to 24 hours.',
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
        return initializeMomento(nodeData, options)
    }
}

const initializeMomento = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const sessionId = nodeData.inputs?.sessionId as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const _sessionTTL = nodeData.inputs?.sessionTTL as string
    const parsedSessionTTL = _sessionTTL ? parseInt(_sessionTTL, 10) : undefined
    const sessionTTL = parsedSessionTTL && !isNaN(parsedSessionTTL) ? parsedSessionTTL : undefined

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const cacheName = getCredentialParam('momentoCache', credentialData, nodeData)
    const apiKey = getCredentialParam('momentoApiKey', credentialData, nodeData)

    const cacheClient = new CacheClient({
        configuration: Configurations.Laptop.v1(),
        credentialProvider: CredentialProvider.fromString({ apiKey }),
        defaultTtlSeconds: sessionTTL ?? 60 * 60 * 24
    })

    const orgId = options.orgId as string

    return new BufferMemoryExtended({
        memoryKey: memoryKey ?? 'chat_history',
        cacheName,
        cacheClient,
        sessionId,
        orgId
    })
}

interface BufferMemoryExtendedInput {
    cacheName: string
    cacheClient: CacheClient
    sessionId: string
    orgId: string
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    cacheName: string
    cacheClient: CacheClient
    sessionId = ''
    orgId = ''

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.cacheName = fields.cacheName
        this.cacheClient = fields.cacheClient
        this.sessionId = fields.sessionId
        this.orgId = fields.orgId
    }

    private resolveSessionId(overrideSessionId = ''): string {
        return overrideSessionId || this.sessionId || 'flowise_default_session'
    }

    private async readStoredMessages(id: string): Promise<StoredMessage[]> {
        const getResponse = await this.cacheClient.get(this.cacheName, id)
        const valueString = typeof (getResponse as any).valueString === 'function' ? (getResponse as any).valueString() : undefined
        if (!valueString) return []

        try {
            const parsed = JSON.parse(valueString)
            if (!Array.isArray(parsed)) return []
            return parsed.filter((message) => message?.type && message?.data?.content)
        } catch {
            return []
        }
    }

    private async writeStoredMessages(id: string, messages: StoredMessage[]): Promise<void> {
        await this.cacheClient.set(this.cacheName, id, JSON.stringify(messages))
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const id = this.resolveSessionId(overrideSessionId)
        const storedMessages = await this.readStoredMessages(id)

        const baseMessages = storedMessages.map(mapStoredMessageToChatMessage)
        if (prependMessages?.length) {
            baseMessages.unshift(...(await mapChatMessageToBaseMessage(prependMessages, this.orgId)))
        }

        return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        const id = this.resolveSessionId(overrideSessionId)
        const existingMessages = await this.readStoredMessages(id)

        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')

        if (input) {
            const newInputMessage = new HumanMessage(input.text)
            existingMessages.push(newInputMessage.toDict())
        }

        if (output) {
            const newOutputMessage = new AIMessage(output.text)
            existingMessages.push(newOutputMessage.toDict())
        }

        await this.writeStoredMessages(id, existingMessages)
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        const id = this.resolveSessionId(overrideSessionId)
        await this.cacheClient.delete(this.cacheName, id)
        await this.clear()
    }
}

module.exports = { nodeClass: Momento_Memory }
