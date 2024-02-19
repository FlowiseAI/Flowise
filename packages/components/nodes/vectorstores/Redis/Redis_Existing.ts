import { Embeddings } from '@langchain/core/embeddings'
import { VectorStore } from '@langchain/core/vectorstores'
import { RedisVectorStore, RedisVectorStoreConfig } from '@langchain/community/vectorstores/redis'
import { Document } from '@langchain/core/documents'
import { ICommonObject, INode, INodeData } from '../../../src/Interface'
import { RedisSearchBase } from './RedisSearchBase'

class RedisExisting_VectorStores extends RedisSearchBase implements INode {
    constructor() {
        super()
        this.label = 'Redis Load Existing Index'
        this.name = 'RedisIndex'
        this.version = 1.0
        this.description = 'Load existing index from Redis (i.e: Document has been upserted)'

        // Remove replaceIndex from inputs as it is not applicable while fetching data from Redis
        let input = this.inputs.find((i) => i.name === 'replaceIndex')
        if (input) this.inputs.splice(this.inputs.indexOf(input), 1)
    }

    async constructVectorStore(
        embeddings: Embeddings,
        indexName: string,
        // eslint-disable-next-line unused-imports/no-unused-vars
        replaceIndex: boolean,
        _: Document<Record<string, any>>[]
    ): Promise<VectorStore> {
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
