import { flatten } from 'lodash'
import { v4 as uuid } from 'uuid'
import { QdrantClient } from '@qdrant/js-client-rest'
import type { Schemas } from '@qdrant/js-client-rest'
import { VectorStoreRetrieverInput } from '@langchain/core/vectorstores'
import { Document } from '@langchain/core/documents'
import { QdrantVectorStore, QdrantLibArgs } from '@langchain/qdrant'
import { Embeddings } from '@langchain/core/embeddings'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { FLOWISE_CHATID, getBaseClasses, getCredentialData, getCredentialParam, parseJsonBody } from '../../../src/utils'
import { index } from '../../../src/indexing'
import { howToUseFileUpload } from '../VectorStoreUtils'

type RetrieverConfig = Partial<VectorStoreRetrieverInput<QdrantVectorStore>>
type QdrantAddDocumentOptions = {
    customPayload?: Record<string, any>[]
    ids?: string[]
}

// BM25-only, server-side inference; not user-configurable in v1. The "Sparse Inference Model"
// field stays visible so users know it exists, but init()/upsert() throw if it's ever changed
// from this value, since no other model is supported yet.
const SPARSE_INFERENCE_MODEL = 'qdrant/bm25'
const DEFAULT_SPARSE_VECTOR_NAME = 'sparse'
// Sensible default name for the dense vector once a collection needs named vectors
// (Qdrant requires named vectors as soon as a collection holds more than one).
const DEFAULT_DENSE_VECTOR_NAME = 'dense'

type RetrievalMode = 'Dense' | 'Sparse' | 'Hybrid'
type FusionMethod = 'RRF' | 'DBSF'

const RETRIEVAL_MODES: RetrievalMode[] = ['Dense', 'Sparse', 'Hybrid']
const FUSION_METHODS: FusionMethod[] = ['RRF', 'DBSF']

// Validates (case-insensitively) rather than just casting, so an unexpected stored value
// (e.g. lowercase "hybrid" from a stale flow) throws instead of silently taking the wrong branch.
const normalizeRetrievalMode = (value: unknown): RetrievalMode => {
    if (value === undefined || value === null || value === '') return 'Dense'
    const match = RETRIEVAL_MODES.find((mode) => mode.toLowerCase() === String(value).toLowerCase())
    if (!match) {
        throw new Error(`Invalid retrievalMode "${value}" — expected one of: ${RETRIEVAL_MODES.join(', ')}.`)
    }
    return match
}

const normalizeFusionMethod = (value: unknown): FusionMethod => {
    if (value === undefined || value === null || value === '') return 'RRF'
    const match = FUSION_METHODS.find((method) => method.toLowerCase() === String(value).toLowerCase())
    if (!match) {
        throw new Error(`Invalid fusionMethod "${value}" — expected one of: ${FUSION_METHODS.join(', ')}.`)
    }
    return match
}

// The field is shown for visibility of a possible future option; it isn't wired up to anything
// yet, so a changed value must fail loudly instead of being silently discarded.
const assertSupportedSparseInferenceModel = (retrievalMode: RetrievalMode, sparseInferenceModel: string): void => {
    if (retrievalMode !== 'Dense' && sparseInferenceModel !== SPARSE_INFERENCE_MODEL) {
        throw new Error(
            `Sparse Inference Model "${sparseInferenceModel}" is not supported yet — only "${SPARSE_INFERENCE_MODEL}" is available in ` +
                `this version.`
        )
    }
}

