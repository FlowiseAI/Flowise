import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { RetrievalQAChain } from 'langchain/chains'
import { BaseLLM } from 'langchain/llms/base'
import { BaseRetriever } from 'langchain/schema'
import { getBaseClasses } from '../../../src/utils'

class RetrievalQAChain_Chains implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'RetrievalQA Chain'
        this.name = 'retrievalQAChain'
        this.type = 'RetrievalQAChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.description = 'QA chain to answer a question based on the retrieved documents'
        this.baseClasses = [this.type, ...getBaseClasses(RetrievalQAChain)]
        this.inputs = [
            {
                label: 'LLM',
                name: 'llm',
                type: 'BaseLLM'
            },
            {
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'BaseRetriever'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const llm = nodeData.inputs?.llm as BaseLLM
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as BaseRetriever

        const chain = RetrievalQAChain.fromLLM(llm, vectorStoreRetriever)
        return chain
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const chain = nodeData.instance as RetrievalQAChain
        const obj = {
            query: input
        }
        const res = await chain.call(obj)
        return res?.text
    }
}

module.exports = { nodeClass: RetrievalQAChain_Chains }
