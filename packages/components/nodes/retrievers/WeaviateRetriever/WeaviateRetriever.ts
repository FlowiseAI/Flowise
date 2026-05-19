import { WeaviateStore } from '@langchain/weaviate'
import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src'
import { HybridSearchRetriever } from './HybridSearchRetriever'

const defaultReturnFormat = '{{context}}\nSource: {{metadata.source}}'

class WeaviateRetriever_Retrievers implements INode {
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

    constructor() {
        this.label = 'Weaviate Retriever'
        this.name = 'weaviateRetriever'
        this.version = 1.0
        this.type = 'WeaviateRetriever'
        this.icon = 'weaviateRetriever.png'
        this.category = 'Retrievers'
        this.description = 'Weaviate hybrid search combining vector similarity and BM25 keyword search'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Weaviate Vector Store',
                name: 'vectorStore',
                type: 'VectorStore'
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
                label: 'Result Format',
                name: 'resultFormat',
                type: 'string',
                rows: 4,
                description:
                    'Format to return the results in. Use {{context}} to insert the pageContent of the document and {{metadata.key}} to insert metadata values.',
                default: defaultReturnFormat
            },
            {
                label: 'Alpha',
                name: 'alpha',
                type: 'number',
                description:
                    'Number between 0 and 1 that determines the weighting of keyword (BM25) portion of the hybrid search. A value of 1 is a pure vector search, while 0 is a pure keyword search.',
                default: 0.5,
                step: 0.1,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to vector store topK',
                placeholder: '4',
                type: 'number',
                optional: true
            },
            {
                label: 'fusionType',
                name: 'fusionType',
                type: 'options',
                default: 'RankedFusion',
                description:
                    "Method to merge results: 'RankedFusion' combines by document rank, while 'RelativeScoreFusion' combines by normalized scores.",
                options: [
                    {
                        label: 'RankedFusion',
                        name: 'RankedFusion'
                    },
                    {
                        label: 'RelativeScoreFusion',
                        name: 'RelativeScoreFusion'
                    }
                ],
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Weaviate Retriever',
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
        const vectorStore = nodeData.inputs?.vectorStore as WeaviateStore
        const query = nodeData.inputs?.query as string
        const topK = nodeData.inputs?.topK as string
        const alpha = nodeData.inputs?.alpha as string
        const resultFormat = nodeData.inputs?.resultFormat as string
        const output = nodeData.outputs?.output as string

        const retriever = HybridSearchRetriever.fromVectorStore(vectorStore, {
            resultFormat,
            alpha: alpha ? parseFloat(alpha) : 0.5,
            topK: topK ? parseInt(topK, 10) : 4
        })

        const searchPath = query ? query : input

        if (output === 'retriever') return retriever
        else if (output === 'document') return await retriever._getRelevantDocuments(searchPath)
        else if (output === 'text') {
            const docs = await retriever._getRelevantDocuments(searchPath)
            const finaltext = docs.map((doc) => doc.pageContent).join('\n')
            return handleEscapeCharacters(finaltext, false)
        }

        return retriever
    }
}

module.exports = { nodeClass: WeaviateRetriever_Retrievers }
