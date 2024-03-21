import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { flatten } from 'lodash'
import { VectorStore } from '@langchain/core/vectorstores'
import { RedisVectorStore, RedisVectorStoreConfig } from '@langchain/community/vectorstores/redis'
import { RedisSearchBase } from './RedisSearchBase'
import { ICommonObject, INode, INodeData } from '../../../src/Interface'
import { escapeAllStrings } from './utils'

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

    async constructVectorStore(
        embeddings: Embeddings,
        indexName: string,
        replaceIndex: boolean,
        docs: Document<Record<string, any>>[]
    ): Promise<VectorStore> {
        const storeConfig: RedisVectorStoreConfig = {
            redisClient: this.redisClient,
            indexName: indexName
        }
        if (replaceIndex) {
            let response = await this.redisClient.ft.dropIndex(indexName)
            if (process.env.DEBUG === 'true') {
                // eslint-disable-next-line no-console
                console.log(`Redis Vector Store :: Dropping index [${indexName}], Received Response [${response}]`)
            }
        }
        return await RedisVectorStore.fromDocuments(docs, embeddings, storeConfig)
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const docs = nodeData.inputs?.document as Document[]

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            if (flattenDocs[i] && flattenDocs[i].pageContent) {
                const document = new Document(flattenDocs[i])
                escapeAllStrings(document.metadata)
                finalDocs.push(document)
            }
        }

        return super.init(nodeData, _, options, finalDocs)
    }
}

module.exports = { nodeClass: RedisUpsert_VectorStores }
