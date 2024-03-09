import { ICommonObject, INode, INodeData } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'

import { ElasticClientArgs, ElasticVectorSearch } from 'langchain/vectorstores/elasticsearch'
import { ElasticSearchBase } from './ElasticSearchBase'
import { VectorStore } from 'langchain/vectorstores/base'
import { Document } from 'langchain/document'

class ElasicsearchExisting_VectorStores extends ElasticSearchBase implements INode {
    constructor() {
        super()
        this.label = 'Elasticsearch Load Existing Index'
        this.name = 'ElasticsearchIndex'
        this.version = 1.0
        this.description = 'Load existing index from Elasticsearch (i.e: Document has been upserted)'
    }

    async constructVectorStore(
        embeddings: Embeddings,
        elasticSearchClientArgs: ElasticClientArgs,
        _: Document<Record<string, any>>[] | undefined
    ): Promise<VectorStore> {
        return await ElasticVectorSearch.fromExistingIndex(embeddings, elasticSearchClientArgs)
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return super.init(nodeData, _, options, undefined)
    }
}

module.exports = { nodeClass: ElasicsearchExisting_VectorStores }
