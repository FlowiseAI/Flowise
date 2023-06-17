import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { BaseChatModel } from 'langchain/chat_models/base'
import { AutoGPT } from 'langchain/experimental/autogpt'
import { Tool } from 'langchain/tools'
import { VectorStoreRetriever } from 'langchain/vectorstores/base'
import { flatten } from 'lodash'

class AutoGPT_Agents implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'AutoGPT'
        this.name = 'autoGPT'
        this.type = 'AutoGPT'
        this.category = 'Agents'
        this.icon = 'autogpt.png'
        this.description = 'Autonomous agent with chain of thoughts for self-guided task completion'
        this.baseClasses = ['AutoGPT']
        this.inputs = [
            {
                label: 'Allowed Tools',
                name: 'tools',
                type: 'Tool',
                list: true
            },
            {
                label: 'Chat Model',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'BaseRetriever'
            },
            {
                label: 'AutoGPT Name',
                name: 'aiName',
                type: 'string',
                placeholder: 'Tom',
                optional: true
            },
            {
                label: 'AutoGPT Role',
                name: 'aiRole',
                type: 'string',
                placeholder: 'Assistant',
                optional: true
            },
            {
                label: 'Maximum Loop',
                name: 'maxLoop',
                type: 'number',
                default: 5,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseChatModel
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as VectorStoreRetriever
        let tools = nodeData.inputs?.tools as Tool[]
        tools = flatten(tools)
        const aiName = (nodeData.inputs?.aiName as string) || 'AutoGPT'
        const aiRole = (nodeData.inputs?.aiRole as string) || 'Assistant'
        const maxLoop = nodeData.inputs?.maxLoop as string

        const autogpt = AutoGPT.fromLLMAndTools(model, tools, {
            memory: vectorStoreRetriever,
            aiName,
            aiRole
        })

        autogpt.maxIterations = parseInt(maxLoop, 10)

        return autogpt
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const executor = nodeData.instance as AutoGPT
        try {
            const res = await executor.run([input])
            return res || 'I have completed all my tasks.'
        } catch (e) {
            console.error(e)
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: AutoGPT_Agents }
