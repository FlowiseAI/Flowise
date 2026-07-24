jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn().mockImplementation((fields) => ({ fields }))
}))

jest.mock('../../../src/httpSecurity', () => ({
    checkDenyList: jest.fn()
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['BaseChatModel']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

import { ChatOpenAI } from '@langchain/openai'
import { checkDenyList } from '../../../src/httpSecurity'
import { INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

const { nodeClass: ChatAtlasCloud } = require('./ChatAtlasCloud')

describe('ChatAtlasCloud', () => {
    const originalEnv = process.env

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        process.env = { ...originalEnv }
        delete process.env.ATLASCLOUD_API_KEY
        delete process.env.ATLAS_CLOUD_API_KEY
        delete process.env.ATLASCLOUD_API_BASE
        delete process.env.ATLAS_CLOUD_API_BASE
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    afterAll(() => {
        process.env = originalEnv
    })

    it('defines Atlas Cloud node metadata and model options', () => {
        const node = new ChatAtlasCloud()

        expect(node.label).toBe('Atlas Cloud')
        expect(node.name).toBe('chatAtlasCloud')
        expect(node.credential.credentialNames).toEqual(['atlasCloudApi'])

        const modelInput = node.inputs.find((input: INodeParams) => input.name === 'modelName')
        expect(modelInput).toMatchObject({
            type: 'options',
            default: 'qwen/qwen3.5-flash'
        })
        expect(modelInput?.options?.map((option: INodeOptionsValue) => option.name)).toEqual([
            'qwen/qwen3.5-flash',
            'deepseek-ai/deepseek-v4-pro'
        ])
    })

    it('creates a ChatOpenAI client with Atlas Cloud defaults', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({
            atlasCloudApiKey: 'atlas-key'
        })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new ChatAtlasCloud()
        const model = await node.init(
            {
                id: 'node-1',
                credential: 'cred-1',
                inputs: {
                    modelName: 'deepseek-ai/deepseek-v4-pro',
                    temperature: '0.3',
                    streaming: false,
                    maxTokens: '1024',
                    topP: '0.8',
                    frequencyPenalty: '0.1',
                    presencePenalty: '0.2',
                    timeout: '60',
                    baseOptions: '{"defaultHeaders":{"X-Test":"yes"},"baseURL":"https://ignored.example.com/v1"}'
                }
            },
            '',
            {}
        )

        expect(checkDenyList).toHaveBeenCalledWith('https://api.atlascloud.ai/v1')
        expect(ChatOpenAI).toHaveBeenCalledWith(
            expect.objectContaining({
                modelName: 'deepseek-ai/deepseek-v4-pro',
                openAIApiKey: 'atlas-key',
                apiKey: 'atlas-key',
                temperature: 0.3,
                streaming: false,
                maxTokens: 1024,
                topP: 0.8,
                frequencyPenalty: 0.1,
                presencePenalty: 0.2,
                timeout: 60,
                configuration: {
                    baseURL: 'https://api.atlascloud.ai/v1',
                    defaultHeaders: {
                        'X-Test': 'yes'
                    }
                }
            })
        )
        expect(console.warn).toHaveBeenCalledWith(
            "The 'baseURL' parameter is not allowed in Base Options when using the ChatAtlasCloud node."
        )
        expect(model.fields.configuration.baseURL).toBe('https://api.atlascloud.ai/v1')
    })

    it('falls back to Atlas Cloud environment variables', async () => {
        process.env.ATLASCLOUD_API_KEY = 'env-atlas-key'
        process.env.ATLASCLOUD_API_BASE = 'https://proxy.example.com/v1'
        ;(getCredentialData as jest.Mock).mockResolvedValue({})
        ;(getCredentialParam as jest.Mock).mockReturnValue(undefined)

        const node = new ChatAtlasCloud()
        const model = await node.init(
            {
                id: 'node-1',
                inputs: {
                    temperature: '0.7'
                }
            },
            '',
            {}
        )

        expect(model.fields).toMatchObject({
            modelName: 'qwen/qwen3.5-flash',
            openAIApiKey: 'env-atlas-key',
            apiKey: 'env-atlas-key',
            configuration: {
                baseURL: 'https://proxy.example.com/v1'
            }
        })
    })

    it('throws a clear error when no Atlas Cloud API key is available', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({})
        ;(getCredentialParam as jest.Mock).mockReturnValue(undefined)

        const node = new ChatAtlasCloud()

        await expect(
            node.init(
                {
                    id: 'node-1',
                    inputs: {
                        modelName: 'qwen/qwen3.5-flash',
                        temperature: '0.7'
                    }
                },
                '',
                {}
            )
        ).rejects.toThrow('Atlas Cloud API Key is missing')
    })
})
