jest.mock('@langchain/openai', () => {
    class FakeChatOpenAI {
        fields: any
        constructor(fields: any) {
            this.fields = fields
        }
    }
    return { ChatOpenAI: FakeChatOpenAI }
})

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn().mockReturnValue(['BaseChatModel']),
    getCredentialData: jest.fn(),
    getCredentialParam: jest.fn()
}))

jest.mock('axios', () => ({ get: jest.fn() }))

import axios from 'axios'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

const { nodeClass: ChatOrcaRouter } = require('./ChatOrcaRouter')

describe('ChatOrcaRouter', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('live-fetches the catalog, filters to chat models, and puts the auto router first', async () => {
        ;(axios.get as jest.Mock).mockResolvedValue({
            data: {
                data: [
                    { model_name: 'openai/gpt-5.5', supported_endpoint_types: ['openai'] },
                    { model_name: 'anthropic/claude-opus-4.8', supported_endpoint_types: ['anthropic'] },
                    // non-chat entries that must be filtered out:
                    { model_name: 'openai/dall-e-3', supported_endpoint_types: ['image-generation'] },
                    { model_name: 'openai/text-embedding-3-small', supported_endpoint_types: ['openai'] },
                    { model_name: 'kling/kling-video', supported_endpoint_types: ['openai-video'] },
                    { model_name: 'openai/gpt-5-codex', supported_endpoint_types: ['openai'] },
                    { model_name: 'openai/gpt-5-pro', supported_endpoint_types: ['openai-response'] }
                ]
            }
        })

        const node = new ChatOrcaRouter()
        const models = await node.loadMethods.listModels()

        expect(axios.get).toHaveBeenCalledWith('https://www.orcarouter.ai/api/pricing', expect.any(Object))
        expect(models[0]).toEqual({ label: 'Auto router (orcarouter/auto)', name: 'orcarouter/auto' })
        const names = models.map((m: any) => m.name)
        expect(names).toEqual(expect.arrayContaining(['orcarouter/auto', 'openai/gpt-5.5', 'anthropic/claude-opus-4.8']))
        // filtered out: image / embedding / video / codex / responses-only
        expect(names).not.toContain('openai/dall-e-3')
        expect(names).not.toContain('openai/text-embedding-3-small')
        expect(names).not.toContain('kling/kling-video')
        expect(names).not.toContain('openai/gpt-5-codex')
        expect(names).not.toContain('openai/gpt-5-pro')
    })

    it('falls back to flagship presets when the catalog fetch fails', async () => {
        ;(axios.get as jest.Mock).mockRejectedValue(new Error('network down'))

        const node = new ChatOrcaRouter()
        const models = await node.loadMethods.listModels()

        expect(models[0]).toEqual({ label: 'Auto router (orcarouter/auto)', name: 'orcarouter/auto' })
        expect(models.map((m: any) => m.name)).toEqual(
            expect.arrayContaining(['orcarouter/auto', 'openai/gpt-5.5', 'anthropic/claude-opus-4.8', 'qwen/qwen3.7-max'])
        )
    })

    it('declares orcaRouterApi as its credential', () => {
        const node = new ChatOrcaRouter()
        expect(node.credential.credentialNames).toEqual(['orcaRouterApi'])
    })

    it('does not default Temperature, so reasoning models and the auto router are not sent a rejected field', () => {
        const node = new ChatOrcaRouter()
        const temp = node.inputs.find((i: any) => i.name === 'temperature')
        expect(temp).toBeDefined()
        expect(temp.default).toBeUndefined()
        expect(temp.optional).toBe(true)
    })

    it('wires the OrcaRouter base URL, API key, and attribution headers onto the ChatOpenAI client', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ orcaRouterApiKey: 'sk-orca-test-key' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new ChatOrcaRouter()
        const model = await node.init(
            {
                id: 'node-1',
                credential: 'cred-1',
                inputs: {
                    modelName: 'orcarouter/auto',
                    temperature: '0.5',
                    streaming: true,
                    allowImageUploads: false
                }
            },
            '',
            {}
        )

        expect(model.fields).toMatchObject({
            modelName: 'orcarouter/auto',
            openAIApiKey: 'sk-orca-test-key',
            apiKey: 'sk-orca-test-key',
            temperature: 0.5,
            streaming: true
        })
        expect(model.fields.configuration.baseURL).toBe('https://api.orcarouter.ai/v1')
        expect(model.fields.configuration.defaultHeaders).toMatchObject({
            'HTTP-Referer': 'https://www.orcarouter.ai/',
            'X-Title': 'Flowise'
        })
    })

    it('forwards advanced numeric params and honours a custom basepath', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ orcaRouterApiKey: 'sk-orca-x' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new ChatOrcaRouter()
        const model = await node.init(
            {
                id: 'node-1',
                credential: 'cred-1',
                inputs: {
                    modelName: 'openai/gpt-5.5',
                    temperature: '0.2',
                    maxTokens: '1024',
                    topP: '0.8',
                    frequencyPenalty: '0.1',
                    presencePenalty: '0.2',
                    timeout: '30',
                    basepath: 'https://router.internal/v1',
                    streaming: false
                }
            },
            '',
            {}
        )

        expect(model.fields).toMatchObject({
            modelName: 'openai/gpt-5.5',
            temperature: 0.2,
            maxTokens: 1024,
            topP: 0.8,
            frequencyPenalty: 0.1,
            presencePenalty: 0.2,
            timeout: 30,
            streaming: false
        })
        expect(model.fields.configuration.baseURL).toBe('https://router.internal/v1')
    })

    it('omits temperature when the user leaves it blank so reasoning models do not 400', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ orcaRouterApiKey: 'sk-orca-x' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new ChatOrcaRouter()
        const model = await node.init(
            {
                id: 'node-1',
                credential: 'cred-1',
                inputs: {
                    modelName: 'anthropic/claude-opus-4.8',
                    temperature: '',
                    streaming: true
                }
            },
            '',
            {}
        )

        expect(model.fields.temperature).toBeUndefined()
    })

    it('merges user-provided Base Options on top of the default attribution headers', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ orcaRouterApiKey: 'sk-orca-x' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new ChatOrcaRouter()
        const model = await node.init(
            {
                id: 'node-1',
                credential: 'cred-1',
                inputs: {
                    modelName: 'orcarouter/auto',
                    streaming: true,
                    baseOptions: { 'X-Title': 'My-App', 'X-Custom': 'yes' }
                }
            },
            '',
            {}
        )

        expect(model.fields.configuration.defaultHeaders).toMatchObject({
            'HTTP-Referer': 'https://www.orcarouter.ai/',
            'X-Title': 'My-App',
            'X-Custom': 'yes'
        })
    })

    it('throws a clear error when Base Options JSON is malformed', async () => {
        ;(getCredentialData as jest.Mock).mockResolvedValue({ orcaRouterApiKey: 'sk-orca-x' })
        ;(getCredentialParam as jest.Mock).mockImplementation((key, credentialData) => credentialData[key])

        const node = new ChatOrcaRouter()
        await expect(
            node.init(
                {
                    id: 'node-1',
                    credential: 'cred-1',
                    inputs: {
                        modelName: 'orcarouter/auto',
                        baseOptions: '{not json'
                    }
                },
                '',
                {}
            )
        ).rejects.toThrow(/Invalid JSON in the ChatOrcaRouter's BaseOptions/)
    })
})
