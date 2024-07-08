import { BaseRetriever, type BaseRetrieverInput } from '@langchain/core/retrievers'
import type { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager'
import { Document } from '@langchain/core/documents'
import { Meilisearch } from 'meilisearch'
import { search } from '@notionhq/client/build/src/api-endpoints'
import { parse } from 'dotenv'

export interface CustomRetrieverInput extends BaseRetrieverInput {}

export class MeilisearchRetriever extends BaseRetriever {
    lc_namespace = ['langchain', 'retrievers']
    private readonly meilisearchApiKey: any
    private readonly host: any
    private indexUid: string
    private K: string
    private semanticRatio: string
    constructor(host: string, meilisearchApiKey: any, indexUid: string, K: string, semanticRatio: string, fields?: CustomRetrieverInput) {
        super(fields)
        this.meilisearchApiKey = meilisearchApiKey
        this.host = host
        this.indexUid = indexUid

        if (semanticRatio == '') {
            this.semanticRatio = '0.5'
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

    async _getRelevantDocuments(query: string, runManager?: CallbackManagerForRetrieverRun): Promise<Document[]> {
        // Pass `runManager?.getChild()` when invoking internal runnables to enable tracing
        // const additionalDocs = await someOtherRunnable.invoke(params, runManager?.getChild())
        const client = new Meilisearch({
            host: this.host,
            apiKey: this.meilisearchApiKey
        })

        const index = client.index(this.indexUid)
        // Perform the search
        const searchResults = await index.search(query, {
            limit: parseInt(this.K), // Optional: Limit the number of results
            attributesToRetrieve: ['*'], // Optional: Specify which fields to retrieve
            hybrid: {
                semanticRatio: parseFloat(this.semanticRatio),
                embedder: 'default'
            }
        })

        const hits = searchResults.hits
        const documents = hits.map(
            (hit) =>
                new Document({
                    pageContent: hit.content,
                    metadata: {
                        url: hit.url,
                        hierarchy: {
                            lvl0: hit.hierarchy_lvl0,
                            lvl1: hit.hierarchy_lvl1,
                            lvl2: hit.hierarchy_lvl2,
                            lvl3: hit.hierarchy_lvl3,
                            lvl4: hit.hierarchy_lvl4,
                            lvl5: hit.hierarchy_lvl5,
                            lvl6: hit.hierarchy_lvl6
                        },
                        type: hit.type,
                        tags: hit.tags,
                        objectID: hit.objectID,
                        page_rank: hit.page_rank,
                        level: hit.level,
                        position: hit.position
                    }
                })
        )

        return documents
    }
    //TODO
    async addNewDocumentsToIndex(): Promise<any> {
        const client = new Meilisearch({
            host: this.host,
            apiKey: this.meilisearchApiKey
        })
        let index

        try {
            // Check if the index exists
            index = await client.getIndex(this.indexUid)
        } catch (error) {
            if (error.code === 'index_not_found') {
                // If the index does not exist, create it
                index = await client.createIndex(this.indexUid)
            } else {
                // Handle other possible errors
                console.error('An error occurred:', error)
                return
            }
        }
        const documents = [
            { id: 1, title: 'Carol', genres: ['Romance', 'Drama'] },
            { id: 2, title: 'Wonder Woman', genres: ['Action', 'Adventure'] },
            { id: 3, title: 'Life of Pi', genres: ['Adventure', 'Drama'] },
            { id: 4, title: 'Mad Max: Fury Road', genres: ['Adventure', 'Science Fiction'] },
            { id: 5, title: 'Moana', genres: ['Fantasy', 'Action'] },
            { id: 6, title: 'Philadelphia', genres: ['Drama'] }
        ]

        // let response = await index.addDocuments(documents)
    }
}
