import { StatusCodes } from 'http-status-codes'
import { Request, Response, NextFunction } from 'express'

const mockValidateWebhookChatflow = jest.fn()
const mockBuildChatflow = jest.fn()
const mockDispatchCallback = jest.fn()

jest.mock('../../services/webhook', () => ({
    __esModule: true,
    default: { validateWebhookChatflow: mockValidateWebhookChatflow }
}))
jest.mock('../../services/predictions', () => ({
    __esModule: true,
    default: { buildChatflow: mockBuildChatflow }
}))
jest.mock('../../utils/rateLimit', () => ({
    RateLimiterManager: {
        getInstance: () => ({
            getRateLimiter: () => (_req: Request, _res: Response, next: NextFunction) => next()
        })
    }
}))
jest.mock('../../utils/callbackDispatcher', () => ({
    dispatchCallback: mockDispatchCallback
}))
jest.mock('uuid', () => ({ v4: () => 'generated-uuid' }))

import webhookController from './index'

const mockReq = (overrides: Partial<Request> = {}): Request =>
    ({
        params: { id: 'chatflow-123' },
        body: { foo: 'bar' },
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        query: { page: '1' },
        user: undefined,
        ...overrides
    } as unknown as Request)

const mockRes = (): Response => {
    const res = {} as Response
    res.json = jest.fn().mockReturnValue(res)
    res.status = jest.fn().mockReturnValue(res)
    return res
}

const mockNext = (): NextFunction => jest.fn()

