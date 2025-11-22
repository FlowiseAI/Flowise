const { nodeClass: Zendesk_DocumentLoaders } = require('./Zendesk')
import { INodeData } from '../../../src/Interface'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock credential helpers
jest.mock('../../../src', () => ({
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn(),
    handleEscapeCharacters: jest.fn((str: string) => str)
}))

const { getCredentialData, getCredentialParam } = require('../../../src')

// Helper function to create a valid INodeData object
function createNodeData(id: string, inputs: any, credential?: string): INodeData {
    return {
        id: id,
        label: 'Zendesk',
        name: 'zendesk',
        type: 'Document',
        icon: 'zendesk.svg',
        version: 1.0,
        category: 'Document Loaders',
        baseClasses: ['Document'],
        inputs: inputs,
        credential: credential,
        outputs: {
            output: 'document'
        }
    }
}

describe('Zendesk', () => {
    let nodeClass: any

    beforeEach(() => {
        nodeClass = new Zendesk_DocumentLoaders()
        jest.clearAllMocks()

        // Default credential mocks
        ;(getCredentialData as jest.Mock).mockResolvedValue({})
        ;(getCredentialParam as jest.Mock).mockImplementation((param: string) => {
            if (param === 'user') return 'user@example.com'
            if (param === 'token') return 'test-token'
            return undefined
        })
    })

    describe('Configuration Validation', () => {
        it('should throw error when zendeskDomain is not provided', async () => {
            const nodeData = createNodeData('test-1', {
                locale: 'en-us'
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow(
                'Configuration validation failed'
            )
        })

        it('should use default locale (en-us) when locale is not provided', async () => {
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Test Article',
                            body: 'Test content'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-2', {
                zendeskDomain: 'example.zendesk.com'
            })

            const result = await nodeClass.init(nodeData, '', {})
            expect(result).toBeDefined()
            expect(Array.isArray(result)).toBe(true)
            // Verify the API was called with en-us locale
            const callUrl = mockedAxios.get.mock.calls[0][0] as string
            expect(callUrl).toContain('locale=en-us')
        })

        it('should throw error when zendeskDomain is invalid', async () => {
            const nodeData = createNodeData('test-3', {
                zendeskDomain: 'invalid-domain.com',
                locale: 'en-us'
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow(
                'Zendesk domain must be a valid zendesk.com domain'
            )
        })

        it('should throw error when token is not provided', async () => {
            ;(getCredentialParam as jest.Mock).mockImplementation((param: string) => {
                if (param === 'user') return 'user@example.com'
                return undefined
            })

            const nodeData = createNodeData('test-4', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow(
                'Zendesk auth token is required'
            )
        })

        it('should throw error when user is not a valid email', async () => {
            ;(getCredentialParam as jest.Mock).mockImplementation((param: string) => {
                if (param === 'user') return 'invalid-user'
                if (param === 'token') return 'test-token'
                return undefined
            })

            const nodeData = createNodeData('test-5', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow(
                'Zendesk auth user must be a valid email address'
            )
        })

        it('should throw error when brandId is not numeric', async () => {
            const nodeData = createNodeData('test-6', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us',
                brandId: 'invalid-id'
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow(
                'Brand ID must be a numeric string'
            )
        })

        it('should accept valid configuration', async () => {
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Test Article',
                            body: 'Test content'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-7', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            const result = await nodeClass.init(nodeData, '', {})
            expect(result).toBeDefined()
            expect(Array.isArray(result)).toBe(true)
        })
    })

    describe('Article Fetching', () => {
        it('should fetch articles successfully', async () => {
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Article 1',
                            body: 'Content 1'
                        },
                        {
                            id: 2,
                            name: 'Article 2',
                            body: 'Content 2'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-8', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            const result = await nodeClass.init(nodeData, '', {})
            expect(result).toHaveLength(2)
            expect(result[0].pageContent).toBe('Content 1')
            expect(result[0].metadata.title).toBe('Article 1')
            expect(result[0].metadata.id).toBe('1')
        })

        it('should handle pagination', async () => {
            const firstPage = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Article 1',
                            body: 'Content 1'
                        }
                    ],
                    next_page: 'https://example.zendesk.com/api/v2/help_center/articles.json?page=2'
                }
            }

            const secondPage = {
                data: {
                    articles: [
                        {
                            id: 2,
                            name: 'Article 2',
                            body: 'Content 2'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage)

            const nodeData = createNodeData('test-9', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            const result = await nodeClass.init(nodeData, '', {})
            expect(result).toHaveLength(2)
            expect(mockedAxios.get).toHaveBeenCalledTimes(2)
        })

        it('should add status filter when publishedArticlesOnly is true', async () => {
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Article 1',
                            body: 'Content 1'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-10', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us',
                publishedArticlesOnly: true
            })

            await nodeClass.init(nodeData, '', {})
            const callUrl = mockedAxios.get.mock.calls[0][0] as string
            expect(callUrl).toContain('status=published')
        })

        it('should add brand_id filter when brandId is provided', async () => {
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Article 1',
                            body: 'Content 1'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-11', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us',
                brandId: '123456'
            })

            await nodeClass.init(nodeData, '', {})
            const callUrl = mockedAxios.get.mock.calls[0][0] as string
            expect(callUrl).toContain('brand_id=123456')
        })

        it('should handle comma-separated locales', async () => {
            const mockArticlesEn = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'English Article',
                            body: 'English content'
                        }
                    ]
                }
            }

            const mockArticlesFr = {
                data: {
                    articles: [
                        {
                            id: 2,
                            name: 'French Article',
                            body: 'French content'
                        }
                    ]
                }
            }

            mockedAxios.get
                .mockResolvedValueOnce(mockArticlesEn)
                .mockResolvedValueOnce(mockArticlesFr)

            const nodeData = createNodeData('test-11b', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us, fr-fr'
            })

            const result = await nodeClass.init(nodeData, '', {})
            expect(result).toHaveLength(2)
            expect(mockedAxios.get).toHaveBeenCalledTimes(2)
            // Verify both locales were called
            const callUrls = mockedAxios.get.mock.calls.map((call) => call[0] as string)
            expect(callUrls[0]).toContain('locale=en-us')
            expect(callUrls[1]).toContain('locale=fr-fr')
        })
    })

    describe('Error Handling', () => {
        it('should handle 401 authentication error', async () => {
            const error = {
                response: {
                    status: 401,
                    statusText: 'Unauthorized'
                }
            }

            mockedAxios.get.mockRejectedValueOnce(error)

            const nodeData = createNodeData('test-12', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow(
                'Authentication failed (401)'
            )
        })

        it('should handle 403 forbidden error', async () => {
            const error = {
                response: {
                    status: 403,
                    statusText: 'Forbidden'
                }
            }

            mockedAxios.get.mockRejectedValueOnce(error)

            const nodeData = createNodeData('test-13', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow(
                'Access forbidden (403)'
            )
        })

        it('should handle 404 not found error', async () => {
            const error = {
                response: {
                    status: 404,
                    statusText: 'Not Found'
                }
            }

            mockedAxios.get.mockRejectedValueOnce(error)

            const nodeData = createNodeData('test-14', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow(
                'Not found (404)'
            )
        })

        it('should handle 500 server error', async () => {
            const error = {
                response: {
                    status: 500,
                    statusText: 'Internal Server Error'
                }
            }

            mockedAxios.get.mockRejectedValueOnce(error)

            const nodeData = createNodeData('test-15', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow(
                'Zendesk server error (500)'
            )
        })

        it('should handle network error (ENOTFOUND)', async () => {
            const error = {
                code: 'ENOTFOUND',
                message: 'getaddrinfo ENOTFOUND'
            }

            mockedAxios.get.mockRejectedValueOnce(error)

            const nodeData = createNodeData('test-16', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow(
                'Network error: Cannot connect to Zendesk'
            )
        })

        it('should handle network error (ECONNREFUSED)', async () => {
            const error = {
                code: 'ECONNREFUSED',
                message: 'Connection refused'
            }

            mockedAxios.get.mockRejectedValueOnce(error)

            const nodeData = createNodeData('test-17', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow(
                'Network error: Cannot connect to Zendesk'
            )
        })
    })

    describe('Chunking Logic', () => {
        it('should not chunk small articles', async () => {
            const smallContent = 'a'.repeat(1000) // Small content
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Small Article',
                            body: smallContent
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-18', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us',
                charsPerToken: 4
            })

            const result = await nodeClass.init(nodeData, '', {})
            expect(result).toHaveLength(1)
            expect(result[0].metadata.id).toBe('1')
        })

        it('should chunk large articles', async () => {
            // Create content that exceeds maxTokens (3000 * 4 = 12000 chars)
            const largeContent = 'a'.repeat(15000)
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Large Article',
                            body: largeContent
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-19', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us',
                charsPerToken: 4
            })

            const result = await nodeClass.init(nodeData, '', {})
            expect(result.length).toBeGreaterThan(1)
            expect(result[0].metadata.id).toContain('1-')
        })

        it('should maintain article title across chunks', async () => {
            const largeContent = 'a'.repeat(15000)
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Large Article Title',
                            body: largeContent
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-20', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us',
                charsPerToken: 4
            })

            const result = await nodeClass.init(nodeData, '', {})
            expect(result.length).toBeGreaterThan(1)
            result.forEach((doc: any) => {
                expect(doc.metadata.title).toBe('Large Article Title')
            })
        })
    })

    describe('Metadata Handling', () => {
        it('should include article URL in metadata', async () => {
            const articleId = 123
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: articleId,
                            name: 'Test Article',
                            body: 'Content'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-21', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            const result = await nodeClass.init(nodeData, '', {})
            expect(result[0].metadata.url).toBe(`https://example.zendesk.com/hc/en-us/articles/${articleId}`)
            expect(result[0].metadata.id).toBe(String(articleId))
            expect(result[0].pageContent).toBe('Content')
        })

        it('should handle additional metadata', async () => {
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Test Article',
                            body: 'Content'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-22', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us',
                metadata: JSON.stringify({ customKey: 'customValue' })
            })

            const result = await nodeClass.init(nodeData, '', {})
            expect(result[0].metadata.customKey).toBe('customValue')
            expect(result[0].metadata.title).toBe('Test Article')
        })

        it('should omit specified metadata keys', async () => {
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Test Article',
                            body: 'Content'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-23', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us',
                omitMetadataKeys: 'url'
            })

            const result = await nodeClass.init(nodeData, '', {})
            expect(result[0].metadata.url).toBeUndefined()
            expect(result[0].metadata.title).toBeDefined()
            expect(result[0].metadata.id).toBeDefined()
        })
    })

    describe('Output Modes', () => {
        it('should return documents array when output is document', async () => {
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Test Article',
                            body: 'Content'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-24', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })
            nodeData.outputs = { output: 'document' }

            const result = await nodeClass.init(nodeData, '', {})
            expect(Array.isArray(result)).toBe(true)
            expect(result[0]).toHaveProperty('pageContent')
            expect(result[0]).toHaveProperty('metadata')
        })

        it('should return concatenated text when output is text', async () => {
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Article 1',
                            body: 'Content 1'
                        },
                        {
                            id: 2,
                            name: 'Article 2',
                            body: 'Content 2'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-25', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })
            nodeData.outputs = { output: 'text' }

            const result = await nodeClass.init(nodeData, '', {})
            expect(typeof result).toBe('string')
            // Check that both article contents are present in the concatenated text
            // The result should be "Content 1\nContent 2\n" (or similar with escape handling)
            const normalizedResult = result.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
            expect(normalizedResult).toContain('Content 1')
            expect(normalizedResult).toContain('Content 2')
        })
    })

    describe('Authentication', () => {
        it('should set Authorization header with Basic auth', async () => {
            const mockArticles = {
                data: {
                    articles: [
                        {
                            id: 1,
                            name: 'Test Article',
                            body: 'Content'
                        }
                    ]
                }
            }

            mockedAxios.get.mockResolvedValueOnce(mockArticles)

            const nodeData = createNodeData('test-26', {
                zendeskDomain: 'example.zendesk.com',
                locale: 'en-us'
            })

            await nodeClass.init(nodeData, '', {})
            const callConfig = mockedAxios.get.mock.calls[0][1]
            expect(callConfig?.headers?.Authorization).toBeDefined()
            expect(callConfig?.headers?.Authorization).toContain('Basic')
        })
    })
})

