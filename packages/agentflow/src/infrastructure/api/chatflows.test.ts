import type { AxiosInstance } from 'axios'

import { createChatflowsApi } from './chatflows'

const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
} as unknown as jest.Mocked<AxiosInstance>

beforeEach(() => {
    jest.clearAllMocks()
})

describe('createChatflowsApi', () => {
    const api = createChatflowsApi(mockClient)

    describe('getAllChatflows', () => {
        it('should call GET /chatflows', async () => {
            const mockData = [{ id: '1', name: 'Flow 1' }]
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockData })

            const result = await api.getAllChatflows()
            expect(mockClient.get).toHaveBeenCalledWith('/chatflows')
            expect(result).toEqual(mockData)
        })
    })

    describe('getChatflow', () => {
        it('should call GET /chatflows/:id', async () => {
            const mockData = { id: 'abc', name: 'My Flow' }
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockData })

            const result = await api.getChatflow('abc')
            expect(mockClient.get).toHaveBeenCalledWith('/chatflows/abc')
            expect(result).toEqual(mockData)
        })
    })

    describe('createChatflow', () => {
        it('should serialize FlowData object to JSON string', async () => {
            const flowData = { nodes: [], edges: [] }
            ;(mockClient.post as jest.Mock).mockResolvedValue({ data: {} })

            await api.createChatflow({ name: 'New', flowData })
            expect(mockClient.post).toHaveBeenCalledWith('/chatflows', {
                name: 'New',
                flowData: JSON.stringify(flowData),
                type: 'AGENTFLOW'
            })
        })

        it('should pass string flowData as-is', async () => {
            ;(mockClient.post as jest.Mock).mockResolvedValue({ data: {} })

            await api.createChatflow({ name: 'New', flowData: '{"nodes":[]}' })
            expect(mockClient.post).toHaveBeenCalledWith('/chatflows', {
                name: 'New',
                flowData: '{"nodes":[]}',
                type: 'AGENTFLOW'
            })
        })

        it('should use custom type when provided', async () => {
            ;(mockClient.post as jest.Mock).mockResolvedValue({ data: {} })

            await api.createChatflow({ name: 'New', flowData: '{}', type: 'CHATFLOW' })
            expect(mockClient.post).toHaveBeenCalledWith('/chatflows', expect.objectContaining({ type: 'CHATFLOW' }))
        })
    })

    describe('updateChatflow', () => {
        it('should serialize FlowData object to JSON string', async () => {
            const flowData = { nodes: [], edges: [] }
            ;(mockClient.put as jest.Mock).mockResolvedValue({ data: {} })

            await api.updateChatflow('abc', { flowData })
            expect(mockClient.put).toHaveBeenCalledWith('/chatflows/abc', { flowData: JSON.stringify(flowData) })
        })

        it('should pass string flowData as-is', async () => {
            ;(mockClient.put as jest.Mock).mockResolvedValue({ data: {} })

            await api.updateChatflow('abc', { flowData: '{"nodes":[]}' })
            expect(mockClient.put).toHaveBeenCalledWith('/chatflows/abc', { flowData: '{"nodes":[]}' })
        })

        it('should pass non-flowData fields unchanged', async () => {
            ;(mockClient.put as jest.Mock).mockResolvedValue({ data: {} })

            await api.updateChatflow('abc', { name: 'Renamed', deployed: true })
            expect(mockClient.put).toHaveBeenCalledWith('/chatflows/abc', { name: 'Renamed', deployed: true })
        })
    })

    describe('deleteChatflow', () => {
        it('should call DELETE /chatflows/:id', async () => {
            ;(mockClient.delete as jest.Mock).mockResolvedValue({})

            await api.deleteChatflow('abc')
            expect(mockClient.delete).toHaveBeenCalledWith('/chatflows/abc')
        })
    })

    describe('generateAgentflow', () => {
        it('should call POST /agentflowv2-generator/generate', async () => {
            const payload = { question: 'Build a chatbot', selectedChatModel: { name: 'gpt-4' } }
            ;(mockClient.post as jest.Mock).mockResolvedValue({ data: { nodes: [], edges: [] } })

            const result = await api.generateAgentflow(payload)
            expect(mockClient.post).toHaveBeenCalledWith('/agentflowv2-generator/generate', payload)
            expect(result).toEqual({ nodes: [], edges: [] })
        })
    })

    describe('getChatModels', () => {
        it('should call GET /assistants/chatmodels', async () => {
            const mockModels = [{ name: 'gpt-4', label: 'GPT-4' }]
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockModels })

            const result = await api.getChatModels()
            expect(mockClient.get).toHaveBeenCalledWith('/assistants/chatmodels')
            expect(result).toEqual(mockModels)
        })
    })
})
