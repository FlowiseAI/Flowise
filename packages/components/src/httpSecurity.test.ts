import axios, { AxiosRequestConfig } from 'axios'
import dns from 'dns/promises'
import fetch, { Headers, Response } from 'node-fetch'
import { secureAxiosRequest, secureFetch } from './httpSecurity'

jest.mock('axios', () => {
    const actual = jest.requireActual('axios')
    return {
        ...actual,
        __esModule: true,
        default: jest.fn()
    }
})
jest.mock('dns/promises')
jest.mock('node-fetch', () => {
    const actual = jest.requireActual('node-fetch')
    return {
        ...actual,
        __esModule: true,
        default: jest.fn()
    }
})

const mockedAxios = axios as jest.MockedFunction<typeof axios>
const mockedDnsLookup = dns.lookup as jest.MockedFunction<typeof dns.lookup>
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>

const sensitiveHeaders = {
    Authorization: 'Bearer secret',
    Cookie: 'session=secret',
    'X-Api-Key': 'secret-key'
}

describe('secure redirect handling', () => {
    beforeEach(() => {
        mockedAxios.mockReset()
        mockedDnsLookup.mockReset()
        mockedFetch.mockReset()
        mockedDnsLookup.mockResolvedValue([{ address: '203.0.113.10', family: 4 }] as never)
    })

    it('removes credentials before a fetch follows a cross-origin redirect', async () => {
        mockedFetch
            .mockResolvedValueOnce(createFetchResponse(302, 'https://redirected.example/result'))
            .mockResolvedValueOnce(createFetchResponse(200))

        await secureFetch('https://source.example/start', {
            headers: {
                ...sensitiveHeaders,
                Accept: 'application/json'
            }
        })

        const redirectedInit = mockedFetch.mock.calls[1][1]
        const redirectedHeaders = new Headers(redirectedInit?.headers)
        expect(redirectedHeaders.get('authorization')).toBeNull()
        expect(redirectedHeaders.get('cookie')).toBeNull()
        expect(redirectedHeaders.get('x-api-key')).toBeNull()
        expect(redirectedHeaders.get('accept')).toBe('application/json')
    })

    it('removes credentials before Axios follows a cross-origin redirect', async () => {
        mockedAxios
            .mockResolvedValueOnce(createAxiosResponse(302, 'https://redirected.example/result'))
            .mockResolvedValueOnce(createAxiosResponse(200))

        await secureAxiosRequest({
            url: 'https://source.example/start',
            headers: {
                ...sensitiveHeaders,
                Accept: 'application/json'
            }
        })

        const redirectedConfig = mockedAxios.mock.calls[1][0] as AxiosRequestConfig
        const redirectedHeaders = new Headers(redirectedConfig.headers as Record<string, string>)
        expect(redirectedHeaders.get('authorization')).toBeNull()
        expect(redirectedHeaders.get('cookie')).toBeNull()
        expect(redirectedHeaders.get('x-api-key')).toBeNull()
        expect(redirectedHeaders.get('accept')).toBe('application/json')
    })

    it('keeps credentials on same-origin redirects', async () => {
        mockedFetch.mockResolvedValueOnce(createFetchResponse(302, '/result')).mockResolvedValueOnce(createFetchResponse(200))

        await secureFetch('https://source.example/start', {
            headers: sensitiveHeaders
        })

        const redirectedHeaders = new Headers(mockedFetch.mock.calls[1][1]?.headers)
        expect(redirectedHeaders.get('authorization')).toBe('Bearer secret')
        expect(redirectedHeaders.get('cookie')).toBe('session=secret')
        expect(redirectedHeaders.get('x-api-key')).toBe('secret-key')
    })

    it('removes entity headers when a redirect changes POST to GET', async () => {
        mockedFetch.mockResolvedValueOnce(createFetchResponse(303, '/result')).mockResolvedValueOnce(createFetchResponse(200))

        await secureFetch('https://source.example/start', {
            method: 'POST',
            body: '{"query":"value"}',
            headers: {
                'Content-Length': '17',
                'Content-Type': 'application/json',
                'X-Request-Id': 'request-1'
            }
        })

        const redirectedInit = mockedFetch.mock.calls[1][1]
        const redirectedHeaders = new Headers(redirectedInit?.headers)
        expect(redirectedInit?.method).toBe('GET')
        expect(redirectedInit?.body).toBeUndefined()
        expect(redirectedHeaders.get('content-length')).toBeNull()
        expect(redirectedHeaders.get('content-type')).toBeNull()
        expect(redirectedHeaders.get('x-request-id')).toBe('request-1')
    })

    it('removes Axios entity headers when a redirect changes POST to GET', async () => {
        mockedAxios.mockResolvedValueOnce(createAxiosResponse(303, '/result')).mockResolvedValueOnce(createAxiosResponse(200))

        await secureAxiosRequest({
            url: 'https://source.example/start',
            method: 'POST',
            data: '{"query":"value"}',
            headers: {
                'Content-Length': '17',
                'Content-Type': 'application/json',
                'X-Request-Id': 'request-1'
            }
        })

        const redirectedConfig = mockedAxios.mock.calls[1][0] as AxiosRequestConfig
        const redirectedHeaders = new Headers(redirectedConfig.headers as Record<string, string>)
        expect(redirectedConfig.method).toBe('GET')
        expect(redirectedConfig.data).toBeUndefined()
        expect(redirectedHeaders.get('content-length')).toBeNull()
        expect(redirectedHeaders.get('content-type')).toBeNull()
        expect(redirectedHeaders.get('x-request-id')).toBe('request-1')
    })
})

function createFetchResponse(status: number, location?: string): Response {
    return {
        status,
        headers: new Headers(location ? { location } : {})
    } as Response
}

function createAxiosResponse(status: number, location?: string): Awaited<ReturnType<typeof axios>> {
    return {
        status,
        headers: location ? { location } : {}
    } as Awaited<ReturnType<typeof axios>>
}
