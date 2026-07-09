import { EmbeddingsInterface } from '@langchain/core/embeddings'
import { applyMatryoshkaTruncation } from './matryoshkaEmbeddings'

const makeEmbeddings = (): EmbeddingsInterface<number[]> => ({
    embedDocuments: jest.fn(async () => [
        [1, 2, 3, 4],
        [5, 6, 7, 8]
    ]),
    embedQuery: jest.fn(async () => [9, 10, 11, 12])
})

describe('applyMatryoshkaTruncation', () => {
    it('returns the original embeddings when no truncate dimension is configured', async () => {
        const embeddings = makeEmbeddings()
        const result = applyMatryoshkaTruncation(embeddings, undefined)

        expect(result).toBe(embeddings)
        await expect(result.embedQuery('hello')).resolves.toEqual([9, 10, 11, 12])
    })

    it('truncates document and query embeddings to the configured dimension', async () => {
        const embeddings = makeEmbeddings()
        const result = applyMatryoshkaTruncation(embeddings, '2')

        await expect(result.embedDocuments(['a', 'b'])).resolves.toEqual([
            [1, 2],
            [5, 6]
        ])
        await expect(result.embedQuery('hello')).resolves.toEqual([9, 10])
    })

    it('rejects invalid truncate dimensions', () => {
        expect(() => applyMatryoshkaTruncation(makeEmbeddings(), '0')).toThrow('Matryoshka truncate dimension must be a positive integer')
        expect(() => applyMatryoshkaTruncation(makeEmbeddings(), '2.5')).toThrow('Matryoshka truncate dimension must be a positive integer')
        expect(() => applyMatryoshkaTruncation(makeEmbeddings(), 'abc')).toThrow('Matryoshka truncate dimension must be a positive integer')
    })
})
