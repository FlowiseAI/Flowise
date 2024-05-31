import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { BaseRetriever } from '@langchain/core/retrievers'
import { VectorStoreRetriever } from '@langchain/core/vectorstores'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { ReciprocalRankFusion } from './ReciprocalRankFusion'
import { handleEscapeCharacters } from '../../../src/utils'
import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

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
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Reciprocal Rank Fusion Retriever'
        this.name = 'RRFRetriever'
        this.version = 1.0
        this.type = 'RRFRetriever'
        this.icon = 'rrfRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Reciprocal Rank Fusion to re-rank search results by multiple query generation.'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Vector Store Retriever',
                name: 'baseRetriever',
                type: 'VectorStoreRetriever'
            },
            {
                label: 'Language Model',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Query',
                name: 'query',
                type: 'string',
                description: 'Query to retrieve documents from retriever. If not specified, user question will be used',
                optional: true,
                acceptVariable: true
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
                additionalParams: true,
                optional: true
            },
            {
                label: 'Constant',
                name: 'c',
                description:
                    'A constant added to the rank, controlling the balance between the importance of high-ranked items and the consideration given to lower-ranked items.\n' +
                    'Default is 60',
                placeholder: '60',
                type: 'number',
                default: 60,
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Reciprocal Rank Fusion Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and pageContent',
                baseClasses: ['Document', 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string): Promise<any> {
        const llm = nodeData.inputs?.model as BaseLanguageModel
        const baseRetriever = nodeData.inputs?.baseRetriever as BaseRetriever
        const query = nodeData.inputs?.query as string
        const queryCount = nodeData.inputs?.queryCount as string
        const q = queryCount ? parseFloat(queryCount) : 4
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : (baseRetriever as VectorStoreRetriever).k ?? 4
        const constantC = nodeData.inputs?.c as string
        const c = topK ? parseFloat(constantC) : 60
        const output = nodeData.outputs?.output as string

        const ragFusion = new ReciprocalRankFusion(llm, baseRetriever as VectorStoreRetriever, q, k, c)
        const retriever = new ContextualCompressionRetriever({
            baseCompressor: ragFusion,
            baseRetriever: baseRetriever
        })

        if (output === 'retriever') return retriever
        else if (output === 'document') return await retriever.getRelevantDocuments(query ? query : input)
        else if (output === 'text') {
            let finaltext = ''

            const docs = await retriever.getRelevantDocuments(query ? query : input)

            for (const doc of docs) finaltext += `${doc.pageContent}\n`

            return handleEscapeCharacters(finaltext, false)
        }

        return retriever
    }
}

module.exports = { nodeClass: RRFRetriever_Retrievers }
