import { BaseRetriever } from '@langchain/core/retrievers'
import { VectorStoreRetriever } from '@langchain/core/vectorstores'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { CohereRerank } from './CohereRerank'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class CohereRerankRetriever_Retrievers implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    badge: string
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Cohere Rerank Retriever'
        this.name = 'cohereRerankRetriever'
        this.version = 1.0
        this.type = 'Cohere Rerank Retriever'
        this.icon = 'Cohere.svg'
        this.category = 'Retrievers'
        this.description = 'Cohere Rerank indexes the documents from most to least semantically relevant to the query.'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cohereApi']
        }
        this.inputs = [
            {
                label: 'Vector Store Retriever',
                name: 'baseRetriever',
                type: 'VectorStoreRetriever'
            },
            {
                label: 'Model Name',
                name: 'model',
                type: 'options',
                options: [
                    {
                        label: 'rerank-v3.5',
                        name: 'rerank-v3.5'
                    },
                    {
                        label: 'rerank-english-v3.0',
                        name: 'rerank-english-v3.0'
                    },
                    {
                        label: 'rerank-multilingual-v3.0',
                        name: 'rerank-multilingual-v3.0'
                    }
                ],
                default: 'rerank-v3.5',
                optional: true
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
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to the TopK of the Base Retriever',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Max Chunks Per Doc',
                name: 'maxChunksPerDoc',
                description: 'The maximum number of chunks to produce internally from a document. Default to 10',
                placeholder: '10',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Cohere Rerank Retriever',
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

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const baseRetriever = nodeData.inputs?.baseRetriever as BaseRetriever
        const model = nodeData.inputs?.model as string
        const query = nodeData.inputs?.query as string
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const cohereApiKey = getCredentialParam('cohereApiKey', credentialData, nodeData)
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : (baseRetriever as VectorStoreRetriever).k ?? 4
        const maxChunksPerDoc = nodeData.inputs?.maxChunksPerDoc as string
        const max_chunks_per_doc = maxChunksPerDoc ? parseFloat(maxChunksPerDoc) : 10
        const output = nodeData.outputs?.output as string

        const cohereCompressor = new CohereRerank(cohereApiKey, model, k, max_chunks_per_doc)

        const retriever = new ContextualCompressionRetriever({
            baseCompressor: cohereCompressor,
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

module.exports = { nodeClass: CohereRerankRetriever_Retrievers }
