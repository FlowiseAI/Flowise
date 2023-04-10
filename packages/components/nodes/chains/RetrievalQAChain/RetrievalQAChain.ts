import { INode, INodeData, INodeParams } from '../../../src/Interface'

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
        this.inputs = [
            {
                label: 'LLM',
                name: 'llm',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'BaseRetriever'
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        return ['BaseChain']
    }

    async init(nodeData: INodeData): Promise<any> {
        const { RetrievalQAChain } = await import('langchain/chains')
        const llm = nodeData.inputs?.llm
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever

        const chain = RetrievalQAChain.fromLLM(llm, vectorStoreRetriever)
        return chain
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const chain = nodeData.instance
        const obj = {
            query: input
        }
        const res = await chain.call(obj)
        return res?.text
    }
}

module.exports = { nodeClass: RetrievalQAChain_Chains }
