import axios from 'axios'
import { Callbacks } from '@langchain/core/callbacks/manager'
import { Document } from '@langchain/core/documents'
import { BaseDocumentCompressor } from 'langchain/retrievers/document_compressors'

export class AzureRerank extends BaseDocumentCompressor {
    private readonly azureApiKey: string
    private readonly azureApiUrl: string
    private readonly model: string
    private readonly k: number
    private readonly maxChunksPerDoc: number
    constructor(azureApiKey: string, azureApiUrl: string, model: string, k: number, maxChunksPerDoc: number) {
        super()
        this.azureApiKey = azureApiKey
        this.azureApiUrl = azureApiUrl
        this.model = model
        this.k = k
        this.maxChunksPerDoc = maxChunksPerDoc
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
                'api-key': `${this.azureApiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        }
        const data = {
            model: this.model,
            top_n: this.k,
            max_chunks_per_doc: this.maxChunksPerDoc,
            query: query,
            return_documents: false,
            documents: documents.map((doc) => doc.pageContent)
        }
        try {
            let returnedDocs = await axios.post(this.azureApiUrl, data, config)
            const finalResults: Document<Record<string, any>>[] = []
            returnedDocs.data.results.forEach((result: any) => {
                const doc = documents[result.index]
                doc.metadata.relevance_score = result.relevance_score
                finalResults.push(doc)
            })
            return finalResults.splice(0, this.k)
        } catch (error) {
            throw new Error(`Azure Rerank API call failed: ${error.message}`)
        }
    }
}
