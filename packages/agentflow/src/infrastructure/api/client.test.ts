import axios from 'axios'

import { createApiClient } from './client'

jest.mock('axios', () => {
    const mockResponseInterceptors = { use: jest.fn() }
    const mockRequestInterceptors = { use: jest.fn() }
    return {
        create: jest.fn(() => ({
            interceptors: {
                request: mockRequestInterceptors,
                response: mockResponseInterceptors
            }
        }))
    }
})

const mockedAxios = axios as jest.Mocked<typeof axios>

beforeEach(() => {
    jest.clearAllMocks()
})

describe('createApiClient', () => {
    it('should create client with correct baseURL', () => {
        createApiClient('https://flowise.example.com')
        expect(mockedAxios.create).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: 'https://flowise.example.com/api/v1'
            })
        )
    })

    it('should set Content-Type header', () => {
        createApiClient('https://flowise.example.com')
        expect(mockedAxios.create).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Content-Type': 'application/json'
                })
            })
        )
    })

    it('should set Authorization header when token is provided', () => {
        createApiClient('https://flowise.example.com', 'my-token')
        expect(mockedAxios.create).toHaveBeenCalledWith(
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer my-token'
                })
            })
        )
    })

    it('should not set Authorization header when no token', () => {
        createApiClient('https://flowise.example.com')
        const headers = mockedAxios.create.mock.calls[0][0]?.headers as Record<string, string>
        expect(headers['Authorization']).toBeUndefined()
    })

    it('should register request and response interceptors', () => {
        const client = createApiClient('https://flowise.example.com')
        expect(client.interceptors.request.use).toHaveBeenCalledTimes(1)
        expect(client.interceptors.response.use).toHaveBeenCalledTimes(1)
    })

    it('should pass config through request interceptor', () => {
        const client = createApiClient('https://flowise.example.com')
        const successHandler = (client.interceptors.request.use as jest.Mock).mock.calls[0][0]
        const config = { url: '/chatflows', headers: {} }
        expect(successHandler(config)).toBe(config)
    })

    it('should pass response through response interceptor', () => {
        const client = createApiClient('https://flowise.example.com')
        const successHandler = (client.interceptors.response.use as jest.Mock).mock.calls[0][0]
        const response = { data: {}, status: 200 }
        expect(successHandler(response)).toBe(response)
    })

    it('should reject request interceptor errors', async () => {
        const client = createApiClient('https://flowise.example.com')
        const errorHandler = (client.interceptors.request.use as jest.Mock).mock.calls[0][1]
        const error = new Error('Network error')
        await expect(errorHandler(error)).rejects.toBe(error)
    })

    it('should reject 401 errors through response interceptor', async () => {
        const client = createApiClient('https://flowise.example.com', 'tok')
        const errorHandler = (client.interceptors.response.use as jest.Mock).mock.calls[0][1]

        const error = {
            response: { status: 401, data: { message: 'Unauthorized' } },
            config: { url: '/chatflows' },
            message: 'Request failed'
        }

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
        await expect(errorHandler(error)).rejects.toBe(error)
        expect(consoleSpy).toHaveBeenCalledWith(
            '[Agentflow] 401 Authentication error:',
            expect.objectContaining({ url: '/chatflows', hasToken: true })
        )
        consoleSpy.mockRestore()
    })

    it('should pass through non-401 errors without logging', async () => {
        const client = createApiClient('https://flowise.example.com')
        const errorHandler = (client.interceptors.response.use as jest.Mock).mock.calls[0][1]

        const error = { response: { status: 500 }, message: 'Server error' }
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
        await expect(errorHandler(error)).rejects.toBe(error)
        expect(consoleSpy).not.toHaveBeenCalled()
        consoleSpy.mockRestore()
    })
})
