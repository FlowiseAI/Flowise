import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { OpenSearchVectorStore } from 'langchain/vectorstores/opensearch'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { Client } from '@opensearch-project/opensearch'
import { flatten } from 'lodash'
import { getBaseClasses } from '../../../src/utils'

class OpenSearchUpsert_VectorStores implements INode {
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
        this.label = 'OpenSearch Upsert Document'
        this.name = 'openSearchUpsertDocument'
        this.version = 1.0
        this.type = 'OpenSearch'
        this.icon = 'opensearch.png'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to OpenSearch'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true
            },
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
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const opensearchURL = nodeData.inputs?.opensearchURL as string
        const indexName = nodeData.inputs?.indexName as string
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        const client = new Client({
            nodes: [opensearchURL]
        })

        const vectorStore = await OpenSearchVectorStore.fromDocuments(finalDocs, embeddings, {
            client,
            indexName: indexName
        })

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

module.exports = { nodeClass: OpenSearchUpsert_VectorStores }
