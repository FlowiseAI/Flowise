import { Document } from '@langchain/core/documents'
import { BaiduQianfanRerank } from './BaiduQianfanRerank'

const originalFetch = global.fetch
const mockedFetch = jest.fn()

describe('BaiduQianfanRerank', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        global.fetch = mockedFetch as unknown as typeof fetch
    })

    afterAll(() => {
        global.fetch = originalFetch
    })

    it('calls Qianfan rerank API and preserves metadata from ranked indexes', async () => {
        mockedFetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                results: [
                    { index: 1, document: 'second', relevance_score: 0.92 },
                    { index: 0, document: 'first', relevance_score: 0.41 }
                ]
            })
        })

        const compressor = new BaiduQianfanRerank('api-key', 'bce-reranker-base', 2)
        const documents = [
            new Document({ pageContent: 'first', metadata: { source: 'a' } }),
            new Document({ pageContent: 'second', metadata: { source: 'b' } })
        ]

        const result = await compressor.compressDocuments(documents, 'weather in Shanghai')

        expect(mockedFetch).toHaveBeenCalledWith('https://qianfan.baidubce.com/v2/rerank', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer api-key',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'bce-reranker-base',
                query: 'weather in Shanghai',
                documents: ['first', 'second'],
                top_n: 2
            })
        })
        expect(result.map((doc) => doc.pageContent)).toEqual(['second', 'first'])
        expect(result[0].metadata).toEqual({ source: 'b', relevance_score: 0.92 })
        expect(result[1].metadata).toEqual({ source: 'a', relevance_score: 0.41 })
    })

    it('returns an empty array without calling Qianfan when no documents are provided', async () => {
        const compressor = new BaiduQianfanRerank('api-key', 'bce-reranker-base', 4)

        await expect(compressor.compressDocuments([], 'query')).resolves.toEqual([])
        expect(mockedFetch).not.toHaveBeenCalled()
    })

    it('falls back to the original documents when Qianfan returns an invalid index', async () => {
        mockedFetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                results: [{ index: 99, document: 'missing', relevance_score: 0.9 }]
            })
        })

        const compressor = new BaiduQianfanRerank('api-key', 'bce-reranker-base', 4)
        const documents = [new Document({ pageContent: 'first', metadata: { source: 'a' } })]

        await expect(compressor.compressDocuments(documents, 'query')).resolves.toBe(documents)
    })

    it('falls back to the original documents when Qianfan returns an API error', async () => {
        mockedFetch.mockResolvedValue({
            ok: false,
            status: 404,
            text: jest.fn().mockResolvedValue('model not found')
        })

        const compressor = new BaiduQianfanRerank('api-key', 'missing-model', 4)
        const documents = [new Document({ pageContent: 'first', metadata: { source: 'a' } })]

        await expect(compressor.compressDocuments(documents, 'query')).resolves.toBe(documents)
    })

    it('falls back to the original documents when the Qianfan call fails', async () => {
        mockedFetch.mockRejectedValue(new Error('network failed'))

        const compressor = new BaiduQianfanRerank('api-key', 'bce-reranker-base', 4)
        const documents = [new Document({ pageContent: 'first', metadata: { source: 'a' } })]

        await expect(compressor.compressDocuments(documents, 'query')).resolves.toBe(documents)
    })
})
