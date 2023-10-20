import { ICommonObject, INode, INodeData } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'

import { flatten } from 'lodash'
import { RedisSearchBase } from './RedisSearchBase'
import { VectorStore } from 'langchain/vectorstores/base'
import { RedisVectorStore, RedisVectorStoreConfig } from 'langchain/vectorstores/redis'

class RedisUpsert_VectorStores extends RedisSearchBase implements INode {
    constructor() {
        super()
        this.label = 'Redis Upsert Document'
        this.name = 'RedisUpsert'
        this.version = 1.0
        this.description = 'Upsert documents to Redis'
        this.inputs.unshift({
            label: 'Document',
            name: 'document',
            type: 'Document',
            list: true
        })
    }

    async constructVectorStore(embeddings: Embeddings, indexName: string, docs: Document<Record<string, any>>[]): Promise<VectorStore> {
        const storeConfig: RedisVectorStoreConfig = {
            redisClient: this.redisClient,
            indexName: indexName
        }
        return await RedisVectorStore.fromDocuments(docs, embeddings, storeConfig)
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const docs = nodeData.inputs?.document as Document[]

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        return super.init(nodeData, _, options, flattenDocs)
    }
}

module.exports = { nodeClass: RedisUpsert_VectorStores }
