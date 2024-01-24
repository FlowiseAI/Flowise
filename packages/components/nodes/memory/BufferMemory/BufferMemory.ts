import { FlowiseMemory, IMessage, INode, INodeData, INodeParams, MemoryMethods } from '../../../src/Interface'
import { convertBaseMessagetoIMessage, getBaseClasses } from '../../../src/utils'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { BaseMessage } from 'langchain/schema'

class BufferMemory_Memory implements INode {
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
        this.label = 'Buffer Memory'
        this.name = 'bufferMemory'
        this.version = 1.0
        this.type = 'BufferMemory'
        this.icon = 'memory.svg'
        this.category = 'Memory'
        this.description = 'Remembers previous conversational back and forths directly'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
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
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const memoryKey = nodeData.inputs?.memoryKey as string
        const inputKey = nodeData.inputs?.inputKey as string
        return new BufferMemoryExtended({
            returnMessages: true,
            memoryKey,
            inputKey
        })
    }
}

class BufferMemoryExtended extends FlowiseMemory implements MemoryMethods {
    constructor(fields: BufferMemoryInput) {
        super(fields)
    }

    async getChatMessages(_?: string, returnBaseMessages = false, prevHistory: IMessage[] = []): Promise<IMessage[] | BaseMessage[]> {
        await this.chatHistory.clear()

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

module.exports = { nodeClass: BufferMemory_Memory }
