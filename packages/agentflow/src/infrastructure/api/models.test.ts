import type { AxiosInstance } from 'axios'

import { bindChatModelsApi } from './models'

const mockClient = {
    get: jest.fn()
} as unknown as jest.Mocked<AxiosInstance>

beforeEach(() => {
    jest.clearAllMocks()
})

describe('bindChatModelsApi', () => {
    const api = bindChatModelsApi(mockClient)

    describe('getChatModels', () => {
        it('should call GET /assistants/components/chatmodels', async () => {
            const mockModels = [{ name: 'gpt-4', label: 'GPT-4' }]
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockModels })

            const result = await api.getChatModels()
            expect(mockClient.get).toHaveBeenCalledWith('/assistants/components/chatmodels')
            expect(result).toEqual(mockModels)
        })
    })

    describe('getModelsByProvider', () => {
        it('should call GET /assistants/components/chatmodels with provider param', async () => {
            const mockModels = [{ name: 'gpt-4', label: 'GPT-4' }]
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockModels })

            const result = await api.getModelsByProvider('openai')
            expect(mockClient.get).toHaveBeenCalledWith('/assistants/components/chatmodels', { params: { provider: 'openai' } })
            expect(result).toEqual(mockModels)
        })
    })
})
