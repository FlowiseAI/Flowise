import { ICommonObject, INode, INodeData } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { VectorStore } from 'langchain/vectorstores/base'
import { RedisVectorStore, RedisVectorStoreConfig } from 'langchain/vectorstores/redis'
import { Document } from 'langchain/document'

import { RedisSearchBase } from './RedisSearchBase'

class RedisExisting_VectorStores extends RedisSearchBase implements INode {
    constructor() {
        super()
        this.label = 'Redis Load Existing Index'
        this.name = 'RedisIndex'
        this.version = 1.0
        this.description = 'Load existing index from Redis (i.e: Document has been upserted)'
    }

    async constructVectorStore(embeddings: Embeddings, indexName: string, _: Document<Record<string, any>>[]): Promise<VectorStore> {
        const storeConfig: RedisVectorStoreConfig = {
            redisClient: this.redisClient,
            indexName: indexName
        }

        return new RedisVectorStore(embeddings, storeConfig)
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return super.init(nodeData, _, options, undefined)
    }
}

module.exports = { nodeClass: RedisExisting_VectorStores }
