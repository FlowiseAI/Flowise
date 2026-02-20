jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn(() => ['Embeddings'])
}))

const { nodeClass: MatryoshkaEmbeddingNode } = require('./MatryoshkaEmbedding')

describe('MatryoshkaEmbedding Node', () => {
    let node: InstanceType<typeof MatryoshkaEmbeddingNode>
    let mockEmbeddings: { embedDocuments: jest.Mock; embedQuery: jest.Mock }

    beforeEach(() => {
        jest.clearAllMocks()
        node = new MatryoshkaEmbeddingNode()
        mockEmbeddings = {
            embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3, 0.4]]),
            embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4])
        }
    })

    describe('constructor', () => {
        it('should have correct metadata', () => {
            expect(node.label).toBe('Matryoshka Embeddings')
            expect(node.name).toBe('matryoshkaEmbeddings')
            expect(node.category).toBe('Embeddings')
            expect(node.type).toBe('MatryoshkaEmbeddings')
            expect(node.baseClasses).toContain('MatryoshkaEmbeddings')
            expect(node.baseClasses).toContain('Embeddings')
        })

        it('should require embeddings and dimensions inputs', () => {
            const embeddingsInput = node.inputs.find((i: any) => i.name === 'embeddings')
            const dimensionsInput = node.inputs.find((i: any) => i.name === 'dimensions')

            expect(embeddingsInput).toBeDefined()
            expect(embeddingsInput.type).toBe('Embeddings')

            expect(dimensionsInput).toBeDefined()
            expect(dimensionsInput.type).toBe('number')
        })
    })

    describe('init', () => {
        it('should create a MatryoshkaEmbeddings instance with valid inputs', async () => {
            const nodeData = {
                inputs: {
                    embeddings: mockEmbeddings,
                    dimensions: '256'
                }
            }

            const result = await node.init(nodeData, '', {})

            expect(result).toBeDefined()

            // Verify it works by calling embedQuery
            const vector = await result.embedQuery('test')
            expect(mockEmbeddings.embedQuery).toHaveBeenCalledWith('test')
            expect(vector).toHaveLength(4) // min(256, 4) = 4 since mock returns 4-dim vector
        })

        it('should truncate embeddings to specified dimensions', async () => {
            mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8])

            const nodeData = {
                inputs: {
                    embeddings: mockEmbeddings,
                    dimensions: '3'
                }
            }

            const result = await node.init(nodeData, '', {})
            const vector = await result.embedQuery('test')

            expect(vector).toEqual([0.1, 0.2, 0.3])
        })

        it('should throw error when embeddings input is missing', async () => {
            const nodeData = {
                inputs: {
                    dimensions: '256'
                }
            }

            await expect(node.init(nodeData, '', {})).rejects.toThrow('Embeddings input is required')
        })

        it('should throw error when dimensions input is missing', async () => {
            const nodeData = {
                inputs: {
                    embeddings: mockEmbeddings
                }
            }

            await expect(node.init(nodeData, '', {})).rejects.toThrow('Dimensions input is required')
        })

        it('should throw error when dimensions is not a valid number', async () => {
            const nodeData = {
                inputs: {
                    embeddings: mockEmbeddings,
                    dimensions: 'abc'
                }
            }

            await expect(node.init(nodeData, '', {})).rejects.toThrow('Dimensions must be a positive integer')
        })

        it('should throw error when dimensions is zero', async () => {
            const nodeData = {
                inputs: {
                    embeddings: mockEmbeddings,
                    dimensions: '0'
                }
            }

            await expect(node.init(nodeData, '', {})).rejects.toThrow('Dimensions must be a positive integer')
        })

        it('should throw error when dimensions is negative', async () => {
            const nodeData = {
                inputs: {
                    embeddings: mockEmbeddings,
                    dimensions: '-5'
                }
            }

            await expect(node.init(nodeData, '', {})).rejects.toThrow('Dimensions must be a positive integer')
        })
    })
})
