import type { AxiosInstance } from 'axios'

import { bindToolsApi } from './tools'

const mockClient = {
    post: jest.fn()
} as unknown as jest.Mocked<AxiosInstance>

beforeEach(() => {
    jest.clearAllMocks()
})

describe('bindToolsApi', () => {
    const api = bindToolsApi(mockClient)

    describe('getAllTools', () => {
        it('should POST to /node-load-method/toolAgentflow by default', async () => {
            const mockTools = [{ label: 'Calculator', name: 'calculator' }]
            ;(mockClient.post as jest.Mock).mockResolvedValue({ data: mockTools })

            const result = await api.getAllTools()
            expect(mockClient.post).toHaveBeenCalledWith('/node-load-method/toolAgentflow', { loadMethod: 'listTools' })
            expect(result).toEqual(mockTools)
        })

        it('should POST to /node-load-method/agentAgentflow when nodeName is overridden', async () => {
            const mockTools = [{ label: 'Calculator', name: 'calculator' }]
            ;(mockClient.post as jest.Mock).mockResolvedValue({ data: mockTools })

            const result = await api.getAllTools('agentAgentflow')
            expect(mockClient.post).toHaveBeenCalledWith('/node-load-method/agentAgentflow', { loadMethod: 'listTools' })
            expect(result).toEqual(mockTools)
        })
    })
})
