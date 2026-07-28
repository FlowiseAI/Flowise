jest.mock('axios', () => ({
    get: jest.fn()
}))

jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn().mockImplementation((fields) => ({ fields }))
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['BaseChatModel']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

import axios from 'axios'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

const { nodeClass: ChatModelsell } = require('./ChatModelsell')

describe('ChatModelsell', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(getCredentialData as jest.Mock).mockResolvedValue({ modelsellApiKey: 'sk-test' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])
    })

    it('loads model names dynamically with bearer authentication', async () => {
        ;(axios.get as jest.Mock).mockResolvedValue({
            data: {
                data: [{ id: 'provider/model-a' }, { id: 'model-b' }, { id: '' }, {}]
            }
        })

        const node = new ChatModelsell()
        const models = await node.loadMethods.listModels({ credential: 'cred-1', inputs: {} }, {})

        expect(axios.get).toHaveBeenCalledWith('https://modelsell.com/v1/models', {
            headers: { Authorization: 'Bearer sk-test' }
        })
        expect(models).toEqual([
            { label: 'provider/model-a', name: 'provider/model-a' },
            { label: 'model-b', name: 'model-b' }
        ])
    })

    it('requires a Modelsell API key before loading models', async () => {
        ;(getCredentialParam as jest.Mock).mockReturnValue(undefined)

        const node = new ChatModelsell()

        await expect(node.loadMethods.listModels({ credential: 'cred-1', inputs: {} }, {})).rejects.toThrow(
            'Modelsell API Key missing from credential'
        )
        expect(axios.get).not.toHaveBeenCalled()
    })

    it('creates an OpenAI-compatible chat model with the Modelsell base URL', async () => {
        const node = new ChatModelsell()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'provider/model-a',
                    temperature: '0.2',
                    streaming: false,
                    maxTokens: '512',
                    topP: '0.8',
                    frequencyPenalty: '0.1',
                    presencePenalty: '0.3',
                    timeout: '30',
                    defaultHeaders: '{"X-Test":"value"}'
                }
            },
            '',
            {}
        )

        expect(model.fields).toMatchObject({
            model: 'provider/model-a',
            apiKey: 'sk-test',
            openAIApiKey: 'sk-test',
            temperature: 0.2,
            streaming: false,
            maxTokens: 512,
            topP: 0.8,
            frequencyPenalty: 0.1,
            presencePenalty: 0.3,
            timeout: 30,
            configuration: {
                baseURL: 'https://modelsell.com/v1',
                defaultHeaders: { 'X-Test': 'value' }
            }
        })
    })
})
