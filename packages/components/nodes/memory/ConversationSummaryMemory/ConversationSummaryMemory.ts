import { FlowiseSummaryMemory, IMessage, INode, INodeData, INodeParams, MemoryMethods } from '../../../src/Interface'
import { convertBaseMessagetoIMessage, getBaseClasses } from '../../../src/utils'
import { ConversationSummaryMemory, ConversationSummaryMemoryInput } from 'langchain/memory'
import { BaseLanguageModel } from 'langchain/base_language'
import { BaseMessage } from '@langchain/core/messages'

class ConversationSummaryMemory_Memory implements INode {
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
        this.label = 'Conversation Summary Memory'
        this.name = 'conversationSummaryMemory'
        this.version = 1.0
        this.type = 'ConversationSummaryMemory'
        this.icon = 'memory.svg'
        this.category = 'Memory'
        this.description = 'Summarizes the conversation and stores the current summary in memory'
        this.baseClasses = [this.type, ...getBaseClasses(ConversationSummaryMemory)]
        this.inputs = [
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history'
            },
            {
                label: 'Input Key',
                name: 'inputKey',
                type: 'string',
                default: 'input'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const memoryKey = nodeData.inputs?.memoryKey as string
        const inputKey = nodeData.inputs?.inputKey as string

        const obj: ConversationSummaryMemoryInput = {
            llm: model,
            returnMessages: true,
            memoryKey,
            inputKey
        }

        return new ConversationSummaryMemoryExtended(obj)
    }
}

class ConversationSummaryMemoryExtended extends FlowiseSummaryMemory implements MemoryMethods {
    constructor(fields: ConversationSummaryMemoryInput) {
        super(fields)
    }

    async getChatMessages(_?: string, returnBaseMessages = false, prevHistory: IMessage[] = []): Promise<IMessage[] | BaseMessage[]> {
        await this.chatHistory.clear()
        this.buffer = ''

        for (const msg of prevHistory) {
            if (msg.type === 'userMessage') await this.chatHistory.addUserMessage(msg.message)
            else if (msg.type === 'apiMessage') await this.chatHistory.addAIChatMessage(msg.message)
        }

        // Get summary
        const chatMessages = await this.chatHistory.getMessages()
        this.buffer = chatMessages.length ? await this.predictNewSummary(chatMessages.slice(-2), this.buffer) : ''

        const memoryResult = await this.loadMemoryVariables({})
        const baseMessages = memoryResult[this.memoryKey ?? 'chat_history']
        return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(): Promise<void> {
        // adding chat messages will be done on the fly in getChatMessages()
        return
    }

    async clearChatMessages(): Promise<void> {
        await this.clear()
    }
}

module.exports = { nodeClass: ConversationSummaryMemory_Memory }
