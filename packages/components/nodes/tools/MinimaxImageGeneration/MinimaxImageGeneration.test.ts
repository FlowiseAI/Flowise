const { nodeClass: MinimaxImageGeneration_Tools } = require('./MinimaxImageGeneration')
import { INodeData } from '../../../src/Interface'

jest.mock('../../../src/utils', () => ({
    getBaseClasses: jest.fn(() => ['Tool', 'StructuredTool']),
    getCredentialData: jest.fn(async () => ({ minimaxApiKey: 'test-key' })),
    getCredentialParam: jest.fn((name: string, credentialData: any) => credentialData?.[name])
}))

const { getCredentialData } = require('../../../src/utils')

function createNodeData(inputs: any): INodeData {
    return {
        id: 'test-node',
        label: 'MiniMax Image Generation',
        name: 'minimaxImageGeneration',
        type: 'MinimaxImageGeneration',
        icon: 'minimax.svg',
        version: 1.0,
        category: 'Tools',
        baseClasses: ['MinimaxImageGeneration', 'Tool'],
        credential: 'cred-id',
        inputs
    }
}

describe('MinimaxImageGeneration', () => {
    let nodeClass: any

    beforeEach(() => {
        nodeClass = new MinimaxImageGeneration_Tools()
        getCredentialData.mockResolvedValue({ minimaxApiKey: 'test-key' })
        ;(global as any).fetch = jest.fn()
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('Tool Initialization', () => {
        it('should throw error when API key is not provided', async () => {
            getCredentialData.mockResolvedValueOnce({})
            const nodeData = createNodeData({ model: 'image-01' })
            await expect(nodeClass.init(nodeData, '', {})).rejects.toThrow('MiniMax API Key is required')
        })

        it('should initialize the structured tool with the expected name', async () => {
            const nodeData = createNodeData({ model: 'image-01' })
            const tool = await nodeClass.init(nodeData, '', {})
            expect(tool).toBeDefined()
            expect(tool.name).toBe('minimax_image_generation')
        })
    })

    describe('Image Generation', () => {
        it('should call the global endpoint and return image URLs', async () => {
            ;(global as any).fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    data: { image_urls: ['https://example.com/a.png'] },
                    base_resp: { status_code: 0, status_msg: 'success' }
                })
            })

            const nodeData = createNodeData({ region: 'global', model: 'image-01', aspectRatio: '16:9' })
            const tool = await nodeClass.init(nodeData, '', {})
            const result = await tool._call({ prompt: 'a red apple' })

            expect(result).toBe('https://example.com/a.png')
            const [url, requestInit] = (global as any).fetch.mock.calls[0]
            expect(url).toBe('https://api.minimax.io/v1/image_generation')
            expect(requestInit.headers.Authorization).toBe('Bearer test-key')
            const body = JSON.parse(requestInit.body)
            expect(body.model).toBe('image-01')
            expect(body.prompt).toBe('a red apple')
            expect(body.aspect_ratio).toBe('16:9')
        })

        it('should use the mainland China endpoint when region is china', async () => {
            ;(global as any).fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    data: { image_urls: ['https://example.com/b.png'] },
                    base_resp: { status_code: 0 }
                })
            })

            const nodeData = createNodeData({ region: 'china', model: 'image-01' })
            const tool = await nodeClass.init(nodeData, '', {})
            await tool._call({ prompt: 'a blue car' })

            const [url] = (global as any).fetch.mock.calls[0]
            expect(url).toBe('https://api.minimaxi.com/v1/image_generation')
        })

        it('should throw when the API returns a non-zero status code', async () => {
            ;(global as any).fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ base_resp: { status_code: 1004, status_msg: 'authentication failed' } })
            })

            const nodeData = createNodeData({ model: 'image-01' })
            const tool = await nodeClass.init(nodeData, '', {})
            await expect(tool._call({ prompt: 'anything' })).rejects.toThrow('authentication failed')
        })

        it('should throw when the HTTP response is not ok', async () => {
            ;(global as any).fetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })

            const nodeData = createNodeData({ model: 'image-01' })
            const tool = await nodeClass.init(nodeData, '', {})
            await expect(tool._call({ prompt: 'anything' })).rejects.toThrow('MiniMax API error: 500')
        })
    })
})
