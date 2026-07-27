import { Document } from '@langchain/core/documents'
import axios from 'axios'
import { GreenPTRerank } from './GreenPTRerank'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('GreenPTRerank', () => {
    it('returns documents in API relevance order without mutating the input', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                results: [
                    { index: 1, relevance_score: 0.9 },
                    { index: 0, relevance_score: 0.2 }
                ]
            }
        })
        const documents = [new Document({ pageContent: 'solar', metadata: { source: 1 } }), new Document({ pageContent: 'wind' })]

        const result = await new GreenPTRerank('secret', 'green-rerank', 2).compressDocuments(documents, 'renewable energy')

        expect(result.map((document) => document.pageContent)).toEqual(['wind', 'solar'])
        expect(result.map((document) => document.metadata.relevance_score)).toEqual([0.9, 0.2])
        expect(documents[0].metadata).toEqual({ source: 1 })
        expect(mockedAxios.post).toHaveBeenCalledWith(
            'https://api.greenpt.ai/v1/rerank',
            {
                model: 'green-rerank',
                query: 'renewable energy',
                documents: ['solar', 'wind'],
                top_n: 2,
                return_documents: false
            },
            expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer secret' }) })
        )
    })

    it('rejects invalid result indexes', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: { results: [{ index: 4, relevance_score: 0.9 }] } })
        const reranker = new GreenPTRerank('secret', 'green-rerank', 1)
        await expect(reranker.compressDocuments([new Document({ pageContent: 'solar' })], 'query')).rejects.toThrow('invalid result')
    })
})
