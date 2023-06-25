import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { getBaseClasses } from '../../../src/utils'
import { createClient } from 'redis'
import { RedisVectorStore, RedisVectorStoreConfig, RedisVectorStoreFilterType } from 'langchain/vectorstores/redis'
import { flatten } from 'lodash'

class RedisUpsert_VectorStores implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Redis Upsert Document'
        this.name = 'redisUpsert'
        this.type = 'Redis'
        this.icon = 'pinecone.png'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to Redis'
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
                label: 'Redis URI',
                name: 'redisURI',
                type: 'string'
            },
            {
                label: 'Redis Index',
                name: 'redisIndex',
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
            },
            {
                label: 'Redis Filters',
                name: 'redisVectorStoreFilters',
                description: 'Redis Vector Store filters',
                type: 'RedisVectorStoreFilterType',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Redis Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Redis Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(RedisVectorStore)]
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const redisURI = nodeData.inputs?.redisURI as string
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const indexName = nodeData.inputs?.redisIndex as string
        const filters = nodeData.inputs?.redisVectorStoreFilters as RedisVectorStoreFilterType
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseInt(topK, 10) : 4

        const client = createClient({ url: redisURI })
        await client.connect()

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        const dbConfig: RedisVectorStoreConfig = {
            redisClient: client,
            indexName
        }

        const vectorStore = await RedisVectorStore.fromDocuments(finalDocs, embeddings, dbConfig)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k, filters)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: RedisUpsert_VectorStores }
