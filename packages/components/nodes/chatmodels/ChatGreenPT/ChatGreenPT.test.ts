jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn().mockImplementation((fields) => ({ fields }))
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['BaseChatModel']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

jest.mock('../../../src/greenpt', () => ({
    GREENPT_API_BASE_URL: 'https://api.greenpt.ai/v1',
    listGreenPTModels: jest.fn()
}))

import { listGreenPTModels } from '../../../src/greenpt'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

const { nodeClass: ChatGreenPT } = require('./ChatGreenPT')

describe('ChatGreenPT', () => {
    beforeEach(() => jest.clearAllMocks())

    it('loads chat models from the GreenPT endpoint', async () => {
        ;(listGreenPTModels as jest.Mock).mockResolvedValue([{ label: 'glm-5.2', name: 'glm-5.2' }])
        const node = new ChatGreenPT()
        const nodeData = { credential: 'cred-1' }
        const options = { appDataSource: {} }

        await expect(node.loadMethods.listModels(nodeData, options)).resolves.toEqual([{ label: 'glm-5.2', name: 'glm-5.2' }])
        expect(listGreenPTModels).toHaveBeenCalledWith(nodeData, options, 'chat')
    })

    it('configures ChatOpenAI for GreenPT', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ greenPTApiKey: 'secret' })
        ;(getCredentialParam as jest.Mock).mockReturnValue('secret')
        const node = new ChatGreenPT()

        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'glm-5.2',
                    temperature: '0.2',
                    streaming: false,
                    maxTokens: '4096',
                    topP: '0.8'
                }
            },
            '',
            {}
        )

        expect(model.fields).toMatchObject({
            model: 'glm-5.2',
            apiKey: 'secret',
            openAIApiKey: 'secret',
            temperature: 0.2,
            streaming: false,
            maxTokens: 4096,
            topP: 0.8,
            configuration: { baseURL: 'https://api.greenpt.ai/v1' }
        })
    })
})
