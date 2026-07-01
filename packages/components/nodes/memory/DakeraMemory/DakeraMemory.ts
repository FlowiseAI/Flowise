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

    async store(content: string, sessionId: string, agentId: string): Promise<void> {
        await fetch(`${this.baseUrl}/v1/memories`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ content, session_id: sessionId, agent_id: agentId }),
        })
    }

    async recall(query: string, sessionId: string, agentId: string, topK = 10): Promise<DakeraSearchResult[]> {
        const res = await fetch(`${this.baseUrl}/v1/memories/search`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ query, session_id: sessionId, agent_id: agentId, top_k: topK }),
        })
        if (!res.ok) return []
        const data = (await res.json()) as { results?: DakeraSearchResult[] }
        return data.results ?? []
    }

    async forget(sessionId: string, agentId: string): Promise<void> {
        await fetch(`${this.baseUrl}/v1/memories`, {
            method: 'DELETE',
            headers: this.headers,
            body: JSON.stringify({ session_id: sessionId, agent_id: agentId }),
        })
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
                default: 'http://localhost:3000',
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
        const baseUrl = (nodeData.inputs?.baseUrl as string) || 'http://localhost:3000'
        const agentId = (nodeData.inputs?.agentId as string) || 'flowise'
        const topK = Number(nodeData.inputs?.topK ?? 10)
        const memoryKey = (nodeData.inputs?.memoryKey as string) || 'history'
        const sessionId = (nodeData.inputs?.sessionId as string) || ''

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
        const results = await this.client.recall(query, sid, this.agentId, this.topK)
        const historyText = results.map((r) => r.content).join('\n')
        return { [this.memoryKey]: historyText }
    }

    async saveContext(inputValues: InputValues, outputValues: OutputValues, overrideSessionId = ''): Promise<void> {
        const sid = overrideSessionId || this.sessionId || 'default'
        const userMsg = (inputValues['input'] as string) || ''
        const aiMsg = (outputValues['output'] as string) || ''
        if (userMsg) {
            await this.client.store(`User: ${userMsg}`, sid, this.agentId)
        }
        if (aiMsg) {
            await this.client.store(`Assistant: ${aiMsg}`, sid, this.agentId)
        }
    }

    async clear(overrideSessionId = ''): Promise<void> {
        const sid = overrideSessionId || this.sessionId || 'default'
        await this.client.forget(sid, this.agentId)
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
        const query = this.input || 'conversation history'
        const results = await this.client.recall(query, sid, this.agentId, this.topK)

        const chatMessages = await this.appDataSource
            .getRepository(this.databaseEntities['ChatMessage'])
            .find({
                where: { sessionId: sid, chatflowid: this.chatflowid },
                order: { createdDate: 'ASC' },
                take: 20,
            })

        let returnIMessages: IMessage[] = chatMessages.map((m) => ({
            message: m.content as string,
            type: m.role as MessageType,
        }))

        if (prependMessages?.length) {
            returnIMessages.unshift(...prependMessages)
        }

        if (returnBaseMessages) {
            if (results.length > 0) {
                const memoryContext = results.map((r) => r.content).join('\n')
                const systemMsg = {
                    role: 'apiMessage' as MessageType,
                    content: `Relevant memories from Dakera:\n${memoryContext}`,
                } as any
                chatMessages.unshift(systemMsg)
            }
            return await mapChatMessageToBaseMessage(chatMessages as any, '')
        }

        return returnIMessages
    }

    async addChatMessages(
        msgArray: { text: string; type: MessageType }[],
        overrideSessionId = ''
    ): Promise<void> {
        const sid = overrideSessionId || this.sessionId || 'default'
        const userMsg = msgArray.find((m) => m.type === 'userMessage')
        const aiMsg = msgArray.find((m) => m.type === 'apiMessage')
        if (userMsg && aiMsg) {
            await this.saveContext({ input: userMsg.text }, { output: aiMsg.text }, sid)
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
