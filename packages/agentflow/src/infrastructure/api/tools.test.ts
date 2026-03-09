import type { AxiosInstance } from 'axios'

import { createToolsApi } from './tools'

const mockClient = {
    get: jest.fn()
} as unknown as jest.Mocked<AxiosInstance>

beforeEach(() => {
    jest.clearAllMocks()
})

describe('createToolsApi', () => {
    const api = createToolsApi(mockClient)

    describe('getAllTools', () => {
        it('should call GET /tools', async () => {
            const mockTools = [{ id: '1', name: 'Calculator' }]
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockTools })

            const result = await api.getAllTools()
            expect(mockClient.get).toHaveBeenCalledWith('/tools')
            expect(result).toEqual(mockTools)
        })
    })

    describe('getToolById', () => {
        it('should call GET /tools/:id', async () => {
            const mockTool = { id: 'abc', name: 'Calculator' }
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockTool })

            const result = await api.getToolById('abc')
            expect(mockClient.get).toHaveBeenCalledWith('/tools/abc')
            expect(result).toEqual(mockTool)
        })
    })
})
