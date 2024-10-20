import { flatten } from 'lodash'
import { Client, ClientOptions } from '@elastic/elasticsearch'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'
import { ElasticClientArgs, ElasticVectorSearch } from '@langchain/community/vectorstores/elasticsearch'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { index } from '../../../src/indexing'

class Elasticsearch_VectorStores implements INode {
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

    constructor() {
        this.label = 'Elasticsearch'
        this.name = 'elasticsearch'
        this.version = 2.0
        this.description =
            'Upsert embedded data and perform similarity search upon query using Elasticsearch, a distributed search and analytics engine'
        this.type = 'Elasticsearch'
        this.icon = 'elasticsearch.png'
        this.category = 'Vector Stores'
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
                list: true,
                optional: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Record Manager',
                name: 'recordManager',
                type: 'RecordManager',
                description: 'Keep track of the record to prevent duplication',
                optional: true
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

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const endPoint = getCredentialParam('endpoint', credentialData, nodeData)
            const cloudId = getCredentialParam('cloudId', credentialData, nodeData)
            const indexName = nodeData.inputs?.indexName as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const similarityMeasure = nodeData.inputs?.similarityMeasure as string
            const recordManager = nodeData.inputs?.recordManager

            const docs = nodeData.inputs?.document as Document[]
            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            // The following code is a workaround for a bug (Langchain Issue #1589) in the underlying library.
            // Store does not support object in metadata and fail silently
            finalDocs.forEach((d) => {
                delete d.metadata.pdf
                delete d.metadata.loc
            })
            // end of workaround

            const elasticSearchClientArgs = prepareClientArgs(endPoint, cloudId, credentialData, nodeData, similarityMeasure, indexName)
            const vectorStore = new ElasticVectorSearch(embeddings, elasticSearchClientArgs)

            try {
                if (recordManager) {
                    const vectorStore = await ElasticVectorSearch.fromExistingIndex(embeddings, elasticSearchClientArgs)
                    await recordManager.createSchema()
                    const res = await index({
                        docsSource: finalDocs,
                        recordManager,
                        vectorStore,
                        options: {
                            cleanup: recordManager?.cleanup,
                            sourceIdKey: recordManager?.sourceIdKey ?? 'source',
                            vectorStoreName: indexName
                        }
                    })
                    return res
                } else {
                    await vectorStore.addDocuments(finalDocs)
                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e)
            }
        },
        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const indexName = nodeData.inputs?.indexName as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const similarityMeasure = nodeData.inputs?.similarityMeasure as string
            const recordManager = nodeData.inputs?.recordManager

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const endPoint = getCredentialParam('endpoint', credentialData, nodeData)
            const cloudId = getCredentialParam('cloudId', credentialData, nodeData)

            const elasticSearchClientArgs = prepareClientArgs(endPoint, cloudId, credentialData, nodeData, similarityMeasure, indexName)
            const vectorStore = new ElasticVectorSearch(embeddings, elasticSearchClientArgs)

            try {
                if (recordManager) {
                    const vectorStoreName = indexName
                    await recordManager.createSchema()
                    ;(recordManager as any).namespace = (recordManager as any).namespace + '_' + vectorStoreName
                    const keys: string[] = await recordManager.listKeys({})

                    await vectorStore.delete({ ids: keys })
                    await recordManager.deleteKeys(keys)
                } else {
                    await vectorStore.delete({ ids })
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const endPoint = getCredentialParam('endpoint', credentialData, nodeData)
        const cloudId = getCredentialParam('cloudId', credentialData, nodeData)
        const indexName = nodeData.inputs?.indexName as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string
        const similarityMeasure = nodeData.inputs?.similarityMeasure as string
        const k = topK ? parseFloat(topK) : 4
        const output = nodeData.outputs?.output as string

        const elasticSearchClientArgs = prepareClientArgs(endPoint, cloudId, credentialData, nodeData, similarityMeasure, indexName)
        const vectorStore = await ElasticVectorSearch.fromExistingIndex(embeddings, elasticSearchClientArgs)

        if (output === 'retriever') {
            return vectorStore.asRetriever(k)
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

const prepareConnectionOptions = (
    endPoint: string | undefined,
    cloudId: string | undefined,
    credentialData: ICommonObject,
    nodeData: INodeData
) => {
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

const prepareClientArgs = (
    endPoint: string | undefined,
    cloudId: string | undefined,
    credentialData: ICommonObject,
    nodeData: INodeData,
    similarityMeasure: string,
    indexName: string
) => {
    let elasticSearchClientOptions = prepareConnectionOptions(endPoint, cloudId, credentialData, nodeData)
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

module.exports = { nodeClass: Elasticsearch_VectorStores }
