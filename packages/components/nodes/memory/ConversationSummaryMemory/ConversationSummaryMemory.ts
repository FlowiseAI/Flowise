import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ConversationSummaryMemory, ConversationSummaryMemoryInput } from 'langchain/memory'
import { BaseLanguageModel } from 'langchain/base_language'

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

        return new ConversationSummaryMemory(obj)
    }
}

module.exports = { nodeClass: ConversationSummaryMemory_Memory }
