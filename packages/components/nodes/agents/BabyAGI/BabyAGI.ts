import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { BabyAGI } from './core'
import { BaseChatModel } from 'langchain/chat_models/base'
import { VectorStore } from 'langchain/vectorstores'

class BabyAGI_Agents implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'BabyAGI'
        this.name = 'babyAGI'
        this.type = 'BabyAGI'
        this.category = 'Agents'
        this.icon = 'babyagi.jpg'
        this.description = 'Task Driven Autonomous Agent which creates new task and reprioritizes task list based on objective'
        this.baseClasses = ['BabyAGI']
        this.inputs = [
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'Vector Store',
                name: 'vectorStore',
                type: 'VectorStore'
            },
            {
                label: 'Task Loop',
                name: 'taskLoop',
                type: 'number',
                default: 3
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseChatModel
        const vectorStore = nodeData.inputs?.vectorStore as VectorStore
        const taskLoop = nodeData.inputs?.taskLoop as string
        const k = (vectorStore as any)?.k ?? 4

        const babyAgi = BabyAGI.fromLLM(model, vectorStore, parseInt(taskLoop, 10), k)
        return babyAgi
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const executor = nodeData.instance as BabyAGI
        const objective = input

        const res = await executor.call({ objective })
        return res
    }
}

module.exports = { nodeClass: BabyAGI_Agents }
