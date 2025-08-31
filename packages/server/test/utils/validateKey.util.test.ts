import { validateChatflowAPIKey, validateAPIKey, getAPIKeyWorkspaceID } from '../../src/utils/validateKey'
import apikeyService from '../../src/services/apikey'
import { compareKeys } from '../../src/utils/apiKey'
import { Request } from 'express'

jest.mock('../../src/services/apikey')
jest.mock('../../src/utils/apiKey')

const mockedCompareKeys = compareKeys as jest.Mock
const mockedApikeyService = apikeyService as jest.Mocked<typeof apikeyService>

const createMockRequest = (headers: Record<string, string> = {}): Request => {
    return {
        headers,
        cookies: {},
        query: {},
        params: {},
        body: {},
        get: jest.fn()
    } as unknown as Request
}

export function validateKeyTest() {
    describe('Validate Key Utils', () => {
        describe('validateChatflowAPIKey', () => {
            it('should return true if chatflow has no apikeyid', async () => {
                const req = createMockRequest()
                const result = await validateChatflowAPIKey(req, { apikeyid: null } as any)
                expect(result).toBe(true)
            })

            it('should return false if apikeyid exists but no Authorization header', async () => {
                const req = createMockRequest()
                const result = await validateChatflowAPIKey(req, { apikeyid: 'abc' } as any)
                expect(result).toBe(false)
            })

            it('should return false if no matching key is found', async () => {
                mockedApikeyService.getAllApiKeys.mockResolvedValueOnce([])
                const req = createMockRequest({ authorization: 'Bearer someKey' })
                const result = await validateChatflowAPIKey(req, { apikeyid: 'abc' } as any)
                expect(result).toBe(false)
            })

            it('should return false if key does not match', async () => {
                mockedApikeyService.getAllApiKeys.mockResolvedValueOnce([{ id: 'abc', apiSecret: 'secret' }])
                mockedCompareKeys.mockReturnValueOnce(false)

                const req = createMockRequest({ authorization: 'Bearer someKey' })
                const result = await validateChatflowAPIKey(req, { apikeyid: 'abc' } as any)
                expect(result).toBe(false)
            })

            it('should return true if key matches', async () => {
                mockedApikeyService.getAllApiKeys.mockResolvedValueOnce([{ id: 'abc', apiSecret: 'secret' }])
                mockedCompareKeys.mockReturnValueOnce(true)

                const req = createMockRequest({ authorization: 'Bearer someKey' })
                const result = await validateChatflowAPIKey(req, { apikeyid: 'abc' } as any)
                expect(result).toBe(true)
            })
        })

        describe('validateAPIKey', () => {
            it('should return false if no Authorization header', async () => {
                const req = createMockRequest()
                const result = await validateAPIKey(req)
                expect(result).toBe(false)
            })

            it('should return false if no matching apiKey', async () => {
                mockedApikeyService.getAllApiKeys.mockResolvedValueOnce([])
                const req = createMockRequest({ authorization: 'Bearer someKey' })
                const result = await validateAPIKey(req)
                expect(result).toBe(false)
            })

            it('should return false if apiKey does not match', async () => {
                mockedApikeyService.getAllApiKeys.mockResolvedValueOnce([{ apiKey: 'someKey', apiSecret: 'secret' }])
                mockedCompareKeys.mockReturnValueOnce(false)
                const req = createMockRequest({ authorization: 'Bearer someKey' })
                const result = await validateAPIKey(req)
                expect(result).toBe(false)
            })

            it('should return true if apiKey matches', async () => {
                mockedApikeyService.getAllApiKeys.mockResolvedValueOnce([{ apiKey: 'someKey', apiSecret: 'secret' }])
                mockedCompareKeys.mockReturnValueOnce(true)
                const req = createMockRequest({ authorization: 'Bearer someKey' })
                const result = await validateAPIKey(req)
                expect(result).toBe(true)
            })
        })

        describe('getAPIKeyWorkspaceID', () => {
            it('should return undefined if no Authorization header', async () => {
                const req = createMockRequest()
                const result = await getAPIKeyWorkspaceID(req)
                expect(result).toBeUndefined()
            })

            it('should return undefined if key is not found', async () => {
                mockedApikeyService.getApiKey.mockResolvedValueOnce(undefined)
                const req = createMockRequest({ authorization: 'Bearer someKey' })
                const result = await getAPIKeyWorkspaceID(req)
                expect(result).toBeUndefined()
            })
        })
    })
}
