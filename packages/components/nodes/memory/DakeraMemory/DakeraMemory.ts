import { BaseMessage } from '@langchain/core/messages'
import { InputValues, MemoryVariables, OutputValues } from '@langchain/core/memory'
import { BaseChatMemory, BaseChatMemoryInput } from '@langchain/community/memory/chat_memory'
import { ICommonObject, IDatabaseEntity } from '../../../src'
import { IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam, mapChatMessageToBaseMessage } from '../../../src/utils'
import { DataSource } from 'typeorm'

// ---------------------------------------------------------------------------
// Dakera REST client (no external npm package required)
// ---------------------------------------------------------------------------

interface DakeraSearchResult {
    id: string
    content: string
    score: number
    metadata?: Record<string, unknown>
}

// Dakera API response shapes
interface DakeraStoreResponse {
    memory: { id: string; content: string; agent_id: string; session_id?: string }
}

interface DakeraSearchResponse {
    memories: Array<{ memory: { id: string; content: string; metadata?: Record<string, unknown> }; score: number }>
}

class DakeraClient {
    private baseUrl: string
    private headers: Record<string, string>

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl.replace(/\/$/, '')
        this.headers = {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        }
    }

    async store(content: string, sessionId: string, agentId: string): Promise<string> {
        const res = await fetch(`${this.baseUrl}/v1/memory/store`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                content,
                agent_id: agentId,
                ...(sessionId ? { session_id: sessionId } : {}),
            }),
        })
        if (!res.ok) {
            throw new Error(`DakeraClient.store: HTTP ${res.status} ${res.statusText}`)
        }
        const data = (await res.json()) as DakeraStoreResponse
        return data.memory?.id ?? ''
    }

    async recall(query: string, sessionId: string, agentId: string, topK = 10): Promise<DakeraSearchResult[]> {
        const res = await fetch(`${this.baseUrl}/v1/memory/search`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                agent_id: agentId,
                query,
                top_k: topK,
                ...(sessionId ? { session_id: sessionId } : {}),
            }),
        })
        if (!res.ok) {
            throw new Error(`DakeraClient.recall: HTTP ${res.status} ${res.statusText}`)
        }
        const data = (await res.json()) as DakeraSearchResponse
        return (data.memories ?? []).map((item) => ({
            id: item.memory.id,
            content: item.memory.content,
            score: item.score,
            metadata: item.memory.metadata,
        }))
    }

    async forget(sessionId: string, agentId: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/v1/memory/forget`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                agent_id: agentId,
                ...(sessionId ? { session_id: sessionId } : {}),
            }),
        })
        if (!res.ok) {
            throw new Error(`DakeraClient.forget: HTTP ${res.status} ${res.statusText}`)
        }
    }
}

// ---------------------------------------------------------------------------
// Flowise INode — metadata and inputs
// ---------------------------------------------------------------------------

class DakeraMemory_Memory implements INode {
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
        this.label = 'Dakera Memory'
        this.name = 'dakeraMemory'
        this.version = 1.0
        this.type = 'DakeraMemory'
        this.icon = 'dakera.svg'
        this.category = 'Memory'
        this.description =
            'Persistent, decay-weighted vector memory backed by a self-hosted Dakera server. ' +
            'Memories survive restarts and are semantically searchable across sessions.'
        this.baseClasses = [this.type, ...getBaseClasses(DakeraMemoryExtended)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            description: 'API key for your Dakera server (not required for local dev with no auth)',
            credentialNames: ['dakeraMemoryApi'],
        }
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'http://localhost:3300',
                description: 'URL of your self-hosted Dakera server',
            },
            {
                label: 'Session ID',
                name: 'sessionId',
                type: 'string',
                description: 'Groups memories by session. Leave empty to use the Flowise Chat ID.',
                default: '',
                optional: true,
            },
            {
                label: 'Agent ID',
                name: 'agentId',
                type: 'string',
                description: 'Namespace for memories (e.g. the chatflow name)',
                default: 'flowise',
                optional: true,
                additionalParams: true,
            },
            {
                label: 'Top K Memories',
                name: 'topK',
                type: 'number',
                default: 10,
                description: 'Number of memories to retrieve per query',
                optional: true,
                additionalParams: true,
            },
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'history',
                optional: true,
                additionalParams: true,
            },
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<DakeraMemoryExtended> {
        const baseUrl = (nodeData.inputs?.baseUrl as string) || 'http://localhost:3300'
        const agentId = (nodeData.inputs?.agentId as string) || 'flowise'
        const topK = Number(nodeData.inputs?.topK ?? 10)
        const memoryKey = (nodeData.inputs?.memoryKey as string) || 'history'
        const sessionId = (nodeData.inputs?.sessionId as string) || ''
        const orgId = options.orgId as string

        let apiKey = ''
        if (nodeData.credential) {
            const credentialData = await getCredentialData(nodeData.credential, options)
            apiKey = getCredentialParam('apiKey', credentialData, nodeData) || ''
        }

        return new DakeraMemoryExtended({
            baseUrl,
            apiKey,
            agentId,
            topK,
            memoryKey,
            sessionId,
            orgId,
            input,
            appDataSource: options.appDataSource as DataSource,
            databaseEntities: options.databaseEntities as IDatabaseEntity,
            chatflowid: options.chatflowid as string,
        })
    }
}

// ---------------------------------------------------------------------------
// Extended memory class — implements MemoryMethods required by Flowise
// ---------------------------------------------------------------------------

interface DakeraMemoryExtendedInput extends BaseChatMemoryInput {
    baseUrl: string
    apiKey: string
    agentId: string
    topK: number
    memoryKey: string
    sessionId: string
    orgId: string
    input: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
}

class DakeraMemoryExtended extends BaseChatMemory implements MemoryMethods {
    private client: DakeraClient
    private agentId: string
    private topK: number
    private sessionId: string
    private input: string
    orgId: string
    memoryKey: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string

    constructor(fields: DakeraMemoryExtendedInput) {
        super({ returnMessages: true, inputKey: 'input', outputKey: 'output' })
        this.client = new DakeraClient(fields.baseUrl, fields.apiKey)
        this.agentId = fields.agentId
        this.topK = fields.topK
        this.memoryKey = fields.memoryKey
        this.sessionId = fields.sessionId
        this.orgId = fields.orgId
        this.input = fields.input
        this.appDataSource = fields.appDataSource
        this.databaseEntities = fields.databaseEntities
        this.chatflowid = fields.chatflowid
    }

    get memoryKeys(): string[] {
        return [this.memoryKey]
    }

    async loadMemoryVariables(values: InputValues, overrideSessionId = ''): Promise<MemoryVariables> {
        const sid = overrideSessionId || this.sessionId || 'default'
        const query = (values['input'] as string) || this.input || ''
        try {
            const results = await this.client.recall(query, sid, this.agentId, this.topK)
            const historyText = results.map((r) => r.content).join('\n')
            return { [this.memoryKey]: historyText }
        } catch (err) {
            console.error('[DakeraMemory] loadMemoryVariables failed:', err)
            return { [this.memoryKey]: '' }
        }
    }

    async saveContext(inputValues: InputValues, outputValues: OutputValues, overrideSessionId = ''): Promise<void> {
        const sid = overrideSessionId || this.sessionId || 'default'
        const userMsg = (inputValues['input'] as string) || ''
        const aiMsg = (outputValues['output'] as string) || ''
        const stores: Promise<string>[] = []
        if (userMsg) stores.push(this.client.store(`User: ${userMsg}`, sid, this.agentId))
        if (aiMsg) stores.push(this.client.store(`Assistant: ${aiMsg}`, sid, this.agentId))
        try {
            await Promise.all(stores)
        } catch (err) {
            console.error('[DakeraMemory] saveContext failed:', err)
        }
    }

    async clear(overrideSessionId = ''): Promise<void> {
        const sid = overrideSessionId || this.sessionId || 'default'
        try {
            await this.client.forget(sid, this.agentId)
        } catch (err) {
            console.error('[DakeraMemory] clear failed:', err)
        }
    }

    // ------------------------------------------------------------------
    // MemoryMethods interface — required by Flowise runtime
    // ------------------------------------------------------------------

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const sid = overrideSessionId || this.sessionId || 'default'

        // Fetch most recent messages first (DESC), then reverse to chronological order
        let chatMessages = await this.appDataSource
            .getRepository(this.databaseEntities['ChatMessage'])
            .find({
                where: { sessionId: sid, chatflowid: this.chatflowid },
                order: { createdDate: 'DESC' },
                take: 20,
            })
        chatMessages = chatMessages.reverse()

        let returnIMessages: IMessage[] = chatMessages.map((m) => ({
            message: m.content as string,
            type: m.role as MessageType,
        }))

        if (prependMessages?.length) {
            returnIMessages.unshift(...prependMessages)
            chatMessages.unshift(...(prependMessages as any))
        }

        if (returnBaseMessages) {
            // Prepend Dakera semantic recall context ahead of the DB messages
            try {
                const query = this.input || 'conversation history'
                const recalled = await this.client.recall(query, sid, this.agentId, this.topK)
                if (recalled.length > 0) {
                    const memoryContext = recalled.map((r) => r.content).join('\n')
                    const systemMsg = {
                        role: 'apiMessage' as MessageType,
                        content: `Relevant memories from Dakera:\n${memoryContext}`,
                    } as any
                    chatMessages.unshift(systemMsg)
                }
            } catch (err) {
                console.error('[DakeraMemory] getChatMessages recall failed:', err)
            }
            return await mapChatMessageToBaseMessage(chatMessages as any, this.orgId)
        }

        return returnIMessages
    }

    async addChatMessages(
        msgArray: { text: string; type: MessageType }[],
        overrideSessionId = ''
    ): Promise<void> {
        const sid = overrideSessionId || this.sessionId || 'default'
        // Store each message independently — don't require both user and AI to be present
        const stores = msgArray
            .filter((msg) => msg.text)
            .map((msg) => {
                const prefix = msg.type === 'userMessage' ? 'User' : 'Assistant'
                return this.client.store(`${prefix}: ${msg.text}`, sid, this.agentId)
            })
        try {
            await Promise.all(stores)
        } catch (err) {
            console.error('[DakeraMemory] addChatMessages failed:', err)
        }
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        const sid = overrideSessionId || this.sessionId || 'default'
        await this.clear(sid)
        if (sid) {
            await this.appDataSource
                .getRepository(this.databaseEntities['ChatMessage'])
                .delete({ sessionId: sid, chatflowid: this.chatflowid })
        }
    }
}

module.exports = { nodeClass: DakeraMemory_Memory }
