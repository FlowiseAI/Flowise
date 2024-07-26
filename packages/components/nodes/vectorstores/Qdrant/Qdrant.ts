import { flatten } from 'lodash'
import { v4 as uuid } from 'uuid'
import { QdrantClient } from '@qdrant/js-client-rest'
import { VectorStoreRetrieverInput } from '@langchain/core/vectorstores'
import { Document } from '@langchain/core/documents'
import { QdrantVectorStore, QdrantLibArgs } from '@langchain/community/vectorstores/qdrant'
import { Embeddings } from '@langchain/core/embeddings'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { index } from '../../../src/indexing'

type RetrieverConfig = Partial<VectorStoreRetrieverInput<QdrantVectorStore>>
type QdrantAddDocumentOptions = {
    customPayload?: Record<string, any>[]
    ids?: string[]
}

class Qdrant_VectorStores implements INode {
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
        this.label = 'Qdrant'
        this.name = 'qdrant'
        this.version = 3.0
        this.type = 'Qdrant'
        this.icon = 'qdrant.png'
        this.category = 'Vector Stores'
        this.description =
            'Upsert embedded data and perform similarity search upon query using Qdrant, a scalable open source vector database written in Rust'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.badge = 'NEW'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            description: 'Only needed when using Qdrant cloud hosted',
            optional: true,
            credentialNames: ['qdrantApi']
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
                label: 'Qdrant Server URL',
                name: 'qdrantServerUrl',
                type: 'string',
                placeholder: 'http://localhost:6333'
            },
            {
                label: 'Qdrant Collection Name',
                name: 'qdrantCollection',
                type: 'string'
            },
            {
                label: 'Vector Dimension',
                name: 'qdrantVectorDimension',
                type: 'number',
                default: 1536,
                additionalParams: true
            },
            {
                label: 'Upsert Batch Size',
                name: 'batchSize',
                type: 'number',
                step: 1,
                description: 'Upsert in batches of size N',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Similarity',
                name: 'qdrantSimilarity',
                description: 'Similarity measure used in Qdrant.',
                type: 'options',
                default: 'Cosine',
                options: [
                    {
                        label: 'Cosine',
                        name: 'Cosine'
                    },
                    {
                        label: 'Euclid',
                        name: 'Euclid'
                    },
                    {
                        label: 'Dot',
                        name: 'Dot'
                    }
                ],
                additionalParams: true
            },
            {
                label: 'Additional Collection Cofiguration',
                name: 'qdrantCollectionConfiguration',
                description:
                    'Refer to <a target="_blank" href="https://qdrant.tech/documentation/concepts/collections">collection docs</a> for more reference',
                type: 'json',
                optional: true,
                additionalParams: true
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
                label: 'Qdrant Search Filter',
                name: 'qdrantFilter',
                description: 'Only return points which satisfy the conditions',
                type: 'json',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Qdrant Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Qdrant Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(QdrantVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const qdrantServerUrl = nodeData.inputs?.qdrantServerUrl as string
            const collectionName = nodeData.inputs?.qdrantCollection as string
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const qdrantSimilarity = nodeData.inputs?.qdrantSimilarity
            const qdrantVectorDimension = nodeData.inputs?.qdrantVectorDimension
            const recordManager = nodeData.inputs?.recordManager
            const _batchSize = nodeData.inputs?.batchSize

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const qdrantApiKey = getCredentialParam('qdrantApiKey', credentialData, nodeData)

            const port = Qdrant_VectorStores.determinePortByUrl(qdrantServerUrl)

            const client = new QdrantClient({
                url: qdrantServerUrl,
                apiKey: qdrantApiKey,
                port: port
            })

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            const dbConfig: QdrantLibArgs = {
                client,
                url: qdrantServerUrl,
                collectionName,
                collectionConfig: {
                    vectors: {
                        size: qdrantVectorDimension ? parseInt(qdrantVectorDimension, 10) : 1536,
                        distance: qdrantSimilarity ?? 'Cosine'
                    }
                }
            }

            try {
                if (recordManager) {
                    const vectorStore = new QdrantVectorStore(embeddings, dbConfig)
                    await vectorStore.ensureCollection()

                    vectorStore.addVectors = async (
                        vectors: number[][],
                        documents: Document[],
                        documentOptions?: QdrantAddDocumentOptions
                    ): Promise<void> => {
                        if (vectors.length === 0) {
                            return
                        }

                        await vectorStore.ensureCollection()

                        const points = vectors.map((embedding, idx) => ({
                            id: documentOptions?.ids?.length ? documentOptions?.ids[idx] : uuid(),
                            vector: embedding,
                            payload: {
                                content: documents[idx].pageContent,
                                metadata: documents[idx].metadata,
                                customPayload: documentOptions?.customPayload?.length ? documentOptions?.customPayload[idx] : undefined
                            }
                        }))

                        try {
                            if (_batchSize) {
                                const batchSize = parseInt(_batchSize, 10)
                                for (let i = 0; i < points.length; i += batchSize) {
                                    const batchPoints = points.slice(i, i + batchSize)
                                    await client.upsert(collectionName, {
                                        wait: true,
                                        points: batchPoints
                                    })
                                }
                            } else {
                                await client.upsert(collectionName, {
                                    wait: true,
                                    points
                                })
                            }
                        } catch (e: any) {
                            const error = new Error(`${e?.status ?? 'Undefined error code'} ${e?.message}: ${e?.data?.status?.error}`)
                            throw error
                        }
                    }

                    vectorStore.delete = async (params: { ids: string[] }): Promise<void> => {
                        const { ids } = params

                        if (ids?.length) {
                            try {
                                client.delete(collectionName, {
                                    points: ids
                                })
                            } catch (e) {
                                console.error('Failed to delete')
                            }
                        }
                    }

                    await recordManager.createSchema()

                    const res = await index({
                        docsSource: finalDocs,
                        recordManager,
                        vectorStore,
                        options: {
                            cleanup: recordManager?.cleanup,
                            sourceIdKey: recordManager?.sourceIdKey ?? 'source',
                            vectorStoreName: collectionName
                        }
                    })

                    return res
                } else {
                    if (_batchSize) {
                        const batchSize = parseInt(_batchSize, 10)
                        for (let i = 0; i < finalDocs.length; i += batchSize) {
                            const batch = finalDocs.slice(i, i + batchSize)
                            await QdrantVectorStore.fromDocuments(batch, embeddings, dbConfig)
                        }
                    } else {
                        await QdrantVectorStore.fromDocuments(finalDocs, embeddings, dbConfig)
                    }
                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const qdrantServerUrl = nodeData.inputs?.qdrantServerUrl as string
        const collectionName = nodeData.inputs?.qdrantCollection as string
        let qdrantCollectionConfiguration = nodeData.inputs?.qdrantCollectionConfiguration
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const qdrantSimilarity = nodeData.inputs?.qdrantSimilarity
        const qdrantVectorDimension = nodeData.inputs?.qdrantVectorDimension
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        let queryFilter = nodeData.inputs?.qdrantFilter

        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const qdrantApiKey = getCredentialParam('qdrantApiKey', credentialData, nodeData)

        const port = Qdrant_VectorStores.determinePortByUrl(qdrantServerUrl)

        const client = new QdrantClient({
            url: qdrantServerUrl,
            apiKey: qdrantApiKey,
            port: port
        })

        const dbConfig: QdrantLibArgs = {
            client,
            collectionName
        }

        const retrieverConfig: RetrieverConfig = {
            k
        }

        if (qdrantCollectionConfiguration) {
            qdrantCollectionConfiguration =
                typeof qdrantCollectionConfiguration === 'object'
                    ? qdrantCollectionConfiguration
                    : JSON.parse(qdrantCollectionConfiguration)
            dbConfig.collectionConfig = {
                ...qdrantCollectionConfiguration,
                vectors: {
                    ...qdrantCollectionConfiguration.vectors,
                    size: qdrantVectorDimension ? parseInt(qdrantVectorDimension, 10) : 1536,
                    distance: qdrantSimilarity ?? 'Cosine'
                }
            }
        }

        if (queryFilter) {
            retrieverConfig.filter = typeof queryFilter === 'object' ? queryFilter : JSON.parse(queryFilter)
        }

        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, dbConfig)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(retrieverConfig)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            if (queryFilter) {
                ;(vectorStore as any).filter = retrieverConfig.filter
            }
            return vectorStore
        }
        return vectorStore
    }

    /**
     * Determine the port number from the given URL.
     *
     * The problem is when not doing this the qdrant-client.js will fall back on 6663 when you enter a port 443 and 80.
     * See: https://stackoverflow.com/questions/59104197/nodejs-new-url-urlhttps-myurl-com80-lists-the-port-as-empty
     * @param qdrantServerUrl the url to get the port from
     */
    static determinePortByUrl(qdrantServerUrl: string): number {
        const parsedUrl = new URL(qdrantServerUrl)

        let port = parsedUrl.port ? parseInt(parsedUrl.port) : 6663

        if (parsedUrl.protocol === 'https:' && parsedUrl.port === '') {
            port = 443
        }
        if (parsedUrl.protocol === 'http:' && parsedUrl.port === '') {
            port = 80
        }

        return port
    }
}

module.exports = { nodeClass: Qdrant_VectorStores }
