import { Callbacks } from '@langchain/core/callbacks/manager'
import { Document } from '@langchain/core/documents'
import { BaseDocumentCompressor } from '@langchain/classic/retrievers/document_compressors'
import { Reranker } from '@baiducloud/qianfan'

type QianfanRerankResult = {
    index: number
    document: string
    relevance_score: number
}

type QianfanRerankResponse = {
    results?: QianfanRerankResult[]
}

type QianfanRerankerClient = {
    reranker: (body: { query: string; documents: string[]; top_n?: number }, model?: string) => Promise<QianfanRerankResponse>
}

export class BaiduQianfanRerank extends BaseDocumentCompressor {
    private readonly client: QianfanRerankerClient
    private readonly model: string
    private readonly topN: number

    constructor(qianfanAccessKey: string, qianfanSecretKey: string, model: string, topN: number) {
        super()
        this.client = new Reranker({
            QIANFAN_ACCESS_KEY: qianfanAccessKey,
            QIANFAN_SECRET_KEY: qianfanSecretKey
        }) as QianfanRerankerClient
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
            const response = await this.client.reranker(
                {
                    query,
                    documents: documents.map((doc) => doc.pageContent),
                    top_n: this.topN
                },
                this.model
            )

            if (!Array.isArray(response.results)) return documents

            const rerankedDocuments: Document<Record<string, any>>[] = []
            for (const result of response.results) {
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
