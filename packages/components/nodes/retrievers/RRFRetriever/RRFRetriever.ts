import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { BaseLanguageModel } from 'langchain/base_language'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { BaseRetriever } from 'langchain/schema/retriever'
import { ReciprocalRankFusion } from './ReciprocalRankFusion'
import { VectorStoreRetriever } from 'langchain/vectorstores/base'

class RRFRetriever_Retrievers implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    badge: string

    constructor() {
        this.label = 'Reciprocal Rank Fusion Retriever'
        this.name = 'RRFRetriever'
        this.version = 2.0
        this.type = 'RRFRetriever'
        this.badge = 'NEW'
        this.icon = 'compressionRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Reciprocal Rank Fusion to re-rank search results by multiple query generation.'
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
                type: 'BaseLanguageModel'
            },
            {
                label: 'Query Count',
                name: 'queryCount',
                description: 'Number of synthetic queries to generate. Default to 4',
                placeholder: '4',
                type: 'number',
                default: 4,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to the TopK of the Base Retriever',
                placeholder: '0',
                type: 'number',
                default: 0,
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const llm = nodeData.inputs?.model as BaseLanguageModel
        const baseRetriever = nodeData.inputs?.baseRetriever as BaseRetriever
        const queryCount = nodeData.inputs?.queryCount as string
        const q = queryCount ? parseFloat(queryCount) : 4
        const topK = nodeData.inputs?.topK as string
        let k = topK ? parseFloat(topK) : 4

        if (k <= 0) {
            k = (baseRetriever as VectorStoreRetriever).k
        }

        const ragFusion = new ReciprocalRankFusion(llm, baseRetriever as VectorStoreRetriever, q, k)
        return new ContextualCompressionRetriever({
            baseCompressor: ragFusion,
            baseRetriever: baseRetriever
        })
    }
}

module.exports = { nodeClass: RRFRetriever_Retrievers }
