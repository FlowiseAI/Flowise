import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src'

import { Client, ClientOptions } from '@elastic/elasticsearch'
import { ElasticClientArgs, ElasticVectorSearch } from 'langchain/vectorstores/elasticsearch'
import { flatten } from 'lodash'

class ElasicsearchUpsert_VectorStores implements INode {
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
        this.label = 'Elasticsearch Upsert Document'
        this.name = 'ElasticsearchUpsert'
        this.version = 1.0
        this.type = 'Elasticsearch'
        this.icon = 'elasticsearch.png'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to Elasticsearch'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['elasticsearchApi', 'elasticSearchUserPassword']
        }
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true
            },
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
            },
            {
                label: 'Similarity',
                name: 'similarity',
                description: 'Similarity measure used in Elasticsearch.',
                type: 'options',
                default: 'l2_norm',
                options: [
                    {
                        label: 'l2_norm',
                        name: 'l2_norm'
                    },
                    {
                        label: 'dot_product',
                        name: 'dot_product'
                    },
                    {
                        label: 'cosine',
                        name: 'cosine'
                    }
                ],
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
        const docs = nodeData.inputs?.document as Document[]
        const indexName = nodeData.inputs?.indexName as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4
        const output = nodeData.outputs?.output as string
        const similarityMeasure = nodeData.inputs?.similarityMeasure as string

        // eslint-disable-next-line no-console
        console.log('EndPoint:: ' + endPoint + ', APIKey:: ' + apiKey + ', Index:: ' + indexName)

        const elasticSearchClientOptions: ClientOptions = {
            node: endPoint,
            auth: {
                apiKey: apiKey
            }
        }
        let vectorSearchOptions = {}
        switch (similarityMeasure) {
            case 'dot_product':
                vectorSearchOptions = {
                    similarity: 'dot_product'
                }
                break
            case 'cosine':
                vectorSearchOptions = {
                    similarity: 'cosine'
                }
                break
            default:
                vectorSearchOptions = {
                    similarity: 'l2_norm'
                }
        }
        const elasticSearchClientArgs: ElasticClientArgs = {
            client: new Client(elasticSearchClientOptions),
            indexName: indexName,
            vectorSearchOptions: vectorSearchOptions
        }

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        const vectorStore = await ElasticVectorSearch.fromDocuments(finalDocs, embeddings, elasticSearchClientArgs)

        if (output === 'retriever') {
            return vectorStore.asRetriever(k)
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: ElasicsearchUpsert_VectorStores }