describe('createWebhook', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Default: no callback config on Start node
        mockValidateWebhookChatflow.mockResolvedValue({})
    })

    it('calls next with PRECONDITION_FAILED when id is missing', async () => {
        const req = mockReq({ params: {} as any })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: StatusCodes.PRECONDITION_FAILED }))
    })

    it('calls next with error when validateWebhookChatflow rejects', async () => {
        const error = { statusCode: StatusCodes.NOT_FOUND, message: 'not found' }
        mockValidateWebhookChatflow.mockRejectedValue(error)

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
    })

    it('wraps req.body under webhook key before calling buildChatflow', async () => {
        mockBuildChatflow.mockResolvedValue({})

        const originalBody = { foo: 'bar' }
        const req = mockReq({ body: originalBody })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(mockBuildChatflow).toHaveBeenCalledWith(
            expect.objectContaining({
                body: {
                    webhook: {
                        body: originalBody,
                        headers: expect.any(Object),
                        query: expect.any(Object)
                    }
                }
            })
        )
    })

    it('builds namespaced webhook payload with body, headers, and query', async () => {
        mockBuildChatflow.mockResolvedValue({})

        const req = mockReq({
            body: { action: 'push' },
            headers: { 'x-github-event': 'push' } as any,
            query: { page: '2' } as any
        })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(mockBuildChatflow).toHaveBeenCalledWith(
            expect.objectContaining({
                body: {
                    webhook: {
                        body: { action: 'push' },
                        headers: expect.objectContaining({ 'x-github-event': 'push' }),
                        query: { page: '2' }
                    }
                }
            })
        )
    })

    it('returns buildChatflow result as JSON response', async () => {
        const apiResult = { output: 'ok' }
        mockBuildChatflow.mockResolvedValue(apiResult)

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(res.json).toHaveBeenCalledWith(apiResult)
        expect(next).not.toHaveBeenCalled()
    })

    it('calls next with error when buildChatflow rejects', async () => {
        const error = new Error('execution failed')
        mockBuildChatflow.mockRejectedValue(error)

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
    })

    it('passes the original body to validateWebhookChatflow before mutation', async () => {
        mockBuildChatflow.mockResolvedValue({})

        const req = mockReq({ body: { foo: 'bar' } })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(mockValidateWebhookChatflow).toHaveBeenCalledWith(
            'chatflow-123',
            undefined,
            { foo: 'bar' },
            'POST',
            expect.any(Object),
            expect.any(Object),
            undefined, // rawBody — not set on mock request
            undefined // options — not a resume call
        )
    })

    it('passes skipFieldValidation option when body contains humanInput (resume call)', async () => {
        mockBuildChatflow.mockResolvedValue({})

        const req = mockReq({ body: { chatId: 'abc', humanInput: { type: 'proceed', startNodeId: 'humanInputAgentflow_0' } } })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(mockValidateWebhookChatflow).toHaveBeenCalledWith(
            'chatflow-123',
            undefined,
            expect.objectContaining({ humanInput: expect.any(Object) }),
            'POST',
            expect.any(Object),
            expect.any(Object),
            undefined,
            { skipFieldValidation: true }
        )
    })

    it('includes humanInput and chatId at top level of req.body on resume', async () => {
        mockBuildChatflow.mockResolvedValue({})

        const humanInput = { type: 'proceed', startNodeId: 'humanInputAgentflow_0' }
        const req = mockReq({ body: { chatId: 'abc123', humanInput } })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(mockBuildChatflow).toHaveBeenCalledWith(
            expect.objectContaining({
                body: expect.objectContaining({
                    humanInput,
                    chatId: 'abc123',
                    webhook: expect.any(Object)
                })
            })
        )
    })

    // --- Async callback (FLOWISE-367) ---

    it('returns 202 immediately when X-Callback-Url header is present', async () => {
        mockBuildChatflow.mockResolvedValue({ text: 'done' })
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq({ headers: { 'content-type': 'application/json', 'x-callback-url': 'https://cb.example.com' } as any })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(res.status).toHaveBeenCalledWith(202)
        expect(res.json).toHaveBeenCalledWith({ chatId: expect.any(String), status: 'PROCESSING' })
        expect(mockBuildChatflow).toHaveBeenCalled()
    })

    it('returns 202 with chatId from body when already provided', async () => {
        mockBuildChatflow.mockResolvedValue({ text: 'done' })
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq({
            body: { chatId: 'existing-id', foo: 'bar' },
            headers: { 'content-type': 'application/json', 'x-callback-url': 'https://cb.example.com' } as any
        })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(res.json).toHaveBeenCalledWith({ chatId: 'existing-id', status: 'PROCESSING' })
    })

    it('generates a chatId when not in body and callback URL is present', async () => {
        mockBuildChatflow.mockResolvedValue({ text: 'done' })
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq({ headers: { 'content-type': 'application/json', 'x-callback-url': 'https://cb.example.com' } as any })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(res.json).toHaveBeenCalledWith({ chatId: 'generated-uuid', status: 'PROCESSING' })
    })

    it('dispatches SUCCESS callback when flow completes without action', async () => {
        const apiResponse = { text: 'hello', executionId: 'exec-1' }
        mockBuildChatflow.mockResolvedValue(apiResponse)
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq({ headers: { 'content-type': 'application/json', 'x-callback-url': 'https://cb.example.com' } as any })
        const res = mockRes()

        await webhookController.createWebhook(req, res, mockNext())

        expect(mockDispatchCallback).toHaveBeenCalledWith(
            'https://cb.example.com',
            { status: 'SUCCESS', chatId: expect.any(String), data: apiResponse },
            undefined
        )
    })

    it('dispatches STOPPED callback when flow has action (HITL pause)', async () => {
        const action = { id: 'act-1', mapping: { approve: 'Proceed', reject: 'Reject' }, elements: [] }
        const apiResponse = { text: 'waiting', executionId: 'exec-2', action }
        mockBuildChatflow.mockResolvedValue(apiResponse)
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq({ headers: { 'content-type': 'application/json', 'x-callback-url': 'https://cb.example.com' } as any })
        const res = mockRes()

        await webhookController.createWebhook(req, res, mockNext())

        expect(mockDispatchCallback).toHaveBeenCalledWith(
            'https://cb.example.com',
            {
                status: 'STOPPED',
                chatId: expect.any(String),
                data: { text: 'waiting', executionId: 'exec-2', action }
            },
            undefined
        )
    })

    it('dispatches ERROR callback when flow throws', async () => {
        mockBuildChatflow.mockRejectedValue(new Error('flow exploded'))
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq({ headers: { 'content-type': 'application/json', 'x-callback-url': 'https://cb.example.com' } as any })
        const res = mockRes()

        await webhookController.createWebhook(req, res, mockNext())

        expect(mockDispatchCallback).toHaveBeenCalledWith(
            'https://cb.example.com',
            { status: 'ERROR', chatId: expect.any(String), error: 'flow exploded' },
            undefined
        )
    })

    it('uses callbackSecret from Start node config when signing', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ callbackSecret: 'node-secret' })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq({ headers: { 'content-type': 'application/json', 'x-callback-url': 'https://cb.example.com' } as any })
        const res = mockRes()

        await webhookController.createWebhook(req, res, mockNext())

        expect(mockDispatchCallback).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 'node-secret')
    })

    it('uses callbackUrl from Start node config when no header is present', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ callbackUrl: 'https://node-configured.example.com/cb' })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq()
        const res = mockRes()

        await webhookController.createWebhook(req, res, mockNext())

        expect(res.status).toHaveBeenCalledWith(202)
        expect(mockDispatchCallback).toHaveBeenCalledWith('https://node-configured.example.com/cb', expect.any(Object), undefined)
    })

    it('header callbackUrl takes priority over Start node config', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ callbackUrl: 'https://node.example.com/cb' })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq({ headers: { 'content-type': 'application/json', 'x-callback-url': 'https://header.example.com/cb' } as any })
        const res = mockRes()

        await webhookController.createWebhook(req, res, mockNext())

        expect(mockDispatchCallback).toHaveBeenCalledWith('https://header.example.com/cb', expect.any(Object), undefined)
    })

    it('calls next with BAD_REQUEST when callbackUrl is not a valid http/https URL', async () => {
        const req = mockReq({ headers: { 'content-type': 'application/json', 'x-callback-url': 'ftp://bad.example.com' } as any })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: StatusCodes.BAD_REQUEST }))
        expect(mockBuildChatflow).not.toHaveBeenCalled()
    })

    it('falls back to synchronous response when no callbackUrl is configured', async () => {
        const apiResult = { text: 'sync result' }
        mockBuildChatflow.mockResolvedValue(apiResult)

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(res.status).not.toHaveBeenCalledWith(202)
        expect(res.json).toHaveBeenCalledWith(apiResult)
        expect(mockDispatchCallback).not.toHaveBeenCalled()
    })
})
