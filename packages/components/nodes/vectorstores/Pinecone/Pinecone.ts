import { flatten } from 'lodash'
import { Pinecone } from '@pinecone-database/pinecone'
import { PineconeStoreParams, PineconeStore } from '@langchain/pinecone'
import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { VectorStore } from '@langchain/core/vectorstores'
import { ScoreThresholdRetriever } from '@langchain/classic/retrievers/score_threshold'
import { ContextualCompressionRetriever } from '@langchain/classic/retrievers/contextual_compression'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { FLOWISE_CHATID, getBaseClasses, getCredentialData, getCredentialParam, parseJsonBody } from '../../../src/utils'
import { howToUseFileUpload } from '../VectorStoreUtils'
import { index } from '../../../src/indexing'
import { PineconeHybridRetriever, generateSparseVectorsBatch } from './PineconeHybridRetriever'
import { PineconeRerankCompressor } from './PineconeRerankCompressor'

class Pinecone_VectorStores implements INode {
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
        this.label = 'Pinecone'
        this.name = 'pinecone'
        this.version = 6.0
        this.type = 'Pinecone'
        this.icon = 'pinecone.svg'
        this.category = 'Vector Stores'
        this.description = `Upsert embedded data and perform similarity, hybrid, or sparse search with optional reranking using Pinecone, a leading fully managed hosted vector database`
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['pineconeApi']
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
                label: 'Pinecone Index',
                name: 'pineconeIndex',
                type: 'string'
            },
            {
                label: 'Pinecone Namespace',
                name: 'pineconeNamespace',
                type: 'string',
                placeholder: 'my-first-namespace',
                additionalParams: true,
                optional: true
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
                label: 'Pinecone Text Key',
                name: 'pineconeTextKey',
                description: 'The key in the metadata for storing text. Default to `text`',
                type: 'string',
                placeholder: 'text',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Pinecone Metadata Filter',
                name: 'pineconeMetadataFilter',
                type: 'json',
                optional: true,
                additionalParams: true,
                acceptVariable: true
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
            // ── Search Type ─────────────────────────────────────────
            {
                label: 'Search Type',
                name: 'searchType',
                type: 'options',
                default: 'dense',
                options: [
                    {
                        label: 'Dense (Similarity)',
                        name: 'dense',
                        description: 'Standard semantic similarity search using dense embeddings'
                    },
                    {
                        label: 'Max Marginal Relevance (MMR)',
                        name: 'mmr',
                        description: 'Balances relevance and diversity in results'
                    },
                    {
                        label: 'Sparse (Keyword / BM25)',
                        name: 'sparse',
                        description: 'Pure keyword-based search using sparse vectors via Pinecone Inference'
                    },
                    {
                        label: 'Hybrid (Dense + Sparse)',
                        name: 'hybrid',
                        description: 'Combines semantic and keyword search with configurable weighting'
                    }
                ],
                additionalParams: true,
                optional: true
            },
            // ── MMR Parameters ──────────────────────────────────────
            {
                label: 'Fetch K (for MMR Search)',
                name: 'fetchK',
                description: 'Number of initial documents to fetch for MMR reranking. Default to 20. Used only when the search type is MMR',
                placeholder: '20',
                type: 'number',
                additionalParams: true,
                optional: true,
                show: {
                    searchType: 'mmr'
                }
            },
            {
                label: 'Lambda (for MMR Search)',
                name: 'lambda',
                description:
                    'Number between 0 and 1 that determines the degree of diversity among the results, where 0 corresponds to maximum diversity and 1 to minimum diversity. Used only when the search type is MMR',
                placeholder: '0.5',
                type: 'number',
                additionalParams: true,
                optional: true,
                show: {
                    searchType: 'mmr'
                }
            },
            // ── Hybrid / Sparse Parameters ──────────────────────────
            {
                label: 'Sparse Embedding Model',
                name: 'sparseModel',
                description:
                    'Pinecone Inference sparse embedding model used for keyword/BM25 encoding. Required for sparse and hybrid search types.',
                type: 'string',
                default: 'pinecone-sparse-english-v0',
                placeholder: 'pinecone-sparse-english-v0',
                additionalParams: true,
                optional: true,
                show: {
                    searchType: ['hybrid', 'sparse']
                }
            },
            {
                label: 'Alpha (Hybrid Search Weighting)',
                name: 'alpha',
                description:
                    'Number between 0.0 and 1.0 that determines the weighting between dense and sparse search. ' +
                    '1.0 = pure dense (semantic), 0.0 = pure sparse (keyword). Default is 0.5 (equal weighting).',
                placeholder: '0.5',
                type: 'number',
                step: 0.1,
                additionalParams: true,
                optional: true,
                show: {
                    searchType: 'hybrid'
                }
            },
            // ── Similarity Threshold ────────────────────────────────
            {
                label: 'Similarity Threshold',
                name: 'similarityThreshold',
                description:
                    'Minimum similarity score to filter retrieved documents. ' +
                    'Score range depends on your index metric (e.g. 0.0–1.0 for cosine). ' +
                    'Leave empty to return all Top K results.',
                type: 'number',
                step: 0.05,
                additionalParams: true,
                optional: true
            },
            // ── Reranking ───────────────────────────────────────────
            {
                label: 'Reranking Model',
                name: 'rerankModel',
                description:
                    'Apply Pinecone reranking to improve result quality after initial retrieval. ' +
                    'Uses Pinecone Inference API — no extra credentials needed.',
                type: 'options',
                options: [
                    {
                        label: 'None',
                        name: 'none',
                        description: 'No reranking applied'
                    },
                    {
                        label: 'bge-reranker-v2-m3',
                        name: 'bge-reranker-v2-m3',
                        description: 'Multilingual BGE reranker model'
                    },
                    {
                        label: 'pinecone-rerank-v0',
                        name: 'pinecone-rerank-v0',
                        description: 'Pinecone native reranking model'
                    },
                    {
                        label: 'cohere-rerank-3.5',
                        name: 'cohere-rerank-3.5',
                        description: 'Cohere reranking model via Pinecone'
                    }
                ],
                default: 'none',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Rerank Top N',
                name: 'rerankTopN',
                description: 'Number of results to return after reranking. Should be ≤ Top K. Defaults to Top K value if not specified.',
                placeholder: '3',
                type: 'number',
                additionalParams: true,
                optional: true,
                hide: {
                    rerankModel: 'none'
                }
            }
        ]
        this.outputs = [
            {
                label: 'Pinecone Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Pinecone Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(PineconeStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const _index = nodeData.inputs?.pineconeIndex as string
            const pineconeNamespace = nodeData.inputs?.pineconeNamespace as string
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager
            const pineconeTextKey = nodeData.inputs?.pineconeTextKey as string
            const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean
            const searchType = (nodeData.inputs?.searchType as string) || 'dense'
            const sparseModel = (nodeData.inputs?.sparseModel as string) || 'pinecone-sparse-english-v0'

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const pineconeApiKey = getCredentialParam('pineconeApiKey', credentialData, nodeData)

            const client = new Pinecone({ apiKey: pineconeApiKey })
            const pineconeIndex = client.Index(_index)

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

            const textKey = pineconeTextKey || 'text'

            // ── Hybrid/Sparse upsert: store both dense + sparse vectors ──
            if ((searchType === 'hybrid' || searchType === 'sparse') && finalDocs.length > 0) {
                try {
                    const texts = finalDocs.map((doc) => doc.pageContent)

                    // Always generate dense embeddings — Pinecone indexes require a dense vector for every record,
                    // and storing them ensures users can switch search types without re-upserting
                    const denseVectors = await embeddings.embedDocuments(texts)

                    // Generate sparse embeddings via Pinecone Inference API
                    const sparseVectors = await generateSparseVectorsBatch(pineconeApiKey, sparseModel, texts)

                    // Build Pinecone records with both dense and sparse vectors
                    const ns = pineconeNamespace ? pineconeIndex.namespace(pineconeNamespace) : pineconeIndex

                    // Upsert in batches of 100
                    const batchSize = 100
                    for (let i = 0; i < finalDocs.length; i += batchSize) {
                        const batchDocs = finalDocs.slice(i, i + batchSize)
                        const records = batchDocs.map((doc, j) => {
                            const idx = i + j
                            // Sanitize metadata: Pinecone only allows string, number, boolean, or list of strings
                            const rawMeta: Record<string, any> = {
                                ...doc.metadata,
                                [textKey]: doc.pageContent
                            }
                            const metadata: Record<string, any> = {}
                            for (const [key, val] of Object.entries(rawMeta)) {
                                if (val === null || val === undefined) continue
                                if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                                    metadata[key] = val
                                } else if (Array.isArray(val) && val.every((v) => typeof v === 'string')) {
                                    metadata[key] = val
                                } else if (typeof val === 'object') {
                                    // Flatten nested objects to JSON string
                                    metadata[key] = JSON.stringify(val)
                                }
                            }

                            const record: Record<string, any> = {
                                id: doc.id || doc.metadata?.id || `${Date.now()}-${idx}`,
                                metadata,
                                values: denseVectors[idx]
                            }

                            // Add sparse vector
                            if (sparseVectors[idx]) {
                                record.sparseValues = sparseVectors[idx]
                            }

                            return record
                        })

                        await (ns as any).upsert(records)
                    }

                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                } catch (e) {
                    throw new Error(e)
                }
            }

            // ── Standard dense-only upsert (unchanged from v5.0) ─────────
            const obj: PineconeStoreParams = {
                pineconeIndex,
                textKey
            }

            if (pineconeNamespace) obj.namespace = pineconeNamespace

            try {
                if (recordManager) {
                    const vectorStore = (await PineconeStore.fromExistingIndex(embeddings, obj)) as unknown as VectorStore
                    await recordManager.createSchema()
                    const res = await index({
                        docsSource: finalDocs,
                        recordManager,
                        vectorStore,
                        options: {
                            cleanup: recordManager?.cleanup,
                            sourceIdKey: recordManager?.sourceIdKey ?? 'source',
                            vectorStoreName: pineconeNamespace
                        }
                    })

                    return res
                } else {
                    await PineconeStore.fromDocuments(finalDocs, embeddings, obj)
                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e)
            }
        },
        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const _index = nodeData.inputs?.pineconeIndex as string
            const pineconeNamespace = nodeData.inputs?.pineconeNamespace as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const pineconeTextKey = nodeData.inputs?.pineconeTextKey as string
            const recordManager = nodeData.inputs?.recordManager

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const pineconeApiKey = getCredentialParam('pineconeApiKey', credentialData, nodeData)

            const client = new Pinecone({ apiKey: pineconeApiKey })

            const pineconeIndex = client.Index(_index)

            const obj: PineconeStoreParams = {
                pineconeIndex,
                textKey: pineconeTextKey || 'text'
            }

            if (pineconeNamespace) obj.namespace = pineconeNamespace
            const pineconeStore = new PineconeStore(embeddings, obj)

            try {
                if (recordManager) {
                    const vectorStoreName = pineconeNamespace
                    await recordManager.createSchema()
                    ;(recordManager as any).namespace = (recordManager as any).namespace + '_' + vectorStoreName
                    const filterKeys: ICommonObject = {}
                    if (options.docId) {
                        filterKeys.docId = options.docId
                    }
                    const keys: string[] = await recordManager.listKeys(filterKeys)

                    await pineconeStore.delete({ ids: keys })
                    await recordManager.deleteKeys(keys)
                } else {
                    const pineconeStore = new PineconeStore(embeddings, obj)
                    await pineconeStore.delete({ ids })
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const indexName = nodeData.inputs?.pineconeIndex as string
        const pineconeNamespace = nodeData.inputs?.pineconeNamespace as string
        const pineconeMetadataFilter = nodeData.inputs?.pineconeMetadataFilter
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const pineconeTextKey = nodeData.inputs?.pineconeTextKey as string
        const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean

        // New feature inputs
        const searchType = (nodeData.inputs?.searchType as string) || 'dense'
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4
        const similarityThreshold = nodeData.inputs?.similarityThreshold as string
        const threshold = similarityThreshold ? parseFloat(similarityThreshold) : undefined
        const rerankModel = (nodeData.inputs?.rerankModel as string) || 'none'
        const rerankTopN = nodeData.inputs?.rerankTopN as string
        const alpha = nodeData.inputs?.alpha as string
        const sparseModel = (nodeData.inputs?.sparseModel as string) || 'pinecone-sparse-english-v0'
        const fetchK = nodeData.inputs?.fetchK as string
        const lambda = nodeData.inputs?.lambda as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const pineconeApiKey = getCredentialParam('pineconeApiKey', credentialData, nodeData)

        const client = new Pinecone({ apiKey: pineconeApiKey })
        const pineconeIndex = client.Index(indexName)
        const textKey = pineconeTextKey || 'text'

        // Build metadata filter
        const obj: PineconeStoreParams = {
            pineconeIndex,
            textKey
        }

        if (pineconeNamespace) obj.namespace = pineconeNamespace
        if (pineconeMetadataFilter) {
            const metadatafilter =
                typeof pineconeMetadataFilter === 'object' ? pineconeMetadataFilter : parseJsonBody(pineconeMetadataFilter)
            obj.filter = metadatafilter
        }
        if (isFileUploadEnabled && options.chatId) {
            obj.filter = obj.filter || {}
            obj.filter.$or = [
                ...(obj.filter.$or || []),
                { [FLOWISE_CHATID]: { $eq: options.chatId } },
                { [FLOWISE_CHATID]: { $exists: false } }
            ]
        }

        const output = nodeData.outputs?.output as string
        const metadataFilter = obj.filter

        // ────────────────────────────────────────────────────────────
        //  OUTPUT: Retriever
        // ────────────────────────────────────────────────────────────
        if (output === 'retriever') {
            let retriever

            if (searchType === 'sparse' || searchType === 'hybrid') {
                // ── Sparse / Hybrid: use custom PineconeHybridRetriever ──
                retriever = new PineconeHybridRetriever({
                    client,
                    apiKey: pineconeApiKey,
                    indexName,
                    embeddings,
                    k,
                    alpha: alpha != null && alpha !== '' ? parseFloat(alpha) : 0.5,
                    sparseModel,
                    searchType: searchType as 'sparse' | 'hybrid',
                    filter: metadataFilter,
                    namespace: pineconeNamespace,
                    textKey
                })
            } else {
                // ── Dense / MMR: use LangChain PineconeStore ────────────
                const vectorStore = (await PineconeStore.fromExistingIndex(embeddings, obj)) as unknown as VectorStore
                const filter = vectorStore?.lc_kwargs?.filter ? undefined : metadataFilter

                if (threshold !== undefined && threshold > 0) {
                    // ── Similarity Threshold Retriever ───────────────────
                    retriever = ScoreThresholdRetriever.fromVectorStore(vectorStore, {
                        minSimilarityScore: threshold,
                        maxK: k,
                        kIncrement: 2,
                        filter
                    })
                } else if (searchType === 'mmr') {
                    // ── MMR Search ──────────────────────────────────────
                    const f = fetchK ? parseInt(fetchK) : 20
                    const l = lambda != null && lambda !== '' ? parseFloat(lambda) : 0.5
                    retriever = vectorStore.asRetriever({
                        searchType: 'mmr',
                        k,
                        filter,
                        searchKwargs: {
                            fetchK: f,
                            lambda: l
                        }
                    })
                } else {
                    // ── Standard Dense (Similarity) Search ──────────────
                    retriever = vectorStore.asRetriever({
                        k,
                        filter
                    })
                }
            }

            // ── Apply Reranking (wraps any retriever type) ──────────
            if (rerankModel && rerankModel !== 'none') {
                const topN = rerankTopN ? parseInt(rerankTopN) : k
                const compressor = new PineconeRerankCompressor(client, rerankModel, topN)
                return new ContextualCompressionRetriever({
                    baseCompressor: compressor,
                    baseRetriever: retriever
                })
            }

            return retriever
        }

        // ────────────────────────────────────────────────────────────
        //  OUTPUT: Vector Store
        // ────────────────────────────────────────────────────────────
        if (output === 'vectorStore') {
            const vectorStore = (await PineconeStore.fromExistingIndex(embeddings, obj)) as unknown as VectorStore
            ;(vectorStore as any).k = k
            ;(vectorStore as any).filter = metadataFilter
            return vectorStore
        }
    }
}

module.exports = { nodeClass: Pinecone_VectorStores }
