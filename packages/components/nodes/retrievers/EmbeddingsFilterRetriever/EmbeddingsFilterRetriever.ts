import { BaseRetriever } from '@langchain/core/retrievers'
import { Embeddings } from '@langchain/core/embeddings'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { EmbeddingsFilter } from 'langchain/retrievers/document_compressors/embeddings_filter'
import { handleEscapeCharacters } from '../../../src/utils'
import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class EmbeddingsFilterRetriever_Retrievers implements INode {
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
        this.label = 'Embeddings Filter Retriever'
        this.name = 'embeddingsFilterRetriever'
        this.version = 1.0
        this.type = 'EmbeddingsFilterRetriever'
        this.icon = 'compressionRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'A document compressor that uses embeddings to drop documents unrelated to the query'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Vector Store Retriever',
                name: 'baseRetriever',
                type: 'VectorStoreRetriever'
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
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
                label: 'Similarity Threshold',
                name: 'similarityThreshold',
                description:
                    'Threshold for determining when two documents are similar enough to be considered redundant. Must be specified if `k` is not set',
                type: 'number',
                default: 0.8,
                step: 0.1,
                optional: true
            },
            {
                label: 'K',
                name: 'k',
                description:
                    'The number of relevant documents to return. Can be explicitly set to undefined, in which case similarity_threshold must be specified. Defaults to 20',
                type: 'number',
                default: 20,
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Embeddings Filter Retriever',
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
        const baseRetriever = nodeData.inputs?.baseRetriever as BaseRetriever
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const query = nodeData.inputs?.query as string
        const similarityThreshold = nodeData.inputs?.similarityThreshold as string
        const k = nodeData.inputs?.k as string
        const output = nodeData.outputs?.output as string

        if (k === undefined && similarityThreshold === undefined) {
            throw new Error(`Must specify one of "k" or "similarity_threshold".`)
        }

        const similarityThresholdNumber = similarityThreshold ? parseFloat(similarityThreshold) : 0.8
        const kNumber = k ? parseFloat(k) : undefined

        const baseCompressor = new EmbeddingsFilter({
            embeddings: embeddings,
            similarityThreshold: similarityThresholdNumber,
            k: kNumber
        })

        const retriever = new ContextualCompressionRetriever({
            baseCompressor,
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

module.exports = { nodeClass: EmbeddingsFilterRetriever_Retrievers }
