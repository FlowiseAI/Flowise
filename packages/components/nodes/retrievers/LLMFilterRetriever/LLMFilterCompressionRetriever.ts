import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { BaseRetriever } from 'langchain/schema/retriever'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { BaseLanguageModel } from 'langchain/base_language'
import { LLMChainExtractor } from 'langchain/retrievers/document_compressors/chain_extract'

class LLMFilterCompressionRetriever_Retrievers implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    badge: string

    constructor() {
        this.label = 'LLM Filter Retriever'
        this.name = 'llmFilterRetriever'
        this.version = 1.0
        this.type = 'LLMFilterRetriever'
        this.icon = 'compressionRetriever.svg'
        this.category = 'Retrievers'
        this.badge = 'NEW'
        this.description =
            'Iterate over the initially returned documents and extract, from each, only the content that is relevant to the query'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Base Retriever',
                name: 'baseRetriever',
                type: 'VectorStoreRetriever'
            },
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel',
                optional: true
            },
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const baseRetriever = nodeData.inputs?.baseRetriever as BaseRetriever
        const model = nodeData.inputs?.model as BaseLanguageModel

        if (model) {
            return new ContextualCompressionRetriever({
                baseCompressor: LLMChainExtractor.fromLLM(model),
                baseRetriever: baseRetriever
            })
        }
        return {}
    }
}

module.exports = { nodeClass: LLMFilterCompressionRetriever_Retrievers }
