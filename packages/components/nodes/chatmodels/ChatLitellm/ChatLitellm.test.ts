jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn().mockImplementation((fields) => ({ fields }))
}))

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['BaseChatModel']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

jest.mock('../ChatOpenAI/FlowiseChatOpenAI', () => ({
    ChatOpenAI: jest.fn().mockImplementation((_id, config) => ({
        config,
        setMultiModalOption: jest.fn()
    }))
}))

import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChatOpenAI } from '../ChatOpenAI/FlowiseChatOpenAI'

const { nodeClass: ChatLitellm } = require('./ChatLitellm')

describe('ChatLitellm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(getCredentialData as jest.Mock).mockResolvedValue({})
    })

    it('initializes with basic config (API key and model only)', async () => {
        ;(getCredentialParam as jest.Mock).mockImplementation((key: string) => {
            if (key === 'litellmApiKey') return 'sk-test-key'
            return undefined
        })

        const node = new ChatLitellm()
        const model = await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    basePath: 'https://litellm.example.com',
                    modelName: 'anthropic/claude-sonnet-4-20250514',
                    temperature: '0.7',
                    streaming: true
                }
            },
            '',
            {}
        )

        expect(ChatOpenAI).toHaveBeenCalledWith(
            undefined,
            expect.objectContaining({
                modelName: 'anthropic/claude-sonnet-4-20250514',
                temperature: 0.7,
                streaming: true,
                openAIApiKey: 'sk-test-key',
                apiKey: 'sk-test-key',
                configuration: {
                    baseURL: 'https://litellm.example.com'
                }
            })
        )
        expect(model.setMultiModalOption).toHaveBeenCalled()
    })

    it('passes custom headers from credential when provided', async () => {
        ;(getCredentialParam as jest.Mock).mockImplementation((key: string) => {
            if (key === 'litellmApiKey') return 'sk-test-key'
            if (key === 'litellmCustomHeaders') return '{"x-litellm-tags": "team:activation,env:prod"}'
            return undefined
        })

        const node = new ChatLitellm()
        await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    basePath: 'https://litellm.example.com',
                    modelName: 'gpt-4o',
                    temperature: '0.9',
                    streaming: true
                }
            },
            '',
            {}
        )

        expect(ChatOpenAI).toHaveBeenCalledWith(
            undefined,
            expect.objectContaining({
                configuration: {
                    baseURL: 'https://litellm.example.com',
                    defaultHeaders: {
                        'x-litellm-tags': 'team:activation,env:prod'
                    }
                }
            })
        )
    })

    it('ignores malformed custom headers JSON gracefully', async () => {
        ;(getCredentialParam as jest.Mock).mockImplementation((key: string) => {
            if (key === 'litellmApiKey') return 'sk-test-key'
            if (key === 'litellmCustomHeaders') return 'not-valid-json'
            return undefined
        })

        const node = new ChatLitellm()
        await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    basePath: 'https://litellm.example.com',
                    modelName: 'gpt-4o',
                    temperature: '0.9',
                    streaming: true
                }
            },
            '',
            {}
        )

        expect(ChatOpenAI).toHaveBeenCalledWith(
            undefined,
            expect.objectContaining({
                configuration: {
                    baseURL: 'https://litellm.example.com'
                }
            })
        )
    })

    it('works without custom headers (backward compatible)', async () => {
        ;(getCredentialParam as jest.Mock).mockImplementation((key: string) => {
            if (key === 'litellmApiKey') return 'sk-test-key'
            return undefined
        })

        const node = new ChatLitellm()
        await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    basePath: 'https://litellm.example.com',
                    modelName: 'gpt-4o',
                    temperature: '0.9',
                    streaming: true
                }
            },
            '',
            {}
        )

        expect(ChatOpenAI).toHaveBeenCalledWith(
            undefined,
            expect.objectContaining({
                configuration: {
                    baseURL: 'https://litellm.example.com'
                }
            })
        )
    })

    it('works without basePath or custom headers', async () => {
        ;(getCredentialParam as jest.Mock).mockImplementation((key: string) => {
            if (key === 'litellmApiKey') return 'sk-test-key'
            return undefined
        })

        const node = new ChatLitellm()
        await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    modelName: 'gpt-4o',
                    temperature: '0.5',
                    streaming: false
                }
            },
            '',
            {}
        )

        const callArgs = (ChatOpenAI as unknown as jest.Mock).mock.calls[0][1]
        expect(callArgs.configuration).toBeUndefined()
    })

    it('passes optional parameters when provided', async () => {
        ;(getCredentialParam as jest.Mock).mockImplementation((key: string) => {
            if (key === 'litellmApiKey') return 'sk-test-key'
            return undefined
        })

        const node = new ChatLitellm()
        await node.init(
            {
                credential: 'cred-1',
                inputs: {
                    basePath: 'https://litellm.example.com',
                    modelName: 'gpt-4o',
                    temperature: '0.5',
                    streaming: true,
                    maxTokens: '4096',
                    topP: '0.95',
                    timeout: '30000'
                }
            },
            '',
            {}
        )

        expect(ChatOpenAI).toHaveBeenCalledWith(
            undefined,
            expect.objectContaining({
                maxTokens: 4096,
                topP: 0.95,
                timeout: 30000
            })
        )
    })
})
