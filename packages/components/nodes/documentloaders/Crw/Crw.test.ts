jest.mock('../../../src/httpSecurity', () => ({
    secureAxiosRequest: jest.fn()
}))

jest.mock('../../../src/utils', () => ({
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn(),
    handleEscapeCharacters: jest.fn((value) => value)
}))

import { secureAxiosRequest } from '../../../src/httpSecurity'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

const { nodeClass: Crw } = require('./Crw')

describe('Crw', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('exposes the expected node metadata and fastCRW credential', () => {
        const node = new Crw()

        expect(node.name).toBe('crw')
        expect(node.label).toBe('fastCRW')
        expect(node.type).toBe('Document')
        expect(node.category).toBe('Document Loaders')
        expect(node.credential.credentialNames).toEqual(['crwApi'])
    })

    it('scrapes a URL using the configured credential and base URL', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            crwApiToken: 'crw-test-key',
            crwApiUrl: 'https://fastcrw.com/api'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData, _nodeData, fallback) =>
            credentialData[key] ?? fallback
        )
        ;(secureAxiosRequest as jest.Mock).mockResolvedValue({
            status: 200,
            data: {
                success: true,
                data: {
                    markdown: '# Hello fastCRW',
                    metadata: {
                        title: 'Example',
                        sourceURL: 'https://example.com',
                        description: 'An example page',
                        language: 'en',
                        statusCode: 200
                    }
                }
            }
        })

        const node = new Crw()
        const docs = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    url: 'https://example.com',
                    crawlerType: 'scrape'
                },
                outputs: { output: 'document' }
            },
            '',
            {}
        )

        expect(secureAxiosRequest).toHaveBeenCalledTimes(1)
        const requestArgs = (secureAxiosRequest as jest.Mock).mock.calls[0][0]
        expect(requestArgs.method).toBe('POST')
        expect(requestArgs.url).toBe('https://fastcrw.com/api/v1/scrape')
        expect(requestArgs.data.url).toBe('https://example.com')
        expect(requestArgs.headers.Authorization).toBe('Bearer crw-test-key')

        expect(docs).toHaveLength(1)
        expect(docs[0].pageContent).toBe('# Hello fastCRW')
        expect(docs[0].metadata.source).toBe('https://example.com')
        expect(docs[0].metadata.title).toBe('Example')
    })

    it('searches the web and maps results into documents', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            crwApiToken: 'crw-test-key',
            crwApiUrl: 'https://fastcrw.com/api'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData, _nodeData, fallback) =>
            credentialData[key] ?? fallback
        )
        ;(secureAxiosRequest as jest.Mock).mockResolvedValue({
            status: 200,
            data: {
                success: true,
                data: [
                    {
                        url: 'https://example.com/a',
                        title: 'Result A',
                        description: 'Description A'
                    }
                ]
            }
        })

        const node = new Crw()
        const docs = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    crawlerType: 'search',
                    searchQuery: 'fastcrw'
                },
                outputs: { output: 'document' }
            },
            '',
            {}
        )

        const requestArgs = (secureAxiosRequest as jest.Mock).mock.calls[0][0]
        expect(requestArgs.url).toBe('https://fastcrw.com/api/v1/search')
        expect(requestArgs.data.query).toBe('fastcrw')

        expect(docs).toHaveLength(1)
        expect(docs[0].pageContent).toBe('Description A')
        expect(docs[0].metadata.source).toBe('https://example.com/a')
        expect(docs[0].metadata.title).toBe('Result A')
    })
})
