import { FlowiseWindowMemory, IMessage, INode, INodeData, INodeParams, MemoryMethods } from '../../../src/Interface'
import { convertBaseMessagetoIMessage, getBaseClasses } from '../../../src/utils'
import { BufferWindowMemory, BufferWindowMemoryInput } from 'langchain/memory'
import { BaseMessage } from '@langchain/core/messages'

class BufferWindowMemory_Memory implements INode {
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
        this.label = 'Buffer Window Memory'
        this.name = 'bufferWindowMemory'
        this.version = 1.0
        this.type = 'BufferWindowMemory'
        this.icon = 'memory.svg'
        this.category = 'Memory'
        this.description = 'Uses a window of size k to surface the last k back-and-forth to use as memory'
        this.baseClasses = [this.type, ...getBaseClasses(BufferWindowMemory)]
        this.inputs = [
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
            },
            {
                label: 'Size',
                name: 'k',
                type: 'number',
                default: '4',
                description: 'Window of size k to surface the last k back-and-forth to use as memory.'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const memoryKey = nodeData.inputs?.memoryKey as string
        const inputKey = nodeData.inputs?.inputKey as string
        const k = nodeData.inputs?.k as string

        const obj: Partial<BufferWindowMemoryInput> = {
            returnMessages: true,
            memoryKey: memoryKey,
            inputKey: inputKey,
            k: parseInt(k, 10)
        }

        return new BufferWindowMemoryExtended(obj)
    }
}

class BufferWindowMemoryExtended extends FlowiseWindowMemory implements MemoryMethods {
    constructor(fields: BufferWindowMemoryInput) {
        super(fields)
    }

    async getChatMessages(_?: string, returnBaseMessages = false, prevHistory: IMessage[] = []): Promise<IMessage[] | BaseMessage[]> {
        await this.chatHistory.clear()

        // Insert into chatHistory
        for (const msg of prevHistory) {
            if (msg.type === 'userMessage') await this.chatHistory.addUserMessage(msg.message)
            else if (msg.type === 'apiMessage') await this.chatHistory.addAIChatMessage(msg.message)
        }

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

module.exports = { nodeClass: BufferWindowMemory_Memory }
