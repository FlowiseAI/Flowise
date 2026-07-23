jest.mock('@langchain/openai', () => ({
    OpenAIEmbeddings: jest.fn().mockImplementation((fields) => ({ fields }))
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['Embeddings']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

import { getCredentialData, getCredentialParam } from '../../../src/utils'

const { nodeClass: ForgeEmbedding } = require('./ForgeEmbedding')

describe('ForgeEmbedding', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('exposes the expected node metadata', () => {
        const node = new ForgeEmbedding()

        expect(node.label).toBe('Forge Embedding')
        expect(node.name).toBe('forgeEmbeddings')
        expect(node.type).toBe('ForgeEmbeddings')
        expect(node.icon).toBe('forge.svg')
        expect(node.category).toBe('Embeddings')
        expect(node.credential.credentialNames).toEqual(['openAIApi'])
    })

    it('initializes an embeddings instance pinned to the Forge base URL', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ openAIApiKey: 'forge-key' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new ForgeEmbedding()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'forge-ultra-4k',
                    dimensions: '4096',
                    batchSize: '8',
                    timeout: '15000',
                    stripNewLines: true
                }
            },
            '',
            {}
        )

        expect(model.fields).toMatchObject({
            openAIApiKey: 'forge-key',
            modelName: 'forge-ultra-4k',
            dimensions: 4096,
            batchSize: 8,
            timeout: 15000,
            stripNewLines: true,
            configuration: {
                baseURL: 'https://api.voxell.ai/v1'
            }
        })
    })

    it('defaults the base URL even when only the api key is provided', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ openAIApiKey: 'forge-key' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new ForgeEmbedding()
        const model = await node.init({ credential: 'cred-1', inputs: {} }, '', {})

        expect(model.fields.configuration.baseURL).toBe('https://api.voxell.ai/v1')
    })
})
