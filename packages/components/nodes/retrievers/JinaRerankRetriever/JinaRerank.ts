import { Callbacks } from '@langchain/core/callbacks/manager'
import { Document } from '@langchain/core/documents'
import axios from 'axios'
import { BaseDocumentCompressor } from 'langchain/retrievers/document_compressors'

export class JinaRerank extends BaseDocumentCompressor {
    private jinaAPIKey: string
    private readonly JINA_RERANK_API_URL = 'https://api.jina.ai/v1/rerank'
    private model: string = 'jina-reranker-v2-base-multilingual'
    private readonly topN: number

    constructor(jinaAPIKey: string, model: string, topN: number) {
        super()
        this.jinaAPIKey = jinaAPIKey
        this.model = model
        this.topN = topN
    }
    async compressDocuments(
        documents: Document<Record<string, any>>[],
        query: string,
        _?: Callbacks | undefined
    ): Promise<Document<Record<string, any>>[]> {
        if (documents.length === 0) {
            return []
        }
        const config = {
            headers: {
                Authorization: `Bearer ${this.jinaAPIKey}`,
                'Content-Type': 'application/json'
            }
        }
        const data = {
            model: this.model,
            query: query,
            documents: documents.map((doc) => doc.pageContent),
            top_n: this.topN
        }
        try {
            let returnedDocs = await axios.post(this.JINA_RERANK_API_URL, data, config)
            const finalResults: Document<Record<string, any>>[] = []
            returnedDocs.data.results.forEach((result: any) => {
                const doc = documents[result.index]
                doc.metadata.relevance_score = result.relevance_score
                finalResults.push(doc)
            })
            return finalResults
        } catch (error) {
            return documents
        }
    }
}
