import type { Pinecone } from '@pinecone-database/pinecone'
import axios from 'axios'
import { BaseRetriever } from '@langchain/core/retrievers'
import { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager'
import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'

export interface PineconeHybridRetrieverConfig {
    client: Pinecone
    apiKey: string
    indexName: string
    embeddings: Embeddings
    k: number
    alpha: number
    sparseModel: string
    searchType: 'dense' | 'sparse' | 'hybrid'
    filter?: Record<string, any>
    namespace?: string
    textKey: string
}

/**
 * A custom LangChain BaseRetriever that performs hybrid (dense + sparse),
 * pure sparse, or pure dense search using the raw Pinecone SDK.
 *
 * - Dense vectors come from the connected Embeddings node.
 * - Sparse vectors are generated via Pinecone's inference.embed() API
 *   using the configured sparse model (e.g. pinecone-sparse-english-v0).
 * - Alpha (0.0–1.0) controls the weighting: 1.0 = pure dense, 0.0 = pure sparse.
 */
export class PineconeHybridRetriever extends BaseRetriever {
    lc_namespace = ['flowise', 'retrievers', 'pinecone-hybrid']

    private client: Pinecone
    private apiKey: string
    private indexName: string
    private embeddings: Embeddings
    private k: number
    private alpha: number
    private sparseModel: string
    private searchType: 'dense' | 'sparse' | 'hybrid'
    private filter?: Record<string, any>
    private namespace?: string
    private textKey: string

    constructor(config: PineconeHybridRetrieverConfig) {
        super()
        this.client = config.client
        this.apiKey = config.apiKey
        this.indexName = config.indexName
        this.embeddings = config.embeddings
        this.k = config.k
        this.alpha = config.alpha
        this.sparseModel = config.sparseModel
        this.searchType = config.searchType
        this.filter = config.filter
        this.namespace = config.namespace
        this.textKey = config.textKey
    }

    async _getRelevantDocuments(query: string, _runManager?: CallbackManagerForRetrieverRun): Promise<Document[]> {
        const pineconeIndex = this.client.Index(this.indexName)
        const index = this.namespace ? pineconeIndex.namespace(this.namespace) : pineconeIndex

        let queryResponse

        if (this.searchType === 'dense') {
            // Pure dense search — only use the embeddings model
            const vector = await this.embeddings.embedQuery(query)
            queryResponse = await index.query({
                topK: this.k,
                includeMetadata: true,
                vector,
                ...(this.filter ? { filter: this.filter } : {})
            })
        } else if (this.searchType === 'sparse') {
            // Pure sparse search — combine dense + sparse with alpha = 0 to avoid dimension mismatch
            const [denseVector, rawSparseVector] = await Promise.all([this.embeddings.embedQuery(query), this.generateSparseVector(query)])
            const vector = denseVector.map(() => 0)
            const sparseVector = {
                indices: rawSparseVector.indices,
                values: rawSparseVector.values
            }
            queryResponse = await index.query({
                topK: this.k,
                includeMetadata: true,
                vector,
                sparseVector,
                ...(this.filter ? { filter: this.filter } : {})
            })
        } else {
            // Hybrid search — combine dense + sparse with alpha weighting
            const [denseVector, rawSparseVector] = await Promise.all([this.embeddings.embedQuery(query), this.generateSparseVector(query)])

            // Apply alpha weighting: alpha=1.0 → pure dense, alpha=0.0 → pure sparse
            const vector = denseVector.map((v: number) => v * this.alpha)
            const sparseVector = {
                indices: rawSparseVector.indices,
                values: rawSparseVector.values.map((v: number) => v * (1 - this.alpha))
            }

            queryResponse = await index.query({
                topK: this.k,
                includeMetadata: true,
                vector,
                sparseVector,
                ...(this.filter ? { filter: this.filter } : {})
            })
        }

        // Convert Pinecone matches to LangChain Documents
        const documents: Document[] = []
        for (const match of queryResponse.matches || []) {
            const metadata: Record<string, any> = { ...(match.metadata || {}) }
            const pageContent = (metadata[this.textKey] as string) || ''
            delete metadata[this.textKey]
            metadata.score = match.score
            documents.push(new Document({ pageContent, metadata }))
        }

        return documents
    }

    /**
     * Generate a sparse vector for the given text using Pinecone's inference API.
     */
    /**
     * Generate a sparse vector for the given text using Pinecone's REST API directly.
     * SDK v4 doesn't support sparse embeddings, so we call the REST endpoint.
     */
    private async generateSparseVector(text: string): Promise<{ indices: number[]; values: number[] }> {
        const result = await callPineconeEmbedApi(this.apiKey, this.sparseModel, [text], 'query')
        return result[0]
    }
}

/**
 * Call the Pinecone Inference embed REST API directly.
 * SDK v4.0.0 doesn't expose sparse embedding values, so we bypass it.
 */
async function callPineconeEmbedApi(
    apiKey: string,
    model: string,
    inputs: string[],
    inputType: 'passage' | 'query'
): Promise<Array<{ indices: number[]; values: number[] }>> {
    if (!apiKey) {
        throw new Error('Pinecone API key is required for sparse embedding call.')
    }

    const body = {
        model,
        inputs: inputs.map((text) => ({ text })),
        parameters: { input_type: inputType, return_type: 'sparse' }
    }

    let response
    try {
        response = await axios.post('https://api.pinecone.io/embed', body, {
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': apiKey,
                'X-Pinecone-API-Version': '2025-01'
            }
        })
    } catch (error: any) {
        const errorText = error.response?.data ? JSON.stringify(error.response.data) : error.message
        throw new Error(
            'Pinecone embed API returned error: ' +
                errorText +
                '. ' +
                "Model: '" +
                model +
                "'. Ensure the model supports sparse encoding and is available on your Pinecone plan."
        )
    }
    const json = response.data
    const data = json.data ?? json

    const results: Array<{ indices: number[]; values: number[] }> = []
    for (let i = 0; i < inputs.length; i++) {
        const embedding = data?.[i]
        // Pinecone REST API returns sparse_indices and sparse_values as separate flat arrays
        const indices = embedding?.sparse_indices
        const values = embedding?.sparse_values

        if (!indices || !values || !Array.isArray(indices) || !Array.isArray(values)) {
            throw new Error(
                `Sparse embedding model '${model}' did not return sparse values for input at index ${i}. ` +
                    `Response: ${JSON.stringify(embedding)?.substring(0, 300)}`
            )
        }

        results.push({ indices, values })
    }

    return results
}

/**
 * Generate sparse vectors for a batch of texts using Pinecone's REST API.
 * Used during upsert to store sparse vectors alongside dense vectors.
 */
export async function generateSparseVectorsBatch(
    apiKey: string,
    sparseModel: string,
    texts: string[]
): Promise<Array<{ indices: number[]; values: number[] }>> {
    // Process in batches of 96 (Pinecone inference API limit)
    const batchSize = 96
    const allSparseVectors: Array<{ indices: number[]; values: number[] }> = []

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        const batchResults = await callPineconeEmbedApi(apiKey, sparseModel, batch, 'passage')
        allSparseVectors.push(...batchResults)
    }

    return allSparseVectors
}
