import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { BaseRetriever } from 'langchain/schema/retriever'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { getCredentialData, getCredentialParam } from '../../../src'
import { CohereRerank } from './CohereRerank'
import { VectorStoreRetriever } from 'langchain/vectorstores/base'

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
    outputs: INodeOutputsValue[]
    credential: INodeParams
    badge: string

    constructor() {
        this.label = 'Cohere Rerank Retriever'
        this.name = 'cohereRerankRetriever'
        this.version = 1.0
        this.type = 'Cohere Rerank Retriever'
        this.icon = 'compressionRetriever.svg'
        this.category = 'Retrievers'
        this.badge = 'NEW'
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
                label: 'Base Retriever',
                name: 'baseRetriever',
                type: 'VectorStoreRetriever'
            },
            {
                label: 'Model Name',
                name: 'model',
                type: 'options',
                options: [
                    {
                        label: 'rerank-english-v2.0',
                        name: 'rerank-english-v2.0'
                    },
                    {
                        label: 'rerank-multilingual-v2.0',
                        name: 'rerank-multilingual-v2.0'
                    }
                ],
                default: 'rerank-english-v2.0',
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
            },
            {
                label: 'Max Chunks Per Document',
                name: 'maxChunksPerDoc',
                placeholder: '10',
                type: 'number',
                default: 10,
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const baseRetriever = nodeData.inputs?.baseRetriever as BaseRetriever
        const model = nodeData.inputs?.model as string
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const cohereApiKey = getCredentialParam('cohereApiKey', credentialData, nodeData)
        const topK = nodeData.inputs?.topK as string
        let k = topK ? parseFloat(topK) : 4
        const maxChunks = nodeData.inputs?.maxChunksPerDoc as string
        let max = maxChunks ? parseInt(maxChunks) : 10

        if (k <= 0) {
            k = (baseRetriever as VectorStoreRetriever).k
        }

        const cohereCompressor = new CohereRerank(cohereApiKey, model, k, max)
        return new ContextualCompressionRetriever({
            baseCompressor: cohereCompressor,
            baseRetriever: baseRetriever
        })
    }
}

module.exports = { nodeClass: CohereRerankRetriever_Retrievers }
