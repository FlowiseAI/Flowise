import type { AxiosInstance } from 'axios'

import { bindChatModelsApi } from './models'

const mockClient = {
    post: jest.fn()
} as unknown as jest.Mocked<AxiosInstance>

beforeEach(() => {
    jest.clearAllMocks()
})

describe('bindChatModelsApi', () => {
    const api = bindChatModelsApi(mockClient)

    describe('getChatModels', () => {
        it('should POST to /node-load-method/agentAgentflow with listModels loadMethod', async () => {
            const mockModels = [{ name: 'gpt-4', label: 'GPT-4' }]
            ;(mockClient.post as jest.Mock).mockResolvedValue({ data: mockModels })

            const result = await api.getChatModels()
            expect(mockClient.post).toHaveBeenCalledWith('/node-load-method/agentAgentflow', { loadMethod: 'listModels' })
            expect(result).toEqual(mockModels)
        })
    })
})
