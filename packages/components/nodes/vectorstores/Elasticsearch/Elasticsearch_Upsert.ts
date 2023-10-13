import { ICommonObject, INode, INodeData } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'

import { ElasticClientArgs, ElasticVectorSearch } from 'langchain/vectorstores/elasticsearch'
import { flatten } from 'lodash'
import { ElasticSearchBase } from './ElasticSearchBase'
import { VectorStore } from 'langchain/vectorstores/base'

class ElasicsearchUpsert_VectorStores extends ElasticSearchBase implements INode {
    constructor() {
        super()
        this.label = 'Elasticsearch Upsert Document'
        this.name = 'ElasticsearchUpsert'
        this.version = 1.0
        this.description = 'Upsert documents to Elasticsearch'
        this.inputs.unshift({
            label: 'Document',
            name: 'document',
            type: 'Document',
            list: true
        })
    }

    async constructVectorStore(
        embeddings: Embeddings,
        elasticSearchClientArgs: ElasticClientArgs,
        docs: Document<Record<string, any>>[]
    ): Promise<VectorStore> {
        const vectorStore = new ElasticVectorSearch(embeddings, elasticSearchClientArgs)
        await vectorStore.addDocuments(docs)
        return vectorStore
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const docs = nodeData.inputs?.document as Document[]

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        // The following code is a workaround for a bug (Langchain Issue #1589) in the underlying library.
        // Store does not support object in metadata and fail silently
        finalDocs.forEach((d) => {
            delete d.metadata.pdf
            delete d.metadata.loc
        })
        // end of workaround
        return super.init(nodeData, _, options, flattenDocs)
    }
}

module.exports = { nodeClass: ElasicsearchUpsert_VectorStores }
