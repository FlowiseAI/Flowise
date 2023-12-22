import { Callbacks } from 'langchain/callbacks'
import { Document } from 'langchain/document'
import { BaseDocumentCompressor } from 'langchain/retrievers/document_compressors'
import axios from 'axios'
export class CohereRerank extends BaseDocumentCompressor {
    private cohereAPIKey: any
    private COHERE_API_URL = 'https://api.cohere.ai/v1/rerank'
    private model: string

    constructor(cohereAPIKey: string, model: string) {
        super()
        this.cohereAPIKey = cohereAPIKey
        this.model = model
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
            max_chunks_per_doc: 10,
            query: query,
            return_documents: false,
            documents: documents.map((doc) => doc.pageContent)
        }
        try {
            let returnedDocs = await axios.post(this.COHERE_API_URL, data, config)
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
