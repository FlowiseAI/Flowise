import { flatten } from 'lodash'
import { Collection } from 'mongodb'
import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { VectorStore } from '@langchain/core/vectorstores'
import { MongoDBAtlasVectorSearch } from '@langchain/community/vectorstores/mongodb_atlas'
import { ICommonObject, INode, INodeData } from '../../../src/Interface'
import { MongoDBSearchBase } from './MongoDBSearchBase'

class MongoDBUpsert_VectorStores extends MongoDBSearchBase implements INode {
    constructor() {
        super()
        this.label = 'MongoDB Atlas Upsert Document'
        this.name = 'MongoDBUpsert'
        this.version = 1.0
        this.description = 'Upsert documents to MongoDB Atlas'
        this.inputs.unshift({
            label: 'Document',
            name: 'document',
            type: 'Document',
            list: true
        })
    }

    async constructVectorStore(
        embeddings: Embeddings,
        collection: Collection,
        indexName: string,
        textKey: string,
        embeddingKey: string,
        docs: Document<Record<string, any>>[]
    ): Promise<VectorStore> {
        const mongoDBAtlasVectorSearch = new MongoDBAtlasVectorSearch(embeddings, {
            collection: collection,
            indexName: indexName,
            textKey: textKey,
            embeddingKey: embeddingKey
        })
        await mongoDBAtlasVectorSearch.addDocuments(docs)
        return mongoDBAtlasVectorSearch
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const docs = nodeData.inputs?.document as Document[]

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            if (flattenDocs[i] && flattenDocs[i].pageContent) {
                const document = new Document(flattenDocs[i])
                finalDocs.push(document)
            }
        }

        return super.init(nodeData, _, options, finalDocs)
    }
}

module.exports = { nodeClass: MongoDBUpsert_VectorStores }
