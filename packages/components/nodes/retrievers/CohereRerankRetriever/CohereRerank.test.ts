import axios from 'axios'

// Mock langchain modules to avoid ESM dependency issues in test
jest.mock('@langchain/core/callbacks/manager', () => ({}))
jest.mock('@langchain/core/documents', () => ({
    Document: class Document {
        pageContent: string
        metadata: Record<string, any>
        constructor(fields: { pageContent: string; metadata: Record<string, any> }) {
            this.pageContent = fields.pageContent
            this.metadata = fields.metadata
        }
    }
}))
jest.mock('langchain/retrievers/document_compressors', () => ({
    BaseDocumentCompressor: class BaseDocumentCompressor {}
}))

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Use require to import after mocks are set up (avoids TS compilation issues with mocked base class)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CohereRerank } = require('./CohereRerank')

// Minimal Document-like objects matching the interface used by CohereRerank
function createDoc(pageContent: string, metadata: Record<string, any> = {}) {
    return { pageContent, metadata }
}

describe('CohereRerank', () => {
    const mockApiKey = 'test-api-key'
    const defaultModel = 'rerank-v3.5'
    const topK = 3
    const maxChunksPerDoc = 10

    const mockDocuments = [
        createDoc('Document about cats', { source: 'a' }),
        createDoc('Document about dogs', { source: 'b' }),
        createDoc('Document about birds', { source: 'c' }),
        createDoc('Document about fish', { source: 'd' })
    ]

    const mockRerankResponse = {
        data: {
            results: [
                { index: 2, relevance_score: 0.95 },
                { index: 0, relevance_score: 0.85 },
                { index: 3, relevance_score: 0.75 }
            ]
        }
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockedAxios.post.mockResolvedValue(mockRerankResponse)
    })

    describe('constructor', () => {
        it('should use default Cohere API URL when no baseURL is provided', async () => {
            const reranker = new CohereRerank(mockApiKey, defaultModel, topK, maxChunksPerDoc)
            await reranker.compressDocuments(mockDocuments, 'test query')

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.cohere.ai/v1/rerank',
                expect.any(Object),
                expect.any(Object)
            )
        })

        it('should use default Cohere API URL when baseURL is empty string', async () => {
            const reranker = new CohereRerank(mockApiKey, defaultModel, topK, maxChunksPerDoc, '')
            await reranker.compressDocuments(mockDocuments, 'test query')

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.cohere.ai/v1/rerank',
                expect.any(Object),
                expect.any(Object)
            )
        })

        it('should use custom baseURL when provided', async () => {
            const customURL = 'https://custom-cohere.example.com/v1/rerank'
            const reranker = new CohereRerank(mockApiKey, defaultModel, topK, maxChunksPerDoc, customURL)
            await reranker.compressDocuments(mockDocuments, 'test query')

            expect(mockedAxios.post).toHaveBeenCalledWith(
                customURL,
                expect.any(Object),
                expect.any(Object)
            )
        })

        it('should strip trailing slashes from custom baseURL', async () => {
            const customURL = 'https://custom-cohere.example.com/v1/rerank///'
            const reranker = new CohereRerank(mockApiKey, defaultModel, topK, maxChunksPerDoc, customURL)
            await reranker.compressDocuments(mockDocuments, 'test query')

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://custom-cohere.example.com/v1/rerank',
                expect.any(Object),
                expect.any(Object)
            )
        })

        it('should trim leading and trailing whitespace from custom baseURL', async () => {
            const customURL = '  https://custom-cohere.example.com/v1/rerank  '
            const reranker = new CohereRerank(mockApiKey, defaultModel, topK, maxChunksPerDoc, customURL)
            await reranker.compressDocuments(mockDocuments, 'test query')

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://custom-cohere.example.com/v1/rerank',
                expect.any(Object),
                expect.any(Object)
            )
        })
    })

    describe('compressDocuments', () => {
        it('should return empty array for empty documents', async () => {
            const reranker = new CohereRerank(mockApiKey, defaultModel, topK, maxChunksPerDoc)
            const result = await reranker.compressDocuments([], 'test query')
            expect(result).toEqual([])
            expect(mockedAxios.post).not.toHaveBeenCalled()
        })

        it('should send correct request payload', async () => {
            const reranker = new CohereRerank(mockApiKey, defaultModel, topK, maxChunksPerDoc)
            await reranker.compressDocuments(mockDocuments, 'animals')

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.any(String),
                {
                    model: defaultModel,
                    topN: topK,
                    max_chunks_per_doc: maxChunksPerDoc,
                    query: 'animals',
                    return_documents: false,
                    documents: ['Document about cats', 'Document about dogs', 'Document about birds', 'Document about fish']
                },
                {
                    headers: {
                        Authorization: `Bearer ${mockApiKey}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    }
                }
            )
        })

        it('should use custom model name in request payload', async () => {
            const customModel = 'my-fine-tuned-rerank-model'
            const reranker = new CohereRerank(mockApiKey, customModel, topK, maxChunksPerDoc)
            await reranker.compressDocuments(mockDocuments, 'test query')

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ model: customModel }),
                expect.any(Object)
            )
        })

        it('should return reranked documents with relevance scores', async () => {
            const reranker = new CohereRerank(mockApiKey, defaultModel, topK, maxChunksPerDoc)
            const result = await reranker.compressDocuments(mockDocuments, 'test query')

            expect(result).toHaveLength(3)
            expect(result[0].pageContent).toBe('Document about birds')
            expect(result[0].metadata.relevance_score).toBe(0.95)
            expect(result[1].pageContent).toBe('Document about cats')
            expect(result[1].metadata.relevance_score).toBe(0.85)
            expect(result[2].pageContent).toBe('Document about fish')
            expect(result[2].metadata.relevance_score).toBe(0.75)
        })

        it('should return original documents on API error', async () => {
            mockedAxios.post.mockRejectedValue(new Error('API Error'))
            const reranker = new CohereRerank(mockApiKey, defaultModel, topK, maxChunksPerDoc)
            const result = await reranker.compressDocuments(mockDocuments, 'test query')

            expect(result).toEqual(mockDocuments)
        })

        it('should use custom baseURL with custom model name', async () => {
            const customURL = 'https://my-proxy.example.com/cohere/rerank'
            const customModel = 'fine-tuned-rerank-v1'
            const reranker = new CohereRerank(mockApiKey, customModel, topK, maxChunksPerDoc, customURL)
            await reranker.compressDocuments(mockDocuments, 'test query')

            expect(mockedAxios.post).toHaveBeenCalledWith(
                customURL,
                expect.objectContaining({ model: customModel }),
                expect.any(Object)
            )
        })

        it('should send correct authorization header', async () => {
            const apiKey = 'my-secret-key'
            const reranker = new CohereRerank(apiKey, defaultModel, topK, maxChunksPerDoc)
            await reranker.compressDocuments(mockDocuments, 'test query')

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer my-secret-key'
                    })
                })
            )
        })
    })
})
