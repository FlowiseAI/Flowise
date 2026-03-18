import type { AxiosInstance, AxiosResponse } from 'axios'

import { type DeduplicatedClient, withDeduplication } from './deduplicatedClient'

/** Create a deferred promise that can be resolved/rejected externally */
function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

/** Build a minimal mock axios instance */
function createMockClient(): AxiosInstance {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
    } as unknown as AxiosInstance
}

function fakeResponse(data: unknown): AxiosResponse {
    return { data, status: 200, statusText: 'OK', headers: {}, config: {} } as AxiosResponse
}

describe('withDeduplication', () => {
    let mockClient: AxiosInstance
    let client: DeduplicatedClient

    beforeEach(() => {
        jest.useFakeTimers()
        mockClient = createMockClient()
        client = withDeduplication(mockClient)
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe('GET requests', () => {
        it('should deduplicate concurrent identical GET requests', async () => {
            const d = deferred<AxiosResponse>()
            ;(mockClient.get as jest.Mock).mockReturnValue(d.promise)

            const p1 = client.get('/nodes')
            const p2 = client.get('/nodes')

            expect(mockClient.get).toHaveBeenCalledTimes(1)

            d.resolve(fakeResponse([{ name: 'node1' }]))
            const [r1, r2] = await Promise.all([p1, p2])

            expect(r1).toBe(r2)
            expect(r1.data).toEqual([{ name: 'node1' }])
        })

        it('should return cached response for sequential GET requests within TTL', async () => {
            ;(mockClient.get as jest.Mock).mockResolvedValue(fakeResponse('first'))

            const r1 = await client.get('/nodes')

            ;(mockClient.get as jest.Mock).mockResolvedValue(fakeResponse('second'))
            const r2 = await client.get('/nodes')

            expect(mockClient.get).toHaveBeenCalledTimes(1)
            expect(r1.data).toBe('first')
            expect(r2.data).toBe('first')
        })

        it('should re-fetch after TTL expires', async () => {
            const ttl = 5000
            mockClient = createMockClient()
            client = withDeduplication(mockClient, ttl)
            ;(mockClient.get as jest.Mock).mockResolvedValue(fakeResponse('first'))
            await client.get('/nodes')

            // Advance past TTL
            jest.advanceTimersByTime(ttl + 1)
            ;(mockClient.get as jest.Mock).mockResolvedValue(fakeResponse('second'))
            const r2 = await client.get('/nodes')

            expect(mockClient.get).toHaveBeenCalledTimes(2)
            expect(r2.data).toBe('second')
        })

        it('should not deduplicate GET requests with different URLs', async () => {
            const d1 = deferred<AxiosResponse>()
            const d2 = deferred<AxiosResponse>()
            ;(mockClient.get as jest.Mock).mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)

            client.get('/nodes')
            client.get('/chatflows')

            expect(mockClient.get).toHaveBeenCalledTimes(2)

            d1.resolve(fakeResponse('nodes'))
            d2.resolve(fakeResponse('chatflows'))
        })

        it('should not deduplicate GET requests with different params', async () => {
            const d1 = deferred<AxiosResponse>()
            const d2 = deferred<AxiosResponse>()
            ;(mockClient.get as jest.Mock).mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)

            client.get('/credentials', { params: { credentialName: 'openAIApi' } })
            client.get('/credentials', { params: { credentialName: 'googleAI' } })

            expect(mockClient.get).toHaveBeenCalledTimes(2)

            d1.resolve(fakeResponse([]))
            d2.resolve(fakeResponse([]))
        })

        it('should deduplicate GET requests with identical params', async () => {
            const d = deferred<AxiosResponse>()
            ;(mockClient.get as jest.Mock).mockReturnValue(d.promise)

            const p1 = client.get('/credentials', { params: { credentialName: 'openAIApi' } })
            const p2 = client.get('/credentials', { params: { credentialName: 'openAIApi' } })

            expect(mockClient.get).toHaveBeenCalledTimes(1)

            d.resolve(fakeResponse([{ id: '1' }]))
            const [r1, r2] = await Promise.all([p1, p2])
            expect(r1).toBe(r2)
        })
    })

    describe('POST /node-load-method/* requests', () => {
        it('should deduplicate concurrent identical load-method POST requests', async () => {
            const d = deferred<AxiosResponse>()
            ;(mockClient.post as jest.Mock).mockReturnValue(d.promise)

            const body = { loadMethod: 'listModels' }
            const p1 = client.post('/node-load-method/agentAgentflow', body)
            const p2 = client.post('/node-load-method/agentAgentflow', body)

            expect(mockClient.post).toHaveBeenCalledTimes(1)

            d.resolve(fakeResponse([{ name: 'gpt-4' }]))
            const [r1, r2] = await Promise.all([p1, p2])
            expect(r1).toBe(r2)
        })

        it('should return cached response for sequential load-method POST within TTL', async () => {
            ;(mockClient.post as jest.Mock).mockResolvedValue(fakeResponse([{ name: 'gpt-4' }]))

            const body = { loadMethod: 'listModels' }
            await client.post('/node-load-method/agentAgentflow', body)
            ;(mockClient.post as jest.Mock).mockResolvedValue(fakeResponse([{ name: 'gpt-5' }]))
            const r2 = await client.post('/node-load-method/agentAgentflow', body)

            expect(mockClient.post).toHaveBeenCalledTimes(1)
            expect(r2.data).toEqual([{ name: 'gpt-4' }])
        })

        it('should not deduplicate load-method POST requests with different bodies', async () => {
            const d1 = deferred<AxiosResponse>()
            const d2 = deferred<AxiosResponse>()
            ;(mockClient.post as jest.Mock).mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)

            client.post('/node-load-method/agentAgentflow', { loadMethod: 'listModels' })
            client.post('/node-load-method/agentAgentflow', { loadMethod: 'listTools' })

            expect(mockClient.post).toHaveBeenCalledTimes(2)

            d1.resolve(fakeResponse([]))
            d2.resolve(fakeResponse([]))
        })
    })

    describe('non-cacheable requests', () => {
        it('should never deduplicate POST to non-load-method endpoints', async () => {
            const d1 = deferred<AxiosResponse>()
            const d2 = deferred<AxiosResponse>()
            ;(mockClient.post as jest.Mock).mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)

            const body = { name: 'test', flowData: '{}' }
            client.post('/chatflows', body)
            client.post('/chatflows', body)

            expect(mockClient.post).toHaveBeenCalledTimes(2)

            d1.resolve(fakeResponse({ id: '1' }))
            d2.resolve(fakeResponse({ id: '2' }))
        })

        it('should pass through PUT and DELETE to the original client', () => {
            ;(mockClient.put as jest.Mock).mockResolvedValue(fakeResponse('updated'))
            ;(mockClient.delete as jest.Mock).mockResolvedValue(fakeResponse('deleted'))

            client.put('/chatflows/123', { name: 'updated' })
            client.delete('/chatflows/123')

            expect(mockClient.put).toHaveBeenCalledTimes(1)
            expect(mockClient.delete).toHaveBeenCalledTimes(1)
        })
    })

    describe('clearCache', () => {
        it('should force re-fetch after clearCache is called', async () => {
            ;(mockClient.get as jest.Mock).mockResolvedValue(fakeResponse('first'))
            await client.get('/nodes')

            client.clearCache()
            ;(mockClient.get as jest.Mock).mockResolvedValue(fakeResponse('second'))
            const r2 = await client.get('/nodes')

            expect(mockClient.get).toHaveBeenCalledTimes(2)
            expect(r2.data).toBe('second')
        })
    })

    describe('error handling', () => {
        it('should not cache error responses', async () => {
            ;(mockClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

            await expect(client.get('/nodes')).rejects.toThrow('Network error')
            ;(mockClient.get as jest.Mock).mockResolvedValueOnce(fakeResponse('recovered'))
            const r2 = await client.get('/nodes')
            expect(r2.data).toBe('recovered')
            expect(mockClient.get).toHaveBeenCalledTimes(2)
        })

        it('should propagate errors to all concurrent callers', async () => {
            const d = deferred<AxiosResponse>()
            ;(mockClient.get as jest.Mock).mockReturnValue(d.promise)

            const p1 = client.get('/nodes')
            const p2 = client.get('/nodes')

            d.reject(new Error('Server error'))

            await expect(p1).rejects.toThrow('Server error')
            await expect(p2).rejects.toThrow('Server error')
        })
    })
})
