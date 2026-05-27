jest.mock('@baiducloud/qianfan', () => ({
    Reranker: jest.fn().mockImplementation(() => ({
        reranker: jest.fn()
    }))
}))

import { Document } from '@langchain/core/documents'
import { Reranker } from '@baiducloud/qianfan'
import { BaiduQianfanRerank } from './BaiduQianfanRerank'

const mockedReranker = Reranker as jest.Mock

describe('BaiduQianfanRerank', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('reranks documents using Qianfan response indexes and preserves metadata', async () => {
        const rerankerCall = jest.fn().mockResolvedValue({
            results: [
                { index: 1, document: 'second', relevance_score: 0.92 },
                { index: 0, document: 'first', relevance_score: 0.41 }
            ]
        })
        mockedReranker.mockImplementation(() => ({
            reranker: rerankerCall
        }))

        const compressor = new BaiduQianfanRerank('access-key', 'secret-key', 'bce-reranker-base_v1', 2)
        const documents = [
            new Document({ pageContent: 'first', metadata: { source: 'a' } }),
            new Document({ pageContent: 'second', metadata: { source: 'b' } })
        ]

        const result = await compressor.compressDocuments(documents, 'weather in Shanghai')

        expect(mockedReranker).toHaveBeenCalledWith({
            QIANFAN_ACCESS_KEY: 'access-key',
            QIANFAN_SECRET_KEY: 'secret-key'
        })
        expect(rerankerCall).toHaveBeenCalledWith(
            {
                query: 'weather in Shanghai',
                documents: ['first', 'second'],
                top_n: 2
            },
            'bce-reranker-base_v1'
        )
        expect(result.map((doc) => doc.pageContent)).toEqual(['second', 'first'])
        expect(result[0].metadata).toEqual({ source: 'b', relevance_score: 0.92 })
        expect(result[1].metadata).toEqual({ source: 'a', relevance_score: 0.41 })
    })

    it('returns an empty array without calling Qianfan when no documents are provided', async () => {
        const rerankerCall = jest.fn()
        mockedReranker.mockImplementation(() => ({
            reranker: rerankerCall
        }))

        const compressor = new BaiduQianfanRerank('access-key', 'secret-key', 'bce-reranker-base_v1', 4)

        await expect(compressor.compressDocuments([], 'query')).resolves.toEqual([])
        expect(rerankerCall).not.toHaveBeenCalled()
    })

    it('falls back to the original documents when Qianfan returns an invalid index', async () => {
        const rerankerCall = jest.fn().mockResolvedValue({
            results: [{ index: 99, document: 'missing', relevance_score: 0.9 }]
        })
        mockedReranker.mockImplementation(() => ({
            reranker: rerankerCall
        }))

        const compressor = new BaiduQianfanRerank('access-key', 'secret-key', 'bce-reranker-base_v1', 4)
        const documents = [new Document({ pageContent: 'first', metadata: { source: 'a' } })]

        await expect(compressor.compressDocuments(documents, 'query')).resolves.toBe(documents)
    })

    it('falls back to the original documents when the Qianfan call fails', async () => {
        const rerankerCall = jest.fn().mockRejectedValue(new Error('network failed'))
        mockedReranker.mockImplementation(() => ({
            reranker: rerankerCall
        }))

        const compressor = new BaiduQianfanRerank('access-key', 'secret-key', 'bce-reranker-base_v1', 4)
        const documents = [new Document({ pageContent: 'first', metadata: { source: 'a' } })]

        await expect(compressor.compressDocuments(documents, 'query')).resolves.toBe(documents)
    })
})
