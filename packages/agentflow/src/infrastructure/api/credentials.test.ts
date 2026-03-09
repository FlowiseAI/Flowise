import type { AxiosInstance } from 'axios'

import { createCredentialsApi } from './credentials'

const mockClient = {
    get: jest.fn()
} as unknown as jest.Mocked<AxiosInstance>

beforeEach(() => {
    jest.clearAllMocks()
})

describe('createCredentialsApi', () => {
    const api = createCredentialsApi(mockClient)

    describe('getAllCredentials', () => {
        it('should call GET /credentials', async () => {
            const mockCredentials = [{ id: '1', name: 'My OpenAI Key', credentialName: 'openAIApi' }]
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockCredentials })

            const result = await api.getAllCredentials()
            expect(mockClient.get).toHaveBeenCalledWith('/credentials')
            expect(result).toEqual(mockCredentials)
        })
    })

    describe('getCredentialsByName', () => {
        it('should call GET /credentials with credentialName param', async () => {
            const mockCredentials = [{ id: '1', name: 'My OpenAI Key', credentialName: 'openAIApi' }]
            ;(mockClient.get as jest.Mock).mockResolvedValue({ data: mockCredentials })

            const result = await api.getCredentialsByName('openAIApi')
            expect(mockClient.get).toHaveBeenCalledWith('/credentials', { params: { credentialName: 'openAIApi' } })
            expect(result).toEqual(mockCredentials)
        })
    })
})
