import {
    IMessage,
    IDatabaseEntity,
    INode,
    INodeData,
    INodeParams,
    MemoryMethods,
    ICommonObject,
    FlowiseSummaryBufferMemory
} from '../../../src/Interface'
import { getBaseClasses, mapChatMessageToBaseMessage } from '../../../src/utils'
import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { BaseMessage, getBufferString, HumanMessage } from '@langchain/core/messages'
import { ConversationSummaryBufferMemory, ConversationSummaryBufferMemoryInput } from '@langchain/classic/memory'
import { createHash } from 'crypto'
import { DataSource, Equal, MoreThan } from 'typeorm'
import { ChatAnthropic } from '../../chatmodels/ChatAnthropic/FlowiseChatAnthropic'

const MAX_STATE_WRITE_ATTEMPTS = 2

interface SummaryBufferState {
    stateKey: string
    summary: string
    cursorCreatedDate?: Date | null
    cursorMessageId?: string | null
    version: number
}

interface StoredChatMessage {
    id: string
    createdDate: Date
    [key: string]: any
}

interface BufferEntry {
    message: BaseMessage
    storedMessage?: StoredChatMessage
}

interface PreparedMessages {
    messages: BaseMessage[]
    state: SummaryBufferState | null
    summary?: string
    checkpoint?: StoredChatMessage
}

class ConversationSummaryBufferMemory_Memory implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Conversation Summary Buffer Memory'
        this.name = 'conversationSummaryBufferMemory'
        this.version = 1.0
        this.type = 'ConversationSummaryBufferMemory'
        this.icon = 'memory.svg'
        this.category = 'Memory'
        this.description = 'Uses token length to decide when to summarize conversations'
        this.baseClasses = [this.type, ...getBaseClasses(ConversationSummaryBufferMemory)]
        this.inputs = [
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'Max Token Limit',
                name: 'maxTokenLimit',
                type: 'number',
                default: 2000,
                description: 'Summarize conversations once token limit is reached. Default to 2000'
            },
            {
                label: 'Session Id',
                name: 'sessionId',
                type: 'string',
                description:
                    'If not specified, a random id will be used. Learn <a target="_blank" href="https://docs.flowiseai.com/memory#ui-and-embedded-chat">more</a>',
                default: '',
                optional: true,
                additionalParams: true
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
        const model = nodeData.inputs?.model as BaseLanguageModel
        const _maxTokenLimit = nodeData.inputs?.maxTokenLimit as string
        const maxTokenLimit = _maxTokenLimit ? parseInt(_maxTokenLimit, 10) : 2000
        const sessionId = nodeData.inputs?.sessionId as string
        const memoryKey = (nodeData.inputs?.memoryKey as string) ?? 'chat_history'

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const chatflowid = options.chatflowid as string
        const orgId = options.orgId as string

        const obj: ConversationSummaryBufferMemoryInput & BufferMemoryExtendedInput = {
            llm: model,
            sessionId,
            memoryKey,
            maxTokenLimit,
            returnMessages: true,
            appDataSource,
            databaseEntities,
            chatflowid,
            orgId,
            nodeId: nodeData.id
        }

        return new ConversationSummaryBufferMemoryExtended(obj)
    }
}

interface BufferMemoryExtendedInput {
    sessionId: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
    orgId: string
    nodeId: string
}

class ConversationSummaryBufferMemoryExtended extends FlowiseSummaryBufferMemory implements MemoryMethods {
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
    orgId: string
    nodeId: string
    sessionId = ''

    constructor(fields: ConversationSummaryBufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.sessionId = fields.sessionId
        this.appDataSource = fields.appDataSource
        this.databaseEntities = fields.databaseEntities
        this.chatflowid = fields.chatflowid
        this.orgId = fields.orgId
        this.nodeId = fields.nodeId
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        if (!id) return []

        let baseMessages: BaseMessage[] = []
        const stateKey = this.getStateKey(id)
        const canPersist = !prependMessages?.length

        for (let attempt = 0; attempt < MAX_STATE_WRITE_ATTEMPTS; attempt += 1) {
            const prepared = await this.prepareMessages(id, stateKey, prependMessages)
            baseMessages = prepared.messages

            if (!canPersist || !prepared.summary || !prepared.checkpoint) break

            const didPersist = await this.persistState(id, stateKey, prepared.state, prepared.summary, prepared.checkpoint)
            if (didPersist) break
        }

        if (returnBaseMessages) {
            return baseMessages
        }

        const returnIMessages: IMessage[] = []
        for (const m of baseMessages) {
            returnIMessages.push({
                message: m.content as string,
                type: m._getType() === 'human' ? 'userMessage' : 'apiMessage'
            })
        }

        return returnIMessages
    }

    private getStateKey(sessionId: string): string {
        return createHash('sha256')
            .update(JSON.stringify([this.chatflowid, sessionId, this.nodeId]))
            .digest('hex')
    }

