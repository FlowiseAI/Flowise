import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { BufferWindowMemory, BufferWindowMemoryInput } from 'langchain/memory'

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
        this.description = 'Uses a window of size k to surface the last k back-and-forths to use as memory'
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
                description: 'Window of size k to surface the last k back-and-forths to use as memory.'
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

        return new BufferWindowMemory(obj)
    }
}

module.exports = { nodeClass: BufferWindowMemory_Memory }
