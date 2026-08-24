import axios from 'axios'
import { Callbacks } from '@langchain/core/callbacks/manager'
import { Document } from '@langchain/core/documents'
import { BaseDocumentCompressor } from '@langchain/classic/retrievers/document_compressors'

const DEFAULT_COHERE_RERANK_URL = 'https://api.cohere.ai/v1/rerank'

/** Build the rerank endpoint from an optional custom base URL or full endpoint. */
export function resolveCohereRerankUrl(baseUrl?: string): string {
    const trimmed = (baseUrl || '').trim().replace(/\/+$/, '')
    if (!trimmed) return DEFAULT_COHERE_RERANK_URL
    // Allow pasting the full rerank endpoint (v1 or v2)
    if (/\/rerank\/?$/i.test(trimmed)) return trimmed
    // Base host or .../v1 or .../v2 → append /rerank under the API version path
    if (/\/v[12]$/i.test(trimmed)) return `${trimmed}/rerank`
    return `${trimmed}/v1/rerank`
}

export class CohereRerank extends BaseDocumentCompressor {
    private cohereAPIKey: any
    private readonly apiUrl: string
    private readonly model: string
    private readonly k: number
    private readonly maxChunksPerDoc: number
    constructor(cohereAPIKey: string, model: string, k: number, maxChunksPerDoc: number, baseUrl?: string) {
        super()
        this.cohereAPIKey = cohereAPIKey
        this.model = model
        this.k = k
        this.maxChunksPerDoc = maxChunksPerDoc
        this.apiUrl = resolveCohereRerankUrl(baseUrl)
    }
    async compressDocuments(
        documents: Document<Record<string, any>>[],
        query: string,
        _?: Callbacks | undefined
    ): Promise<Document<Record<string, any>>[]> {
        // avoid empty api call
        if (documents.length === 0) {
            return []
        }
        const config = {
            headers: {
                Authorization: `Bearer ${this.cohereAPIKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        }
        const data = {
            model: this.model,
            topN: this.k,
            max_chunks_per_doc: this.maxChunksPerDoc,
            query: query,
            return_documents: false,
            documents: documents.map((doc) => doc.pageContent)
        }
        try {
            let returnedDocs = await axios.post(this.apiUrl, data, config)
            const finalResults: Document<Record<string, any>>[] = []
            returnedDocs.data.results.forEach((result: any) => {
                const doc = documents[result.index]
                doc.metadata.relevance_score = result.relevance_score
                finalResults.push(doc)
            })
            return finalResults.splice(0, this.k)
        } catch (error) {
            return documents
        }
    }
}
