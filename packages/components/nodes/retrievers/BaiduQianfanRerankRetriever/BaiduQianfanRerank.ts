import { Callbacks } from '@langchain/core/callbacks/manager'
import { Document } from '@langchain/core/documents'
import { BaseDocumentCompressor } from '@langchain/classic/retrievers/document_compressors'

const QIANFAN_RERANK_API_URL = 'https://qianfan.baidubce.com/v2/rerank'

type QianfanRerankResult = {
    index: number
    document: string
    relevance_score: number
}

type QianfanRerankResponse = {
    results?: QianfanRerankResult[]
}

export class BaiduQianfanRerank extends BaseDocumentCompressor {
    private readonly qianfanApiKey: string
    private readonly model: string
    private readonly topN: number

    constructor(qianfanApiKey: string, model: string, topN: number) {
        super()
        this.qianfanApiKey = qianfanApiKey
        this.model = model
        this.topN = topN
    }

    async compressDocuments(
        documents: Document<Record<string, any>>[],
        query: string,
        _?: Callbacks | undefined
    ): Promise<Document<Record<string, any>>[]> {
        if (documents.length === 0) return []

        try {
            const response = await fetch(QIANFAN_RERANK_API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.qianfanApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    query,
                    documents: documents.map((doc) => doc.pageContent),
                    top_n: this.topN
                })
            })

            if (!response.ok) throw new Error(`Baidu Qianfan Rerank API call failed with status ${response.status}`)

            const rerankResponse = (await response.json()) as QianfanRerankResponse

            if (!Array.isArray(rerankResponse.results)) return documents

            const rerankedDocuments: Document<Record<string, any>>[] = []
            for (const result of rerankResponse.results) {
                const doc = documents[result.index]
                if (!doc) return documents
                rerankedDocuments.push(
                    new Document({
                        pageContent: doc.pageContent,
                        metadata: {
                            ...doc.metadata,
                            relevance_score: result.relevance_score
                        }
                    })
                )
            }

            return rerankedDocuments
        } catch (error) {
            return documents
        }
    }
}
