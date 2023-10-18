import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { OpenSearchVectorStore } from 'langchain/vectorstores/opensearch'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { Client, RequestParams } from '@opensearch-project/opensearch'
import { getBaseClasses } from '../../../src/utils'
import { buildMetadataTerms } from './core'

class OpenSearch_Existing_VectorStores implements INode {
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
        this.label = 'OpenSearch Load Existing Index'
        this.name = 'openSearchExistingIndex'
        this.version = 1.0
        this.type = 'OpenSearch'
        this.icon = 'opensearch.png'
        this.category = 'Vector Stores'
        this.description = 'Load existing index from OpenSearch (i.e: Document has been upserted)'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'OpenSearch URL',
                name: 'opensearchURL',
                type: 'string',
                placeholder: 'http://127.0.0.1:9200'
            },
            {
                label: 'Index Name',
                name: 'indexName',
                type: 'string'
            },
            {
                label: 'OpenSearch Metadata Filter',
                name: 'openSearchMetadataFilter',
                type: 'json',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'OpenSearch Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'OpenSearch Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(OpenSearchVectorStore)]
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const opensearchURL = nodeData.inputs?.opensearchURL as string
        const indexName = nodeData.inputs?.indexName as string
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4
        const openSearchMetadataFilter = nodeData.inputs?.openSearchMetadataFilter

        const client = new Client({
            nodes: [opensearchURL]
        })

        const vectorStore = new OpenSearchVectorStore(embeddings, {
            client,
            indexName
        })

        vectorStore.similaritySearchVectorWithScore = async (
            query: number[],
            k: number,
            filter?: object | undefined
        ): Promise<[Document, number][]> => {
            if (openSearchMetadataFilter) {
                const metadatafilter =
                    typeof openSearchMetadataFilter === 'object' ? openSearchMetadataFilter : JSON.parse(openSearchMetadataFilter)
                filter = metadatafilter
            }
            const search: RequestParams.Search = {
                index: indexName,
                body: {
                    query: {
                        bool: {
                            filter: { bool: { must: buildMetadataTerms(filter) } },
                            must: [
                                {
                                    knn: {
                                        embedding: { vector: query, k }
                                    }
                                }
                            ]
                        }
                    },
                    size: k
                }
            }

            const { body } = await client.search(search)

            return body.hits.hits.map((hit: any) => [
                new Document({
                    pageContent: hit._source.text,
                    metadata: hit._source.metadata
                }),
                hit._score
            ])
        }

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: OpenSearch_Existing_VectorStores }
