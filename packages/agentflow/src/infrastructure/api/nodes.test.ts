import type { AxiosInstance } from 'axios'

import { createNodesApi } from './nodes'

const mockClient = {
    get: jest.fn()
} as unknown as jest.Mocked<AxiosInstance>

beforeEach(() => {
    jest.clearAllMocks()
})

describe('createNodesApi', () => {
    const api = createNodesApi(mockClient)

    describe('getAllNodes', () => {
        it('should call GET /nodes', async () => {
            const mockNodes = [{ name: 'llmAgentflow', label: 'LLM' }]
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockNodes })

            const result = await api.getAllNodes()
            expect(mockClient.get).toHaveBeenCalledWith('/nodes')
            expect(result).toEqual(mockNodes)
        })
    })

    describe('getNodeByName', () => {
        it('should call GET /nodes/:name', async () => {
            const mockNode = { name: 'llmAgentflow', label: 'LLM' }
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockNode })

            const result = await api.getNodeByName('llmAgentflow')
            expect(mockClient.get).toHaveBeenCalledWith('/nodes/llmAgentflow')
            expect(result).toEqual(mockNode)
        })
    })

    describe('getNodeIconUrl', () => {
        it('should construct correct icon URL', () => {
            const url = api.getNodeIconUrl('https://flowise.example.com', 'llmAgentflow')
            expect(url).toBe('https://flowise.example.com/api/v1/node-icon/llmAgentflow')
        })

        it('should handle trailing slash in instanceUrl', () => {
            const url = api.getNodeIconUrl('https://flowise.example.com/', 'agentNode')
            expect(url).toBe('https://flowise.example.com/api/v1/node-icon/agentNode')
        })
    })
})
