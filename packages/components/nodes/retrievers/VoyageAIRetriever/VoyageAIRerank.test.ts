import axios from 'axios'
import { Document } from '@langchain/core/documents'
import { VoyageAIRerank } from './VoyageAIRerank'

jest.mock('axios')

describe('VoyageAIRerank', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('maps Voyage API data responses back to the reranked documents', async () => {
        const reranker = new VoyageAIRerank('test-key', 'rerank-2', 2)
        const documents = [
            new Document({ pageContent: 'alpha', metadata: { source: 'a' } }),
            new Document({ pageContent: 'bravo', metadata: { source: 'b' } }),
            new Document({ pageContent: 'charlie', metadata: { source: 'c' } })
        ]

        ;(axios.post as jest.Mock).mockResolvedValue({
            data: {
                data: [
                    { index: 2, relevance_score: 0.97 },
                    { index: 0, relevance_score: 0.86 }
                ]
            }
        })

        const result = await reranker.compressDocuments(documents, 'letters')

        expect(axios.post).toHaveBeenCalledWith(
            'https://api.voyageai.com/v1/rerank',
            {
                model: 'rerank-2',
                query: 'letters',
                documents: ['alpha', 'bravo', 'charlie'],
                top_k: 2
            },
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-key'
                })
            })
        )
        expect(result.map((doc) => doc.pageContent)).toEqual(['charlie', 'alpha'])
        expect(result.map((doc) => doc.metadata.relevance_score)).toEqual([0.97, 0.86])
    })

    it('continues to support legacy Voyage API results responses', async () => {
        const reranker = new VoyageAIRerank('test-key', 'rerank-lite-1', 1)
        const documents = [new Document({ pageContent: 'alpha', metadata: {} }), new Document({ pageContent: 'bravo', metadata: {} })]

        ;(axios.post as jest.Mock).mockResolvedValue({
            data: {
                results: [{ index: 1, relevance_score: 0.91 }]
            }
        })

        const result = await reranker.compressDocuments(documents, 'letters')

        expect(result.map((doc) => doc.pageContent)).toEqual(['bravo'])
        expect(result[0].metadata.relevance_score).toBe(0.91)
    })

    it('falls back to original documents when Voyage API returns an invalid result shape', async () => {
        const reranker = new VoyageAIRerank('test-key', 'rerank-lite-1', 2)
        const documents = [new Document({ pageContent: 'alpha', metadata: {} }), new Document({ pageContent: 'bravo', metadata: {} })]

        ;(axios.post as jest.Mock).mockResolvedValue({
            data: {}
        })

        await expect(reranker.compressDocuments(documents, 'letters')).resolves.toBe(documents)
    })

    it('skips rerank results that point outside the provided documents', async () => {
        const reranker = new VoyageAIRerank('test-key', 'rerank-lite-1', 2)
        const documents = [new Document({ pageContent: 'alpha', metadata: {} }), new Document({ pageContent: 'bravo', metadata: {} })]

        ;(axios.post as jest.Mock).mockResolvedValue({
            data: {
                data: [
                    { index: 3, relevance_score: 0.99 },
                    { index: 1, relevance_score: 0.88 }
                ]
            }
        })

        const result = await reranker.compressDocuments(documents, 'letters')

        expect(result.map((doc) => doc.pageContent)).toEqual(['bravo'])
        expect(result[0].metadata.relevance_score).toBe(0.88)
    })
})
