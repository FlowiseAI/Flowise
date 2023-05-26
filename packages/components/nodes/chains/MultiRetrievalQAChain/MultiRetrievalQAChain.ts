import { BaseLanguageModel } from 'langchain/base_language'
import { ICommonObject, INode, INodeData, INodeParams, VectorStoreRetriever } from '../../../src/Interface'
import { CustomChainHandler, getBaseClasses } from '../../../src/utils'
import { MultiRetrievalQAChain } from 'langchain/chains'

class MultiRetrievalQAChain_Chains implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Multi Retrieval QA Chain'
        this.name = 'multiRetrievalQAChain'
        this.type = 'MultiRetrievalQAChain'
        this.icon = 'chain.svg'
        this.category = 'Chains'
        this.description = 'QA Chain that automatically picks an appropriate vector store from multiple retrievers'
        this.baseClasses = [this.type, ...getBaseClasses(MultiRetrievalQAChain)]
        this.inputs = [
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Vector Store Retriever',
                name: 'vectorStoreRetriever',
                type: 'VectorStoreRetriever',
                list: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as VectorStoreRetriever[]
        const retrieverNames = []
        const retrieverDescriptions = []
        const retrievers = []

        for (const vs of vectorStoreRetriever) {
            retrieverNames.push(vs.name)
            retrieverDescriptions.push(vs.description)
            retrievers.push(vs.vectorStore.asRetriever())
        }

        const chain = MultiRetrievalQAChain.fromRetrievers(model, retrieverNames, retrieverDescriptions, retrievers, undefined, {
            verbose: process.env.DEBUG === 'true' ? true : false
        } as any)

        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        const chain = nodeData.instance as MultiRetrievalQAChain
        const obj = { input }

        if (options.socketIO && options.socketIOClientId) {
            const handler = new CustomChainHandler(options.socketIO, options.socketIOClientId)
            const res = await chain.call(obj, [handler])
            return res?.text
        } else {
            const res = await chain.call(obj)
            return res?.text
        }
    }
}

module.exports = { nodeClass: MultiRetrievalQAChain_Chains }
