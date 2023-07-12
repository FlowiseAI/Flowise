import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { getBaseClasses } from '../../../src/utils'
import { createClient } from 'redis'
import { RedisVectorStore, RedisVectorStoreConfig } from 'langchain/vectorstores/redis'

class Redis_Existing_VectorStores implements INode {
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
        this.label = 'Redis Load Existing Index'
        this.name = 'redisExistingIndex'
        this.type = 'Redis'
        this.icon = 'redis.svg'
        this.category = 'Vector Stores'
        this.description = 'Load existing index from Redis (i.e: Document has been upserted)'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
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
                name: 'redisFilters',
                type: 'json',
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
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const indexName = nodeData.inputs?.redisIndex as string
        const redisFilters = nodeData.inputs?.redisFilters as string[]
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseInt(topK, 10) : 4

        const client = createClient({ url: redisURI })
        await client.connect()

        const dbConfig: RedisVectorStoreConfig = {
            redisClient: client,
            indexName
        }
        if (redisFilters) {
            if (Array.isArray(redisFilters)) dbConfig.filter = redisFilters
        }

        const vectorStore = new RedisVectorStore(embeddings, dbConfig)

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

module.exports = { nodeClass: Redis_Existing_VectorStores }
