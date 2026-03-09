import type { AxiosInstance } from 'axios'

import { createModelsApi } from './models'

const mockClient = {
    get: jest.fn()
} as unknown as jest.Mocked<AxiosInstance>

beforeEach(() => {
    jest.clearAllMocks()
})

describe('createModelsApi', () => {
    const api = createModelsApi(mockClient)

    describe('getChatModels', () => {
        it('should call GET /assistants/chatmodels', async () => {
            const mockModels = [{ name: 'gpt-4', label: 'GPT-4' }]
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockModels })

            const result = await api.getChatModels()
            expect(mockClient.get).toHaveBeenCalledWith('/assistants/chatmodels')
            expect(result).toEqual(mockModels)
        })
    })

    describe('getModelsByProvider', () => {
        it('should call GET /assistants/chatmodels?provider=openai', async () => {
            const mockModels = [{ name: 'gpt-4', label: 'GPT-4' }]
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockModels })

            const result = await api.getModelsByProvider('openai')
            expect(mockClient.get).toHaveBeenCalledWith('/assistants/chatmodels?provider=openai')
            expect(result).toEqual(mockModels)
        })
    })
})
