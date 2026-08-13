const mockPost = jest.fn()
jest.mock('axios', () => ({ post: (...args: any[]) => mockPost(...args) }))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['Embeddings']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

import { getCredentialData, getCredentialParam } from '../../../src/utils'

const { nodeClass: TwelveLabsEmbedding } = require('./TwelveLabsEmbedding')

describe('TwelveLabsEmbedding', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('builds a Marengo embedder with the credential api key and default model', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ twelveLabsApiKey: 'tl-key' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, data) => data[key])

        const node = new TwelveLabsEmbedding()
        const model = await node.init({ credential: 'cred-1', inputs: { modelName: 'marengo3.0' } }, '', {})

        expect(model.apiKey).toBe('tl-key')
        expect(model.model).toBe('marengo3.0')
    })

    it('returns the 512-dim float vector from the /embed response', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ twelveLabsApiKey: 'tl-key' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, data) => data[key])

        const vector = Array.from({ length: 512 }, (_, i) => i / 512)
        mockPost.mockResolvedValue({ data: { text_embedding: { segments: [{ float: vector }] } } })

        const node = new TwelveLabsEmbedding()
        const model = await node.init({ credential: 'cred-1', inputs: {} }, '', {})
        const result = await model.embedQuery('a man walking on the beach')

        expect(result).toHaveLength(512)
        expect(mockPost).toHaveBeenCalledWith(
            'https://api.twelvelabs.io/v1.3/embed',
            expect.anything(),
            expect.objectContaining({ headers: { 'x-api-key': 'tl-key' } })
        )
    })

    it('throws when the response has no embedding', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ twelveLabsApiKey: 'tl-key' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, data) => data[key])
        mockPost.mockResolvedValue({ data: { text_embedding: { segments: [] } } })

        const node = new TwelveLabsEmbedding()
        const model = await node.init({ credential: 'cred-1', inputs: {} }, '', {})

        await expect(model.embedQuery('hi')).rejects.toThrow('did not return a text embedding')
    })
})