    private async prepareMessages(sessionId: string, stateKey: string, prependMessages?: IMessage[]): Promise<PreparedMessages> {
        const stateRepository = this.appDataSource.getRepository(this.databaseEntities['ConversationSummaryBufferState'])
        const state = (await stateRepository.findOneBy({ stateKey })) as SummaryBufferState | null
        const storedMessages = await this.getStoredMessages(sessionId, state)
        const entries = await this.mapMessages(prependMessages ?? [], storedMessages)
        const previousSummary = state?.summary ?? ''

        this.movingSummaryBuffer = previousSummary

        if (!this.llm || typeof this.llm === 'string') {
            return {
                messages: this.prependSummary(
                    entries.map((entry) => entry.message),
                    previousSummary
                ),
                state
            }
        }

        let currBufferLength = await this.getBufferTokenLength(entries, previousSummary)
        const prunedEntries: BufferEntry[] = []

        while (currBufferLength > this.maxTokenLimit && entries.length) {
            const poppedEntry = entries.shift()
            if (poppedEntry) prunedEntries.push(poppedEntry)
            currBufferLength = await this.getBufferTokenLength(entries, previousSummary)
        }

        if (!prunedEntries.length) {
            return {
                messages: this.prependSummary(
                    entries.map((entry) => entry.message),
                    previousSummary
                ),
                state
            }
        }

        const summary = await this.predictNewSummary(
            prunedEntries.map((entry) => entry.message),
            previousSummary
        )
        this.movingSummaryBuffer = summary

        let checkpoint: StoredChatMessage | undefined
        for (const entry of prunedEntries) {
            if (entry.storedMessage) checkpoint = entry.storedMessage
        }

        return {
            messages: this.prependSummary(
                entries.map((entry) => entry.message),
                summary
            ),
            state,
            summary,
            checkpoint
        }
    }

    private async getStoredMessages(sessionId: string, state: SummaryBufferState | null): Promise<StoredChatMessage[]> {
        const messageRepository = this.appDataSource.getRepository(this.databaseEntities['ChatMessage'])
        const baseWhere: Record<string, any> = {
            sessionId,
            chatflowid: this.chatflowid
        }
        let where: Record<string, any> | Array<Record<string, any>> = baseWhere

        if (state?.cursorCreatedDate && state.cursorMessageId) {
            where = [
                { ...baseWhere, createdDate: MoreThan(state.cursorCreatedDate) },
                { ...baseWhere, createdDate: Equal(state.cursorCreatedDate), id: MoreThan(state.cursorMessageId) }
            ]
        }

        const messages = (await messageRepository.find({
            where,
            order: {
                createdDate: 'ASC',
                id: 'ASC'
            }
        })) as StoredChatMessage[]

        if (!state?.cursorCreatedDate || !state.cursorMessageId) return messages

        const cursorTime = new Date(state.cursorCreatedDate).getTime()
        return messages.filter((message) => {
            const messageTime = new Date(message.createdDate).getTime()
            return messageTime > cursorTime || (messageTime === cursorTime && message.id > state.cursorMessageId!)
        })
    }

    private async mapMessages(prependMessages: IMessage[], storedMessages: StoredChatMessage[]): Promise<BufferEntry[]> {
        const inputs = [
            ...prependMessages.map((message) => ({ message, storedMessage: undefined })),
            ...storedMessages.map((message) => ({ message, storedMessage: message }))
        ]

        const entries: Array<BufferEntry | undefined> = await Promise.all(
            inputs.map(async ({ message, storedMessage }): Promise<BufferEntry | undefined> => {
                const [baseMessage] = await mapChatMessageToBaseMessage([message], this.orgId)
                if (!baseMessage) return undefined
                return storedMessage ? { message: baseMessage, storedMessage } : { message: baseMessage }
            })
        )

        return entries.filter((entry): entry is BufferEntry => entry !== undefined)
    }

    private async getBufferTokenLength(entries: BufferEntry[], summary: string): Promise<number> {
        const messages = this.prependSummary(
            entries.map((entry) => entry.message),
            summary
        )
        return await this.llm.getNumTokens(getBufferString(messages, this.humanPrefix, this.aiPrefix))
    }

    private prependSummary(messages: BaseMessage[], summary: string): BaseMessage[] {
        if (!summary) return messages

        // Anthropic doesn't support multiple system messages
        if (this.llm instanceof ChatAnthropic) {
            return [new HumanMessage(`Below is the summarized conversation:\n\n${summary}`), ...messages]
        }

        return [new this.summaryChatMessageClass(summary), ...messages]
    }

    private async persistState(
        sessionId: string,
        stateKey: string,
        state: SummaryBufferState | null,
        summary: string,
        checkpoint: StoredChatMessage
    ): Promise<boolean> {
        const stateRepository = this.appDataSource.getRepository(this.databaseEntities['ConversationSummaryBufferState'])
        const nextVersion = (state?.version ?? 0) + 1
        const values = {
            chatflowid: this.chatflowid,
            sessionId,
            nodeId: this.nodeId,
            summary,
            cursorCreatedDate: checkpoint.createdDate,
            cursorMessageId: checkpoint.id,
            version: nextVersion
        }

        if (state) {
            const result = await stateRepository.update({ stateKey, version: state.version }, values)
            return result.affected === 1
        }

        try {
            await stateRepository.insert({ stateKey, ...values })
            return true
        } catch (error) {
            const existingState = await stateRepository.findOneBy({ stateKey })
            if (existingState) return false
            throw error
        }
    }

    async addChatMessages(): Promise<void> {
        // adding chat messages is done on server level
        return
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        if (!id) return

        const stateRepository = this.appDataSource.getRepository(this.databaseEntities['ConversationSummaryBufferState'])
        await stateRepository.delete({ stateKey: this.getStateKey(id) })
    }
}

module.exports = { nodeClass: ConversationSummaryBufferMemory_Memory }
