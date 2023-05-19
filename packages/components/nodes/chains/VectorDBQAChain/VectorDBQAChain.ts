import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { VectorDBQAChain } from 'langchain/chains'
import { BaseLanguageModel } from 'langchain/base_language'
import { VectorStore } from 'langchain/vectorstores'

class VectorDBQAChain_Chains implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'VectorDB QA Chain'
        this.name = 'vectorDBQAChain'
        this.type = 'VectorDBQAChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.description = 'QA chain for vector databases'
        this.baseClasses = [this.type, ...getBaseClasses(VectorDBQAChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Vector Store',
                name: 'vectorStore',
                type: 'VectorStore'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const vectorStore = nodeData.inputs?.vectorStore as VectorStore

        const chain = VectorDBQAChain.fromLLM(model, vectorStore, { verbose: process.env.DEBUG === 'true' ? true : false })
        return chain
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const chain = nodeData.instance as VectorDBQAChain
        const obj = {
            query: input
        }
        const res = await chain.call(obj)
        return res?.text
    }
}

module.exports = { nodeClass: VectorDBQAChain_Chains }
