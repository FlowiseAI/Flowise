import { Callbacks } from '@langchain/core/callbacks/manager'
import { Document } from '@langchain/core/documents'
import { BaseDocumentCompressor } from '@langchain/classic/retrievers/document_compressors'
import axios from 'axios'
import { GREENPT_API_BASE_URL } from '../../../src/greenpt'

interface GreenPTRerankResult {
    index?: unknown
    relevance_score?: unknown
}

export class GreenPTRerank extends BaseDocumentCompressor {
    constructor(private readonly apiKey: string, private readonly model: string, private readonly topN: number) {
        super()
    }

    async compressDocuments(
        documents: Document<Record<string, any>>[],
        query: string,
        _?: Callbacks
    ): Promise<Document<Record<string, any>>[]> {
        if (!documents.length) return []
        const response = await axios.post(
            `${GREENPT_API_BASE_URL}/rerank`,
            {
                model: this.model,
                query,
                documents: documents.map((document) => document.pageContent),
                top_n: this.topN,
                return_documents: false
            },
            {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30_000
            }
        )
        if (!Array.isArray(response.data?.results)) throw new Error('GreenPT rerank response contains no valid results')

        return response.data.results.map((result: GreenPTRerankResult) => {
            if (
                !Number.isInteger(result?.index) ||
                (result.index as number) < 0 ||
                (result.index as number) >= documents.length ||
                typeof result.relevance_score !== 'number'
            ) {
                throw new Error('GreenPT rerank response contains an invalid result')
            }
            const document = documents[result.index as number]
            return new Document({
                pageContent: document.pageContent,
                metadata: { ...document.metadata, relevance_score: result.relevance_score }
            })
        })
    }
}
