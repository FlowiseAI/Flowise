import type { AxiosInstance } from 'axios'

import type { NodeData } from '@/core/types'

import { bindNodesApi } from './nodes'

const mockClient = {
    get: jest.fn(),
    post: jest.fn()
} as unknown as jest.Mocked<AxiosInstance>

beforeEach(() => {
    jest.clearAllMocks()
})

describe('bindNodesApi', () => {
    const api = bindNodesApi(mockClient)

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

    describe('getNodeConfig', () => {
        it('should map SDK fields to legacy field names for the server', async () => {
            const mockConfig = [{ node: 'LLM', nodeId: 'node-1', label: 'Model Name', name: 'modelName', type: 'string' }]
            ;(mockClient.post as jest.Mock).mockResolvedValue({ data: mockConfig })

            const inputs = [{ id: 'i1', name: 'modelName', label: 'Model Name', type: 'string' }]
            const inputValues = { modelName: 'gpt-4' }
            const nodeData: NodeData = { id: 'node-1', name: 'llmAgentflow', label: 'LLM', inputs, inputValues }
            const result = await api.getNodeConfig(nodeData)
            // Server expects inputParams (definitions) and inputs (values)
            expect(mockClient.post).toHaveBeenCalledWith(
                '/node-config',
                expect.objectContaining({ inputParams: inputs, inputs: inputValues })
            )
            expect(result).toEqual(mockConfig)
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
