jest.mock('@langchain/openai', () => ({
    OpenAIEmbeddings: jest.fn().mockImplementation((fields) => ({ fields }))
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['Embeddings']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

jest.mock('../../../src/greenpt', () => ({
    GREENPT_API_BASE_URL: 'https://api.greenpt.ai/v1',
    listGreenPTModels: jest.fn()
}))

import { listGreenPTModels } from '../../../src/greenpt'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

const { nodeClass: GreenPTEmbedding } = require('./GreenPTEmbedding')

describe('GreenPTEmbedding', () => {
    beforeEach(() => jest.clearAllMocks())

    it('loads embedding models from the GreenPT endpoint', async () => {
        ;(listGreenPTModels as jest.Mock).mockResolvedValue([{ label: 'green-embedding', name: 'green-embedding' }])
        const node = new GreenPTEmbedding()
        const nodeData = { credential: 'cred-1' }
        const options = { appDataSource: {} }

        await expect(node.loadMethods.listModels(nodeData, options)).resolves.toEqual([
            { label: 'green-embedding', name: 'green-embedding' }
        ])
        expect(listGreenPTModels).toHaveBeenCalledWith(nodeData, options, 'embedding')
    })

    it('configures OpenAIEmbeddings for GreenPT', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ greenPTApiKey: 'secret' })
        ;(getCredentialParam as jest.Mock).mockReturnValue('secret')
        const node = new GreenPTEmbedding()

        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'green-embedding',
                    stripNewLines: true,
                    batchSize: '16',
                    timeout: '15000'
                }
            },
            '',
            {}
        )

        expect(model.fields).toMatchObject({
            model: 'green-embedding',
            modelName: 'green-embedding',
            openAIApiKey: 'secret',
            stripNewLines: true,
            batchSize: 16,
            timeout: 15000,
            configuration: { baseURL: 'https://api.greenpt.ai/v1' }
        })
    })
})
