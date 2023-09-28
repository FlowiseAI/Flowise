import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src'

import { Client, ClientOptions } from '@elastic/elasticsearch'
import { ElasticClientArgs, ElasticVectorSearch } from 'langchain/vectorstores/elasticsearch'

class ElasicsearchExisting_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Elasticsearch Load Existing Index'
        this.name = 'ElasticsearchIndex'
        this.version = 1.0
        this.type = 'Elasticsearch'
        this.icon = 'elasticsearch.png'
        this.category = 'Vector Stores'
        this.description = 'Load existing index from Elasticsearch   (i.e: Document has been upserted)'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['elasticsearchApi', 'elasticSearchUserPassword']
        }
        this.inputs = [
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Index Name',
                name: 'indexName',
                placeholder: '<INDEX_NAME>',
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
            }
        ]
        this.outputs = [
            {
                label: 'Elasticsearch Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Elasticsearch Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(ElasticVectorSearch)]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const endPoint = getCredentialParam('endpoint', credentialData, nodeData)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
        const indexName = nodeData.inputs?.indexName as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string

        const k = topK ? parseFloat(topK) : 4
        const output = nodeData.outputs?.output as string

        // eslint-disable-next-line no-console
        console.log('EndPoint:: ' + endPoint + ', APIKey:: ' + apiKey + ', Index:: ' + indexName)

        const elasticSearchClientOptions: ClientOptions = {
            node: endPoint,
            auth: {
                apiKey: apiKey
            }
        }

        const elasticSearchClientArgs: ElasticClientArgs = {
            client: new Client(elasticSearchClientOptions),
            indexName: indexName
        }

        const vectorStore = await ElasticVectorSearch.fromExistingIndex(embeddings, elasticSearchClientArgs)
        // eslint-disable-next-line no-console
        console.log('vectorStore ::' + vectorStore._vectorstoreType())
        if (output === 'retriever') {
            return vectorStore.asRetriever(k)
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: ElasicsearchExisting_VectorStores }
