import { BaseRetriever } from '@langchain/core/retrievers'
import { VectorStoreRetriever } from '@langchain/core/vectorstores'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { AzureRerank } from './AzureRerank'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class AzureRerankRetriever_Retrievers implements INode {
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
        this.label = 'Azure Rerank Retriever'
        this.name = 'AzureRerankRetriever'
        this.version = 1.0
        this.type = 'Azure Rerank Retriever'
        this.icon = 'azurefoundry.svg'
        this.category = 'Retrievers'
        this.description = 'Azure Rerank indexes the documents from most to least semantically relevant to the query.'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureFoundryApi']
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
                    },
                    {
                        label: 'Cohere-rerank-v4.0-fast',
                        name: 'Cohere-rerank-v4.0-fast'
                    },
                    {
                        label: 'Cohere-rerank-v4.0-pro',
                        name: 'Cohere-rerank-v4.0-pro'
                    }
                ],
                default: 'Cohere-rerank-v4.0-fast',
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
                label: 'Azure Rerank Retriever',
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
        const azureApiKey = getCredentialParam('azureFoundryApiKey', credentialData, nodeData)
        const azureEndpoint = getCredentialParam('azureFoundryEndpoint', credentialData, nodeData)
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : (baseRetriever as VectorStoreRetriever).k ?? 4
        const maxChunksPerDoc = nodeData.inputs?.maxChunksPerDoc as string
        const max_chunks_per_doc = maxChunksPerDoc ? parseFloat(maxChunksPerDoc) : 10
        const output = nodeData.outputs?.output as string

        const azureCompressor = new AzureRerank(azureApiKey, azureEndpoint, model, k, max_chunks_per_doc)

        const retriever = new ContextualCompressionRetriever({
            baseCompressor: azureCompressor,
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

module.exports = { nodeClass: AzureRerankRetriever_Retrievers }
