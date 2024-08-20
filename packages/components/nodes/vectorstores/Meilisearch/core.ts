import { BaseRetriever, type BaseRetrieverInput } from '@langchain/core/retrievers'
import { Document } from '@langchain/core/documents'
import { Meilisearch } from 'meilisearch'
import { Embeddings } from '@langchain/core/embeddings'

export interface CustomRetrieverInput extends BaseRetrieverInput {}

export class MeilisearchRetriever extends BaseRetriever {
    lc_namespace = ['langchain', 'retrievers']
    private readonly meilisearchSearchApiKey: any
    private readonly host: any
    private indexUid: string
    private K: string
    private semanticRatio: string
    private embeddings: Embeddings
    private searchFilter: string
    constructor(
        host: string,
        meilisearchSearchApiKey: any,
        indexUid: string,
        K: string,
        semanticRatio: string,
        embeddings: Embeddings,
        searchFilter: string,
        fields?: CustomRetrieverInput
    ) {
        super(fields)
        this.meilisearchSearchApiKey = meilisearchSearchApiKey
        this.host = host
        this.indexUid = indexUid
        this.embeddings = embeddings
        this.searchFilter = searchFilter

        if (semanticRatio == '') {
            this.semanticRatio = '0.75'
        } else {
            let semanticRatio_Float = parseFloat(semanticRatio)
            if (semanticRatio_Float > 1.0) {
                this.semanticRatio = '1.0'
            } else if (semanticRatio_Float < 0.0) {
                this.semanticRatio = '0.0'
            } else {
                this.semanticRatio = semanticRatio
            }
        }

        if (K == '') {
            K = '4'
        }
        this.K = K
    }

    async _getRelevantDocuments(query: string): Promise<Document[]> {
        // Pass `runManager?.getChild()` when invoking internal runnables to enable tracing
        // const additionalDocs = await someOtherRunnable.invoke(params, runManager?.getChild())
        const client = new Meilisearch({
            host: this.host,
            apiKey: this.meilisearchSearchApiKey
        })

        const index = await client.index(this.indexUid)
        const questionEmbedding = await this.embeddings.embedQuery(query)
        // Perform the search
        const searchResults = await index.search(query, {
            filter: this.searchFilter,
            vector: questionEmbedding,
            limit: parseInt(this.K), // Optional: Limit the number of results
            attributesToRetrieve: ['*'], // Optional: Specify which fields to retrieve
            hybrid: {
                semanticRatio: parseFloat(this.semanticRatio),
                embedder: 'ollama'
            }
        })
        const hits = searchResults.hits
        let documents: Document[] = [
            new Document({
                pageContent: 'mock page',
                metadata: {}
            })
        ]
        try {
            documents = hits.map(
                (hit: any) =>
                    new Document({
                        pageContent: hit.pageContent,
                        metadata: {
                            objectID: hit.objectID,
                            ...hit.metadata
                        }
                    })
            )
        } catch (e) {
            console.error('Error occurred while adding documents:', e)
        }
        return documents
    }
}