// Server-side-inference input shape: Qdrant computes the actual sparse {indices, values} vector
// from `text` using `model` — the client never builds {indices, values} itself.
const buildSparseQueryDocument = (text: string) => ({ text, model: SPARSE_INFERENCE_MODEL })

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
        this.version = 6.0
        this.type = 'Qdrant'
        this.icon = 'qdrant.png'
        this.category = 'Vector Stores'
        this.description =
            'Upsert embedded data and perform similarity search upon query using Qdrant, a scalable open source vector database written in Rust'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
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
                type: 'string',
                acceptVariable: true
            },
            {
                label: 'Retrieval Mode',
                name: 'retrievalMode',
                description: 'Dense (embeddings only), Sparse (BM25 only), or Hybrid (both, fused)',
                type: 'options',
                default: 'Dense',
                options: [
                    {
                        label: 'Dense',
                        name: 'Dense'
                    },
                    {
                        label: 'Sparse',
                        name: 'Sparse'
                    },
                    {
                        label: 'Hybrid',
                        name: 'Hybrid'
                    }
                ]
            },
            {
                label: 'File Upload',
                name: 'fileUpload',
                description: 'Allow file upload on the chat',
                hint: {
                    label: 'How to use',
                    value: howToUseFileUpload
                },
                type: 'boolean',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Vector Dimension',
                name: 'qdrantVectorDimension',
                type: 'number',
                default: 1536,
                additionalParams: true
            },
            {
                label: 'Content Key',
                name: 'contentPayloadKey',
                description: 'The key for storing text. Default to `content`',
                type: 'string',
                default: 'content',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Metadata Key',
                name: 'metadataPayloadKey',
                description: 'The key for storing metadata. Default to `metadata`',
                type: 'string',
                default: 'metadata',
                optional: true,
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
                label: 'Dense Vector Name',
                name: 'vectorName',
                description:
                    'Named dense vector slot. In Dense mode, leave empty to keep using the default unnamed vector (unchanged, ' +
                    'backward-compatible behavior); setting it switches Dense mode to a named-vector collection created/validated/' +
                    'queried by this name instead. In Hybrid mode the dense vector is always named — this sets that name (defaults ' +
                    'to "dense" if left blank).',
                type: 'string',
                optional: true,
                additionalParams: true,
                show: {
                    retrievalMode: ['Dense', 'Hybrid']
                }
            },
            {
                label: 'Sparse Vector Name',
                name: 'sparseVectorName',
                description: 'Named sparse vector slot used for BM25.',
                type: 'string',
                default: DEFAULT_SPARSE_VECTOR_NAME,
                additionalParams: true,
                show: {
                    retrievalMode: ['Sparse', 'Hybrid']
                }
            },
            {
                label: 'Sparse Inference Model',
                name: 'sparseInferenceModel',
                description:
                    'Server-side sparse inference model used for BM25 scoring. Fixed to qdrant/bm25 for v1 — shown for visibility ' +
                    'of a possible future option; changing this value throws an error rather than being silently ignored.',
                type: 'string',
                default: SPARSE_INFERENCE_MODEL,
                additionalParams: true,
                show: {
                    retrievalMode: ['Sparse', 'Hybrid']
                }
            },
            {
                label: 'Fusion Method',
                name: 'fusionMethod',
                description: 'How dense and sparse results are combined. Tunable RRF (k, weights) is a future addition, not present in v1.',
                type: 'options',
                default: 'RRF',
                options: [
                    {
                        label: 'RRF (Reciprocal Rank Fusion)',
                        name: 'RRF'
                    },
                    {
                        label: 'DBSF (Distribution-Based Score Fusion)',
                        name: 'DBSF'
                    }
                ],
                additionalParams: true,
                show: {
                    retrievalMode: ['Hybrid']
                }
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
                optional: true,
                acceptVariable: true
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
            const contentPayloadKey = nodeData.inputs?.contentPayloadKey || 'content'
            const metadataPayloadKey = nodeData.inputs?.metadataPayloadKey || 'metadata'
            const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean
            const retrievalMode = normalizeRetrievalMode(nodeData.inputs?.retrievalMode)
            const vectorName = (nodeData.inputs?.vectorName as string) || undefined
            const sparseVectorName = (nodeData.inputs?.sparseVectorName as string) || DEFAULT_SPARSE_VECTOR_NAME
            const sparseInferenceModel = (nodeData.inputs?.sparseInferenceModel as string) || SPARSE_INFERENCE_MODEL
            const denseVectorName = vectorName || DEFAULT_DENSE_VECTOR_NAME
            let qdrantCollectionConfiguration = nodeData.inputs?.qdrantCollectionConfiguration

            assertSupportedSparseInferenceModel(retrievalMode, sparseInferenceModel)

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
                    if (isFileUploadEnabled && options.chatId) {
                        flattenDocs[i].metadata = { ...flattenDocs[i].metadata, [FLOWISE_CHATID]: options.chatId }
                    }
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            const vectorSize = qdrantVectorDimension ? parseInt(qdrantVectorDimension, 10) : 1536
            const distance: Schemas['Distance'] = qdrantSimilarity ?? 'Cosine'

            const dbConfig: QdrantLibArgs = {
                client: client as any,
                url: qdrantServerUrl,
                collectionName,
                collectionConfig: {
                    vectors: {
                        size: vectorSize,
                        distance
                    }
                },
                contentPayloadKey,
                metadataPayloadKey
            }

            // Escape hatch: in Sparse/Hybrid and Dense-with-vectorName-set modes, the user's
            // Additional Collection Configuration JSON is passed through when a brand-new collection
            // is created, with the computed vectors/sparse_vectors config layered on top of it.
            let extraCollectionConfig: Record<string, any> | undefined
            if ((retrievalMode !== 'Dense' || !!vectorName) && qdrantCollectionConfiguration) {
                qdrantCollectionConfiguration =
                    typeof qdrantCollectionConfiguration === 'object'
                        ? qdrantCollectionConfiguration
                        : parseJsonBody(qdrantCollectionConfiguration)
                extraCollectionConfig = qdrantCollectionConfiguration
            }

            // Builds the point's `vector` field for the named-vector modes: Sparse/Hybrid (always
            // named), and Dense-with-vectorName-set. Dense mode with vectorName left blank never uses
            // this — see buildAddVectors's Dense-unnamed call below.
            const buildNamedVector = (embedding: number[], doc: Document): Schemas['VectorStruct'] => {
                if (retrievalMode === 'Dense') {
                    return { [denseVectorName]: embedding }
                }
                const sparseVector = buildSparseQueryDocument(doc.pageContent)
                return retrievalMode === 'Hybrid'
                    ? { [denseVectorName]: embedding, [sparseVectorName]: sparseVector }
                    : { [sparseVectorName]: sparseVector }
            }

            const upsertPoints = async (points: Schemas['PointStruct'][]): Promise<void> => {
                if (points.length === 0) {
                    return
                }
                try {
                    if (_batchSize) {
                        const batchSize = parseInt(_batchSize, 10)
                        for (let i = 0; i < points.length; i += batchSize) {
                            await client.upsert(collectionName, {
                                wait: true,
                                points: points.slice(i, i + batchSize)
                            })
                        }
                    } else {
                        await client.upsert(collectionName, {
                            wait: true,
                            points
                        })
                    }
                } catch (e: any) {
                    throw new Error(`${e?.status ?? 'Undefined error code'} ${e?.message}: ${e?.data?.status?.error}`)
                }
            }

            // Shared addVectors builder for both Dense-unnamed (raw vector, per-call ensureCollection()
            // pre-upsert hook) and the named-vector modes (record shape, no hook — the collection is
            // already ensured once before addVectors is ever assigned). Keeping one builder avoids
            // duplicating the batching/upsert/error-formatting logic per shape.
            const buildAddVectors = (
                buildVector: (embedding: number[], doc: Document) => Schemas['VectorStruct'],
                beforeUpsert?: () => Promise<void>
            ) => {
                return async (vectors: number[][], documents: Document[], documentOptions?: QdrantAddDocumentOptions): Promise<void> => {
                    if (vectors.length === 0) {
                        return
                    }

                    if (beforeUpsert) {
                        await beforeUpsert()
                    }

                    const points = vectors.map((embedding, idx) => ({
                        id: documentOptions?.ids?.length ? documentOptions?.ids[idx] : uuid(),
                        vector: buildVector(embedding, documents[idx]),
                        payload: {
                            [contentPayloadKey]: documents[idx].pageContent,
                            [metadataPayloadKey]: documents[idx].metadata,
                            customPayload: documentOptions?.customPayload?.length ? documentOptions?.customPayload[idx] : undefined
                        }
                    }))

                    await upsertPoints(points)
                }
            }

            try {
                if (recordManager) {
                    const vectorStore = new QdrantVectorStore(embeddings, dbConfig)

                    if (retrievalMode === 'Dense' && !vectorName) {
                        await vectorStore.ensureCollection()
                    } else {
                        // Bypass @langchain/qdrant's ensureCollection() (dense-only, no named-vector
                        // or sparse concept) and go straight to @qdrant/js-client-rest. Called once
                        // here, not again inside addVectors below — a deliberate difference from
                        // Dense-unnamed mode's double-ensureCollection-call behavior on a cold
                        // collection (kept unmodified for Dense-unnamed, since existing tests pin
                        // it); for Sparse/Hybrid/Dense-named a single call is cleaner and avoids
                        // repeating a getCollection/createCollection round trip per batch.
                        await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, collectionName, {
                            retrievalMode,
                            vectorSize,
                            distance,
                            denseVectorName,
                            sparseVectorName,
                            allowCreate: true,
                            extraCollectionConfig
                        })
                    }

                    vectorStore.addVectors =
                        retrievalMode === 'Dense' && !vectorName
                            ? buildAddVectors(
                                  (embedding) => embedding,
                                  () => vectorStore.ensureCollection()
                              )
                            : buildAddVectors(buildNamedVector)

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

                    // Sparse mode still goes through embedDocuments() here (recordManager's index()
                    // owns the embed loop) even though buildNamedVector discards the resulting
                    // embedding for Sparse — wasted embedding-provider cost/latency per document. Not
                    // fixed for the recordManager path; the non-recordManager Sparse path below
                    // avoids it by building points directly.
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
                    if (retrievalMode === 'Dense' && !vectorName) {
                        if (_batchSize) {
                            const batchSize = parseInt(_batchSize, 10)
                            for (let i = 0; i < finalDocs.length; i += batchSize) {
                                const batch = finalDocs.slice(i, i + batchSize)
                                await QdrantVectorStore.fromDocuments(batch, embeddings, dbConfig)
                            }
                        } else {
                            await QdrantVectorStore.fromDocuments(finalDocs, embeddings, dbConfig)
                        }
                    } else if (retrievalMode === 'Sparse') {
                        await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, collectionName, {
                            retrievalMode,
                            vectorSize,
                            distance,
                            denseVectorName,
                            sparseVectorName,
                            allowCreate: true,
                            extraCollectionConfig
                        })

                        // Sparse has no dense component, so there is no embedding to compute at all —
                        // build points directly from finalDocs and upsert them without ever calling
                        // embedDocuments() (unlike the recordManager path above).
                        const points = finalDocs.map((doc) => ({
                            id: uuid(),
                            vector: { [sparseVectorName]: buildSparseQueryDocument(doc.pageContent) },
                            payload: {
                                [contentPayloadKey]: doc.pageContent,
                                [metadataPayloadKey]: doc.metadata,
                                customPayload: undefined
                            }
                        }))
                        await upsertPoints(points)
                    } else {
                        // Hybrid and Dense-with-vectorName-set both need a dense embedding, so go
                        // through addDocuments() -> embedDocuments() -> addVectors() like Dense-unnamed
                        // does above.
                        await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, collectionName, {
                            retrievalMode,
                            vectorSize,
                            distance,
                            denseVectorName,
                            sparseVectorName,
                            allowCreate: true,
                            extraCollectionConfig
                        })

                        const vectorStore = new QdrantVectorStore(embeddings, dbConfig)
                        vectorStore.addVectors = buildAddVectors(buildNamedVector)

                        if (_batchSize) {
                            const batchSize = parseInt(_batchSize, 10)
                            for (let i = 0; i < finalDocs.length; i += batchSize) {
                                const batch = finalDocs.slice(i, i + batchSize)
                                await vectorStore.addDocuments(batch)
                            }
                        } else {
                            await vectorStore.addDocuments(finalDocs)
                        }
                    }
                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e)
            }
        },
        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const qdrantServerUrl = nodeData.inputs?.qdrantServerUrl as string
            const collectionName = nodeData.inputs?.qdrantCollection as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const qdrantSimilarity = nodeData.inputs?.qdrantSimilarity
            const qdrantVectorDimension = nodeData.inputs?.qdrantVectorDimension
            const recordManager = nodeData.inputs?.recordManager

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const qdrantApiKey = getCredentialParam('qdrantApiKey', credentialData, nodeData)

            const port = Qdrant_VectorStores.determinePortByUrl(qdrantServerUrl)

            const client = new QdrantClient({
                url: qdrantServerUrl,
                apiKey: qdrantApiKey,
                port: port
            })

            const dbConfig: QdrantLibArgs = {
                client: client as any,
                url: qdrantServerUrl,
                collectionName,
                collectionConfig: {
                    vectors: {
                        size: qdrantVectorDimension ? parseInt(qdrantVectorDimension, 10) : 1536,
                        distance: qdrantSimilarity ?? 'Cosine'
                    }
                }
            }

            const vectorStore = new QdrantVectorStore(embeddings, dbConfig)

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

            try {
                if (recordManager) {
                    const vectorStoreName = collectionName
                    await recordManager.createSchema()
                    ;(recordManager as any).namespace = (recordManager as any).namespace + '_' + vectorStoreName
                    const filterKeys: ICommonObject = {}
                    if (options.docId) {
                        filterKeys.docId = options.docId
                    }
                    const keys: string[] = await recordManager.listKeys(filterKeys)

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
        const qdrantServerUrl = nodeData.inputs?.qdrantServerUrl as string
        const collectionName = nodeData.inputs?.qdrantCollection as string
        let qdrantCollectionConfiguration = nodeData.inputs?.qdrantCollectionConfiguration
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const qdrantSimilarity = nodeData.inputs?.qdrantSimilarity
        const qdrantVectorDimension = nodeData.inputs?.qdrantVectorDimension
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        let queryFilter = nodeData.inputs?.qdrantFilter
        const contentPayloadKey = nodeData.inputs?.contentPayloadKey || 'content'
        const metadataPayloadKey = nodeData.inputs?.metadataPayloadKey || 'metadata'
        const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean
        const retrievalMode = normalizeRetrievalMode(nodeData.inputs?.retrievalMode)
        const vectorName = (nodeData.inputs?.vectorName as string) || undefined
        const sparseVectorName = (nodeData.inputs?.sparseVectorName as string) || DEFAULT_SPARSE_VECTOR_NAME
        const sparseInferenceModel = (nodeData.inputs?.sparseInferenceModel as string) || SPARSE_INFERENCE_MODEL
        const denseVectorName = vectorName || DEFAULT_DENSE_VECTOR_NAME
        const fusionMethod = normalizeFusionMethod(nodeData.inputs?.fusionMethod)

        assertSupportedSparseInferenceModel(retrievalMode, sparseInferenceModel)

        const k = topK ? parseFloat(topK) : 4

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const qdrantApiKey = getCredentialParam('qdrantApiKey', credentialData, nodeData)

        const port = Qdrant_VectorStores.determinePortByUrl(qdrantServerUrl)

        const client = new QdrantClient({
            url: qdrantServerUrl,
            apiKey: qdrantApiKey,
            port: port
        })

        const vectorSize = qdrantVectorDimension ? parseInt(qdrantVectorDimension, 10) : 1536
        const distance: Schemas['Distance'] = qdrantSimilarity ?? 'Cosine'

        const dbConfig: QdrantLibArgs = {
            client: client as any,
            collectionName,
            contentPayloadKey,
            metadataPayloadKey
        }

        const retrieverConfig: RetrieverConfig = {
            k
        }

        let extraCollectionConfig: Record<string, any> | undefined
        if (qdrantCollectionConfiguration) {
            qdrantCollectionConfiguration =
                typeof qdrantCollectionConfiguration === 'object'
                    ? qdrantCollectionConfiguration
                    : parseJsonBody(qdrantCollectionConfiguration)
            dbConfig.collectionConfig = {
                ...qdrantCollectionConfiguration,
                vectors: {
                    ...qdrantCollectionConfiguration.vectors,
                    size: vectorSize,
                    distance
                }
            }
            extraCollectionConfig = qdrantCollectionConfiguration
        }

        if (queryFilter) {
            retrieverConfig.filter = typeof queryFilter === 'object' ? queryFilter : parseJsonBody(queryFilter)
        }
        if (isFileUploadEnabled && options.chatId) {
            retrieverConfig.filter = retrieverConfig.filter || {}

            retrieverConfig.filter.should = Array.isArray(retrieverConfig.filter.should) ? retrieverConfig.filter.should : []

            retrieverConfig.filter.should.push(
                {
                    key: `metadata.${FLOWISE_CHATID}`,
                    match: {
                        value: options.chatId
                    }
                },
                {
                    is_empty: {
                        key: `metadata.${FLOWISE_CHATID}`
                    }
                }
            )
        }

        let vectorStore: QdrantVectorStore

        if (retrievalMode === 'Dense' && !vectorName) {
            vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, dbConfig)
        } else {
            vectorStore = new QdrantVectorStore(embeddings, dbConfig)

            // Query-only path: never create or alter the collection schema here. If the collection
            // doesn't exist, or the vector this mode needs isn't there, fail loudly rather than
            // silently degrading (e.g. falling back to dense-only) or creating an empty collection
            // that would return zero results forever. Schema creation only happens from upsert().
            await Qdrant_VectorStores.ensureCollectionForRetrievalMode(client, collectionName, {
                retrievalMode,
                vectorSize,
                distance,
                denseVectorName,
                sparseVectorName,
                allowCreate: false,
                extraCollectionConfig
            })

            // TS gotcha: client.query() takes snake_case fields matching the REST/Python API
            // exactly (with_payload, with_vector, score_threshold) — no camelCase conversion layer,
            // and these are plain object literals against a generated schema, not class instances.
            //
            // Base VectorStore.similaritySearch()/similaritySearchWithScore() both embed the query
            // themselves and hand only the resulting vector to similaritySearchVectorWithScore() —
            // by the time that method runs, the original query text is gone. Sparse/Hybrid need the
            // raw text for server-side BM25 inference, so the override has to happen one level up,
            // on similaritySearch/similaritySearchWithScore themselves.
            const performSearch = async (queryText: string, k?: number, filter?: any): Promise<[Document, number][]> => {
                let response: Schemas['QueryResponse']

                if (retrievalMode === 'Sparse') {
                    response = await client.query(collectionName, {
                        query: buildSparseQueryDocument(queryText),
                        using: sparseVectorName,
                        limit: k,
                        filter,
                        with_payload: [metadataPayloadKey, contentPayloadKey],
                        with_vector: false
                    })
                } else if (retrievalMode === 'Hybrid') {
                    const denseVector = await embeddings.embedQuery(queryText)
                    response = await client.query(collectionName, {
                        prefetch: [
                            { using: denseVectorName, query: denseVector, filter, limit: k },
                            { using: sparseVectorName, query: buildSparseQueryDocument(queryText), filter, limit: k }
                        ],
                        query: { fusion: fusionMethod.toLowerCase() as 'rrf' | 'dbsf' },
                        limit: k,
                        filter,
                        with_payload: [metadataPayloadKey, contentPayloadKey],
                        with_vector: false
                    })
                } else {
                    // Dense mode with a named vector: plain dense query against the named slot, no
                    // prefetch/fusion — structurally the Hybrid branch's dense half only.
                    const denseVector = await embeddings.embedQuery(queryText)
                    response = await client.query(collectionName, {
                        query: denseVector,
                        using: denseVectorName,
                        limit: k,
                        filter,
                        with_payload: [metadataPayloadKey, contentPayloadKey],
                        with_vector: false
                    })
                }

                const points = response?.points ?? []
                return points.map((point: Schemas['ScoredPoint']) => [
                    new Document({
                        id: point.id as string,
                        metadata: (point.payload?.[metadataPayloadKey] as Record<string, any>) ?? {},
                        pageContent: (point.payload?.[contentPayloadKey] as string | undefined) ?? ''
                    }),
                    point.score
                ])
            }

            vectorStore.similaritySearchWithScore = async (query: string, k?: number, filter?: any): Promise<[Document, number][]> => {
                if (!query) return []
                return performSearch(query, k, filter)
            }

            vectorStore.similaritySearch = async (query: string, k?: number, filter?: any): Promise<Document[]> => {
                if (!query) return []
                const results = await performSearch(query, k, filter)
                return results.map(([doc]) => doc)
            }

            // MMR stays dense-only (query: { nearest, mmr: {...} }) — this node doesn't expose a
            // search-type toggle that would route through it, so there's no gap to close here.
        }

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

    /**
     * Shared create-or-validate helper for named-vector collections: Sparse, Hybrid, and Dense with
     * `vectorName` set. Dense mode with `vectorName` left blank never calls this — it keeps going
     * through @langchain/qdrant's own ensureCollection(), unmodified.
     *
     * `allowCreate` controls what happens when the collection doesn't exist yet: upsert() passes
     * true (creating a collection on first write is expected); init() passes false and gets an
     * actionable error instead — a read must never have the side effect of creating a collection.
     *
     * A missing sparse vector on an already-existing collection always throws regardless of
     * `allowCreate` — Qdrant has no in-place way to add a named vector to an existing collection
     * (qdrant/qdrant#8892), so there is no upgrade path left to gate.
     */
    static async ensureCollectionForRetrievalMode(
        client: QdrantClient,
        collectionName: string,
        params: {
            retrievalMode: RetrievalMode
            vectorSize: number
            distance: Schemas['Distance']
            denseVectorName: string
            sparseVectorName: string
            allowCreate: boolean
            extraCollectionConfig?: Record<string, any>
        }
    ): Promise<void> {
        const { retrievalMode, vectorSize, distance, denseVectorName, sparseVectorName, allowCreate, extraCollectionConfig } = params

        const sparseVectorsConfig = {
            [sparseVectorName]: { modifier: 'idf' as const }
        }

        const { exists } = await client.collectionExists(collectionName)

        if (!exists) {
            if (!allowCreate) {
                throw new Error(
                    `Qdrant collection "${collectionName}" does not exist. This is a query-only path and will not create it — ` +
                        `upsert documents first to create the collection.`
                )
            }

            // Sparse mode: no dense vector at all. Hybrid and named-Dense mode: dense vector gets a
            // name (Qdrant requires named vectors once a collection holds more than one, and named-
            // Dense is explicitly a named-vector collection by the user's own request).
            const vectorsConfig = retrievalMode === 'Sparse' ? undefined : { [denseVectorName]: { size: vectorSize, distance } }

            await client.createCollection(collectionName, {
                ...(extraCollectionConfig ?? {}),
                ...(vectorsConfig ? { vectors: vectorsConfig } : {}),
                // Dense mode has no sparse vector to configure — omit the field entirely rather
                // than sending an empty one.
                ...(retrievalMode === 'Dense' ? {} : { sparse_vectors: sparseVectorsConfig })
            })
            return
        }

        const info = await client.getCollection(collectionName)
        // Schemas['VectorsConfig'] is a `VectorParams | Record<string, VectorParams>` union with no
        // discriminant field TS can narrow automatically — `any` here avoids fighting that; the
        // runtime shape checks below (isUnnamedShape, hasOwnProperty) do the real narrowing.
        const existingVectors = info?.config?.params?.vectors as any
        const existingSparseVectors = info?.config?.params?.sparse_vectors as Record<string, any> | null | undefined

        if (retrievalMode === 'Hybrid' || retrievalMode === 'Dense') {
            Qdrant_VectorStores.validateExistingDenseVector(
                collectionName,
                existingVectors,
                denseVectorName,
                vectorSize,
                distance,
                retrievalMode
            )
        }

        if (retrievalMode === 'Dense') {
            // Dense mode has no sparse vector to check — nothing left to do.
            return
        }

        const hasMatchingSparse = !!existingSparseVectors && Object.prototype.hasOwnProperty.call(existingSparseVectors, sparseVectorName)

        if (!hasMatchingSparse) {
            // Qdrant cannot add a new named vector to an already-existing collection in place
            // (confirmed live against Qdrant v1.18.3) — see the open feature request at
            // https://github.com/qdrant/qdrant/issues/8892. There is currently no in-place way to do
            // this, so both the query-only and upsert paths fail loudly here rather than silently
            // degrading or half-succeeding.
            throw new Error(
                `Qdrant collection "${collectionName}" has no sparse vector named "${sparseVectorName}", and Qdrant's server API does ` +
                    `not support adding a new named vector to an existing collection (see qdrant/qdrant#8892) — retrying or upserting ` +
                    `will not fix this. To use ${retrievalMode} mode with this data, create a new collection with both dense and ` +
                    `sparse vectors configured from the start, or manually migrate this collection's points into one.`
            )
        }
    }

    /**
     * Validates an existing collection's dense vector against what Hybrid/named-Dense mode expects.
     * Only the named shape (`{ [name]: { size, distance } }`) is usable — an unnamed dense vector
     * (`{ size, distance }`) can't be addressed by name in queries or upserts (Qdrant addresses it
     * as `''`, not by name), so it's rejected here even when size/distance would otherwise match,
     * rather than surfacing as an opaque server error later.
     */
    static validateExistingDenseVector(
        collectionName: string,
        existingVectors: any,
        denseVectorName: string,
        vectorSize: number,
        distance: Schemas['Distance'],
        retrievalMode: RetrievalMode
    ): void {
        if (!existingVectors || (typeof existingVectors === 'object' && Object.keys(existingVectors).length === 0)) {
            throw new Error(
                `Qdrant collection "${collectionName}" has no dense vector configured — ${retrievalMode} mode requires one. Create a ` +
                    `new collection, or switch to Sparse mode.`
            )
        }

        const isUnnamedShape = typeof existingVectors.size === 'number'
        if (isUnnamedShape) {
            throw new Error(
                `Qdrant collection "${collectionName}" uses an unnamed dense vector; ${retrievalMode} mode requires named vectors ` +
                    `(dense vector "${denseVectorName}") — create a new collection with named vectors configured from the start.`
            )
        }

        const target = existingVectors[denseVectorName]

        if (!target) {
            const availableNames = Object.keys(existingVectors).join(', ') || 'none'
            throw new Error(
                `Qdrant collection "${collectionName}" has no dense vector named "${denseVectorName}". Available named vectors: ${availableNames}.`
            )
        }

        if (target.size !== vectorSize || target.distance !== distance) {
            throw new Error(
                `Qdrant collection "${collectionName}"'s existing dense vector (size=${target.size}, distance=${target.distance}) ` +
                    `does not match the requested configuration (size=${vectorSize}, distance=${distance}).`
            )
        }
    }
}

module.exports = { nodeClass: Qdrant_VectorStores }
