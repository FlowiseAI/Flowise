import { Collection } from 'mongodb'
import { MongoDBAtlasVectorSearch } from '@langchain/community/vectorstores/mongodb_atlas'
import { Embeddings } from '@langchain/core/embeddings'
import { VectorStore } from '@langchain/core/vectorstores'
import { Document } from '@langchain/core/documents'
import { MongoDBSearchBase } from './MongoDBSearchBase'
import { ICommonObject, INode, INodeData } from '../../../src/Interface'

class MongoDBExisting_VectorStores extends MongoDBSearchBase implements INode {
    constructor() {
        super()
        this.label = 'MongoDB Atlas Load Existing Index'
        this.name = 'MongoDBIndex'
        this.version = 1.0
        this.description = 'Load existing data from MongoDB Atlas (i.e: Document has been upserted)'
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return super.init(nodeData, _, options, undefined)
    }

    async constructVectorStore(
        embeddings: Embeddings,
        collection: Collection,
        indexName: string,
        textKey: string,
        embeddingKey: string,
        _: Document<Record<string, any>>[] | undefined
    ): Promise<VectorStore> {
        return new MongoDBAtlasVectorSearch(embeddings, {
            collection: collection,
            indexName: indexName,
            textKey: textKey,
            embeddingKey: embeddingKey
        })
    }
}

module.exports = { nodeClass: MongoDBExisting_VectorStores }
