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
import { ConversationSummaryBufferMemory, ConversationSummaryBufferMemoryInput } from 'langchain/memory'
import { DataSource } from 'typeorm'
import { ChatAnthropic } from '../../chatmodels/ChatAnthropic/FlowiseChatAnthropic'

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

        const obj: ConversationSummaryBufferMemoryInput & BufferMemoryExtendedInput = {
            llm: model,
            sessionId,
            memoryKey,
            maxTokenLimit,
            returnMessages: true,
            appDataSource,
            databaseEntities,
            chatflowid
        }

        return new ConversationSummaryBufferMemoryExtended(obj)
    }
}

interface BufferMemoryExtendedInput {
    sessionId: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
}

class ConversationSummaryBufferMemoryExtended extends FlowiseSummaryBufferMemory implements MemoryMethods {
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
    sessionId = ''

    constructor(fields: ConversationSummaryBufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.sessionId = fields.sessionId
        this.appDataSource = fields.appDataSource
        this.databaseEntities = fields.databaseEntities
        this.chatflowid = fields.chatflowid
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        if (!id) return []

        let chatMessage = await this.appDataSource.getRepository(this.databaseEntities['ChatMessage']).find({
            where: {
                sessionId: id,
                chatflowid: this.chatflowid
            },
            order: {
                createdDate: 'ASC'
            }
        })

        if (prependMessages?.length) {
            chatMessage.unshift(...prependMessages)
        }

        let baseMessages = await mapChatMessageToBaseMessage(chatMessage)

        // Prune baseMessages if it exceeds max token limit
        if (this.movingSummaryBuffer) {
            baseMessages = [new this.summaryChatMessageClass(this.movingSummaryBuffer), ...baseMessages]
        }

        let currBufferLength = 0

        if (this.llm && typeof this.llm !== 'string') {
            currBufferLength = await this.llm.getNumTokens(getBufferString(baseMessages, this.humanPrefix, this.aiPrefix))
            if (currBufferLength > this.maxTokenLimit) {
                const prunedMemory = []
                while (currBufferLength > this.maxTokenLimit) {
                    const poppedMessage = baseMessages.shift()
                    if (poppedMessage) {
                        prunedMemory.push(poppedMessage)
                        currBufferLength = await this.llm.getNumTokens(getBufferString(baseMessages, this.humanPrefix, this.aiPrefix))
                    }
                }
                this.movingSummaryBuffer = await this.predictNewSummary(prunedMemory, this.movingSummaryBuffer)
            }
        }

        // ----------- Finished Pruning ---------------

        if (this.movingSummaryBuffer) {
            // Anthropic doesn't support multiple system messages
            if (this.llm instanceof ChatAnthropic) {
                baseMessages = [new HumanMessage(`Below is the summarized conversation:\n\n${this.movingSummaryBuffer}`), ...baseMessages]
            } else {
                baseMessages = [new this.summaryChatMessageClass(this.movingSummaryBuffer), ...baseMessages]
            }
        }

        if (returnBaseMessages) {
            return baseMessages
        }

        let returnIMessages: IMessage[] = []
        for (const m of baseMessages) {
            returnIMessages.push({
                message: m.content as string,
                type: m._getType() === 'human' ? 'userMessage' : 'apiMessage'
            })
        }

        return returnIMessages
    }

    async addChatMessages(): Promise<void> {
        // adding chat messages is done on server level
        return
    }

    async clearChatMessages(): Promise<void> {
        // clearing chat messages is done on server level
        return
    }
}

module.exports = { nodeClass: ConversationSummaryBufferMemory_Memory }
