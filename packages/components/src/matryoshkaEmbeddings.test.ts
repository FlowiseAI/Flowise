import { MatryoshkaEmbeddings } from './matryoshkaEmbeddings'

describe('MatryoshkaEmbeddings', () => {
    let mockEmbeddings: { embedDocuments: jest.Mock; embedQuery: jest.Mock }

    beforeEach(() => {
        jest.clearAllMocks()
        mockEmbeddings = {
            embedDocuments: jest.fn(),
            embedQuery: jest.fn()
        }
    })

    describe('embedQuery', () => {
        it('should truncate a single embedding vector to the specified dimensions', async () => {
            const fullVector = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
            mockEmbeddings.embedQuery.mockResolvedValue(fullVector)

            const matryoshka = new MatryoshkaEmbeddings({
                embeddings: mockEmbeddings as any,
                dimensions: 3
            })

            const result = await matryoshka.embedQuery('test text')

            expect(mockEmbeddings.embedQuery).toHaveBeenCalledWith('test text')
            expect(result).toEqual([0.1, 0.2, 0.3])
            expect(result).toHaveLength(3)
        })

        it('should return the full vector when dimensions equals vector length', async () => {
            const fullVector = [0.1, 0.2, 0.3]
            mockEmbeddings.embedQuery.mockResolvedValue(fullVector)

            const matryoshka = new MatryoshkaEmbeddings({
                embeddings: mockEmbeddings as any,
                dimensions: 3
            })

            const result = await matryoshka.embedQuery('test')

            expect(result).toEqual([0.1, 0.2, 0.3])
        })

        it('should return the full vector when dimensions exceeds vector length', async () => {
            const fullVector = [0.1, 0.2, 0.3]
            mockEmbeddings.embedQuery.mockResolvedValue(fullVector)

            const matryoshka = new MatryoshkaEmbeddings({
                embeddings: mockEmbeddings as any,
                dimensions: 10
            })

            const result = await matryoshka.embedQuery('test')

            expect(result).toEqual([0.1, 0.2, 0.3])
            expect(result).toHaveLength(3)
        })
    })

    describe('embedDocuments', () => {
        it('should truncate multiple embedding vectors to the specified dimensions', async () => {
            const fullVectors = [
                [0.1, 0.2, 0.3, 0.4, 0.5],
                [0.6, 0.7, 0.8, 0.9, 1.0],
                [1.1, 1.2, 1.3, 1.4, 1.5]
            ]
            mockEmbeddings.embedDocuments.mockResolvedValue(fullVectors)

            const matryoshka = new MatryoshkaEmbeddings({
                embeddings: mockEmbeddings as any,
                dimensions: 2
            })

            const result = await matryoshka.embedDocuments(['doc1', 'doc2', 'doc3'])

            expect(mockEmbeddings.embedDocuments).toHaveBeenCalledWith(['doc1', 'doc2', 'doc3'])
            expect(result).toEqual([
                [0.1, 0.2],
                [0.6, 0.7],
                [1.1, 1.2]
            ])
        })

        it('should handle empty document list', async () => {
            mockEmbeddings.embedDocuments.mockResolvedValue([])

            const matryoshka = new MatryoshkaEmbeddings({
                embeddings: mockEmbeddings as any,
                dimensions: 3
            })

            const result = await matryoshka.embedDocuments([])

            expect(result).toEqual([])
        })

        it('should truncate to dimension 1', async () => {
            const fullVectors = [[0.5, 0.3, 0.1]]
            mockEmbeddings.embedDocuments.mockResolvedValue(fullVectors)

            const matryoshka = new MatryoshkaEmbeddings({
                embeddings: mockEmbeddings as any,
                dimensions: 1
            })

            const result = await matryoshka.embedDocuments(['doc'])

            expect(result).toEqual([[0.5]])
        })
    })

    describe('delegation', () => {
        it('should pass through to the underlying embeddings instance', async () => {
            mockEmbeddings.embedQuery.mockResolvedValue([1, 2, 3, 4])
            mockEmbeddings.embedDocuments.mockResolvedValue([[1, 2, 3, 4]])

            const matryoshka = new MatryoshkaEmbeddings({
                embeddings: mockEmbeddings as any,
                dimensions: 2
            })

            await matryoshka.embedQuery('query')
            await matryoshka.embedDocuments(['doc'])

            expect(mockEmbeddings.embedQuery).toHaveBeenCalledTimes(1)
            expect(mockEmbeddings.embedDocuments).toHaveBeenCalledTimes(1)
        })
    })
})
