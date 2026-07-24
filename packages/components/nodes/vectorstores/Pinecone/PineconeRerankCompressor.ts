import { Pinecone } from '@pinecone-database/pinecone'
import { Callbacks } from '@langchain/core/callbacks/manager'
import { Document } from '@langchain/core/documents'
import { BaseDocumentCompressor } from '@langchain/classic/retrievers/document_compressors'

/**
 * A BaseDocumentCompressor that re-scores documents using Pinecone's
 * inference.rerank() API. This is used as the compressor inside a
 * ContextualCompressionRetriever to apply reranking after initial retrieval.
 *
 * Uses the user's existing Pinecone API key — no extra credentials needed.
 */
export class PineconeRerankCompressor extends BaseDocumentCompressor {
    private client: Pinecone
    private model: string
    private topN: number

    constructor(client: Pinecone, model: string, topN: number) {
        super()
        this.client = client
        this.model = model
        this.topN = topN
    }

    async compressDocuments(
        documents: Document<Record<string, any>>[],
        query: string,
        _?: Callbacks | undefined
    ): Promise<Document<Record<string, any>>[]> {
        // Avoid empty API calls
        if (documents.length === 0) {
            return []
        }

        try {
            const result = await this.client.inference.rerank(
                this.model,
                query,
                documents.map((doc) => doc.pageContent),
                { topN: this.topN, returnDocuments: false }
            )

            const rerankData = (result as any)?.data ?? result
            const finalResults: Document<Record<string, any>>[] = []

            for (const item of rerankData) {
                const idx = (item as any).index
                const score = (item as any).score
                if (idx !== undefined && idx < documents.length) {
                    const doc = documents[idx]
                    finalResults.push(
                        new Document({
                            pageContent: doc.pageContent,
                            metadata: {
                                ...doc.metadata,
                                relevance_score: score
                            }
                        })
                    )
                }
            }

            return finalResults.slice(0, this.topN)
        } catch (error) {
            // On reranking failure, return original documents (graceful degradation)
            console.warn('Pinecone reranking failed, returning original documents:', error)
            return documents
        }
    }
}
