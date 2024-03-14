import {
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    ICommonObject,
    INodeData,
    INodeOutputsValue,
    INodeParams
} from '../../../src'
import { Client, ClientOptions } from '@elastic/elasticsearch'
import { ElasticClientArgs, ElasticVectorSearch } from '@langchain/community/vectorstores/elasticsearch'
import { Embeddings } from '@langchain/core/embeddings'
import { VectorStore } from '@langchain/core/vectorstores'
import { Document } from '@langchain/core/documents'

export abstract class ElasticSearchBase {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    protected constructor() {
        this.type = 'Elasticsearch'
        this.icon = 'elasticsearch.png'
        this.category = 'Vector Stores'
        this.badge = 'DEPRECATING'
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

    abstract constructVectorStore(
        embeddings: Embeddings,
        elasticSearchClientArgs: ElasticClientArgs,
        docs: Document<Record<string, any>>[] | undefined
    ): Promise<VectorStore>

    async init(nodeData: INodeData, _: string, options: ICommonObject, docs: Document<Record<string, any>>[] | undefined): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const endPoint = getCredentialParam('endpoint', credentialData, nodeData)
        const cloudId = getCredentialParam('cloudId', credentialData, nodeData)
        const indexName = nodeData.inputs?.indexName as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string
        const similarityMeasure = nodeData.inputs?.similarityMeasure as string
        const k = topK ? parseFloat(topK) : 4
        const output = nodeData.outputs?.output as string

        const elasticSearchClientArgs = this.prepareClientArgs(endPoint, cloudId, credentialData, nodeData, similarityMeasure, indexName)

        const vectorStore = await this.constructVectorStore(embeddings, elasticSearchClientArgs, docs)

        if (output === 'retriever') {
            return vectorStore.asRetriever(k)
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }

    protected prepareConnectionOptions(
        endPoint: string | undefined,
        cloudId: string | undefined,
        credentialData: ICommonObject,
        nodeData: INodeData
    ) {
        let elasticSearchClientOptions: ClientOptions = {}
        if (endPoint) {
            let apiKey = getCredentialParam('apiKey', credentialData, nodeData)
            elasticSearchClientOptions = {
                node: endPoint,
                auth: {
                    apiKey: apiKey
                }
            }
        } else if (cloudId) {
            let username = getCredentialParam('username', credentialData, nodeData)
            let password = getCredentialParam('password', credentialData, nodeData)
            if (cloudId.startsWith('http')) {
                elasticSearchClientOptions = {
                    node: cloudId,
                    auth: {
                        username: username,
                        password: password
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                }
            } else {
                elasticSearchClientOptions = {
                    cloud: {
                        id: cloudId
                    },
                    auth: {
                        username: username,
                        password: password
                    }
                }
            }
        }
        return elasticSearchClientOptions
    }

    protected prepareClientArgs(
        endPoint: string | undefined,
        cloudId: string | undefined,
        credentialData: ICommonObject,
        nodeData: INodeData,
        similarityMeasure: string,
        indexName: string
    ) {
        let elasticSearchClientOptions = this.prepareConnectionOptions(endPoint, cloudId, credentialData, nodeData)
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
        return elasticSearchClientArgs
    }
}
