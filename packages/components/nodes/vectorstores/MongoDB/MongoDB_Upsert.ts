import { ICommonObject, INode, INodeData } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'

import { flatten } from 'lodash'
import { VectorStore } from 'langchain/vectorstores/base'
import { MongoDBSearchBase } from './MongoDBSearchBase'
import { Collection } from 'mongodb'
import { MongoDBAtlasVectorSearch } from 'langchain/vectorstores/mongodb_atlas'

class MongoDBUpsert_VectorStores extends MongoDBSearchBase implements INode {
    constructor() {
        super()
        this.label = 'MongoDB Upsert Document'
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

    constructVectorStore(
        embeddings: Embeddings,
        collection: Collection,
        indexName: string,
        textKey: string,
        embeddingKey: string,
        docs: Document<Record<string, any>>[]
    ): Promise<VectorStore> {
        return MongoDBAtlasVectorSearch.fromDocuments(docs, embeddings, {
            collection: collection,
            indexName: indexName,
            textKey: textKey,
            embeddingKey: embeddingKey
        })
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

        return super.init(nodeData, _, options, flattenDocs)
    }
}

module.exports = { nodeClass: MongoDBUpsert_VectorStores }
