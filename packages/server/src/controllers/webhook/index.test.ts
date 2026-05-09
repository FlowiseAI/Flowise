import { StatusCodes } from 'http-status-codes'
import { Request, Response, NextFunction } from 'express'
import { ChatType } from '../../Interface'

const mockValidateWebhookChatflow = jest.fn()
const mockBuildChatflow = jest.fn()
const mockDispatchCallback = jest.fn()
const mockCheckIfChatflowIsValidForStreaming = jest.fn()
const mockSseStreamer = {
    addExternalClient: jest.fn(),
    streamMetadataEvent: jest.fn(),
    streamErrorEvent: jest.fn(),
    removeClient: jest.fn()
}

jest.mock('../../services/webhook', () => ({
    __esModule: true,
    default: { validateWebhookChatflow: mockValidateWebhookChatflow }
}))
jest.mock('../../services/predictions', () => ({
    __esModule: true,
    default: { buildChatflow: mockBuildChatflow }
}))
jest.mock('../../services/chatflows', () => ({
    __esModule: true,
    default: { checkIfChatflowIsValidForStreaming: mockCheckIfChatflowIsValidForStreaming }
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
jest.mock('../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: () => ({ sseStreamer: mockSseStreamer })
}))
const mockBindExecution = jest.fn()
jest.mock('../../services/webhook-listener', () => ({
    getWebhookListenerRegistry: () => ({ bindExecution: mockBindExecution })
}))
jest.mock('uuid', () => ({ v4: () => 'generated-uuid' }))
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

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
        // Default: synchronous response mode
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'sync' as const })
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
                body: expect.objectContaining({
                    webhook: {
                        body: originalBody,
                        headers: expect.any(Object),
                        query: expect.any(Object)
                    },
                    // Controller pre-assigns a chatId so all response modes share an executionChatId
                    // and webhook-listener observers can be bound before the flow emits any events.
                    chatId: expect.any(String)
                })
            }),
            ChatType.WEBHOOK
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
                body: expect.objectContaining({
                    webhook: {
                        body: { action: 'push' },
                        headers: expect.objectContaining({ 'x-github-event': 'push' }),
                        query: { page: '2' }
                    }
                })
            }),
            ChatType.WEBHOOK
        )
    })

    it('redacts credential-bearing headers before they reach the flow', async () => {
        mockBuildChatflow.mockResolvedValue({})

        const req = mockReq({
            body: { action: 'push' },
            headers: {
                'x-github-event': 'push',
                authorization: 'Bearer leaked-token',
                cookie: 'session=secret',
                'x-api-key': 'apikey'
            } as any
        })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        const passedHeaders = (mockBuildChatflow.mock.calls[0][0] as any).body.webhook.headers
        expect(passedHeaders.authorization).toBe('[REDACTED]')
        expect(passedHeaders.cookie).toBe('[REDACTED]')
        expect(passedHeaders['x-api-key']).toBe('[REDACTED]')
        expect(passedHeaders['x-github-event']).toBe('push')
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
            }),
            ChatType.WEBHOOK
        )
    })

    // --- Async callback (FLOWISE-367) ---

    it('returns 202 immediately when callbackUrl is configured on Start node', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'async' as const, callbackUrl: 'https://cb.example.com' })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(res.status).toHaveBeenCalledWith(202)
        expect(res.json).toHaveBeenCalledWith({ chatId: expect.any(String), status: 'PROCESSING' })
        expect(mockBuildChatflow).toHaveBeenCalled()
    })

    it('returns 202 with chatId from body when already provided', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'async' as const, callbackUrl: 'https://cb.example.com' })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq({
            body: { chatId: 'existing-id', foo: 'bar' }
        })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(res.json).toHaveBeenCalledWith({ chatId: 'existing-id', status: 'PROCESSING' })
    })

    it('generates a chatId when not in body and callback URL is present', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'async' as const, callbackUrl: 'https://cb.example.com' })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(res.json).toHaveBeenCalledWith({ chatId: 'generated-uuid', status: 'PROCESSING' })
    })

    it('dispatches SUCCESS callback when flow completes without action', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'async' as const, callbackUrl: 'https://cb.example.com' })
        const apiResponse = { text: 'hello', executionId: 'exec-1' }
        mockBuildChatflow.mockResolvedValue(apiResponse)
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq()
        const res = mockRes()

        await webhookController.createWebhook(req, res, mockNext())

        expect(mockDispatchCallback).toHaveBeenCalledWith(
            'https://cb.example.com',
            { status: 'SUCCESS', chatId: expect.any(String), data: apiResponse },
            undefined
        )
    })

    it('dispatches STOPPED callback when flow has action (HITL pause)', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'async' as const, callbackUrl: 'https://cb.example.com' })
        const action = { id: 'act-1', mapping: { approve: 'Proceed', reject: 'Reject' }, elements: [] }
        const apiResponse = { text: 'waiting', executionId: 'exec-2', action }
        mockBuildChatflow.mockResolvedValue(apiResponse)
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq()
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
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'async' as const, callbackUrl: 'https://cb.example.com' })
        mockBuildChatflow.mockRejectedValue(new Error('flow exploded'))
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq()
        const res = mockRes()

        await webhookController.createWebhook(req, res, mockNext())

        expect(mockDispatchCallback).toHaveBeenCalledWith(
            'https://cb.example.com',
            { status: 'ERROR', chatId: expect.any(String), error: 'flow exploded' },
            undefined
        )
    })

    it('uses callbackSecret from Start node config when signing', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({
            responseMode: 'async' as const,
            callbackUrl: 'https://cb.example.com',
            callbackSecret: 'node-secret'
        })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq()
        const res = mockRes()

        await webhookController.createWebhook(req, res, mockNext())

        expect(mockDispatchCallback).toHaveBeenCalledWith('https://cb.example.com', expect.any(Object), 'node-secret')
    })

    it('uses callbackUrl from Start node config when no header is present', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({
            responseMode: 'async' as const,
            callbackUrl: 'https://node-configured.example.com/cb'
        })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })
        mockDispatchCallback.mockResolvedValue(undefined)
        jest.spyOn(global, 'setImmediate').mockImplementation((fn: any) => fn())

        const req = mockReq()
        const res = mockRes()

        await webhookController.createWebhook(req, res, mockNext())

        expect(res.status).toHaveBeenCalledWith(202)
        expect(mockDispatchCallback).toHaveBeenCalledWith('https://node-configured.example.com/cb', expect.any(Object), undefined)
    })

    it('calls next with BAD_REQUEST when node callbackUrl is not a valid http/https URL', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'async' as const, callbackUrl: 'ftp://bad.example.com' })
        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: StatusCodes.BAD_REQUEST }))
        expect(mockBuildChatflow).not.toHaveBeenCalled()
    })

    it('returns synchronous JSON response when responseMode is sync', async () => {
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

    // --- Fire-and-forget mode (async on, no callback URL) ---

    it('returns 202 immediately in fire-and-forget mode (async on, no callback URL)', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'async' as const })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(res.status).toHaveBeenCalledWith(202)
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'PROCESSING' }))
    })

    it('does not dispatch a callback in fire-and-forget mode even on success', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'async' as const })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)
        // setImmediate hasn't fired yet — flush microtasks
        await new Promise((r) => setImmediate(r))
        await new Promise((r) => setImmediate(r))

        expect(mockDispatchCallback).not.toHaveBeenCalled()
    })

    it('still runs the flow in fire-and-forget mode (does not skip buildChatflow)', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'async' as const })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)
        await new Promise((r) => setImmediate(r))
        await new Promise((r) => setImmediate(r))

        expect(mockBuildChatflow).toHaveBeenCalled()
    })

    it('does not error on URL validation when async is on without a callback URL', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'async' as const })
        mockBuildChatflow.mockResolvedValue({ text: 'done' })

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(next).not.toHaveBeenCalled()
    })

    // --- Streaming response mode (SSE) ---

    it('opens an SSE stream when responseMode is stream and chatflow is streamable', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'stream' as const })
        mockCheckIfChatflowIsValidForStreaming.mockResolvedValue({ isStreaming: true })
        mockBuildChatflow.mockResolvedValue({ chatId: 'generated-uuid', text: 'streamed' })

        const req = mockReq()
        const res = mockRes()
        // flushHeaders/setHeader aren't on the default mockRes — stub them.
        ;(res as any).setHeader = jest.fn()
        ;(res as any).flushHeaders = jest.fn()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect((res as any).setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream')
        expect((res as any).flushHeaders).toHaveBeenCalled()
        expect(mockSseStreamer.addExternalClient).toHaveBeenCalledWith('generated-uuid', res)
        expect(mockBuildChatflow).toHaveBeenCalled()
        expect(mockSseStreamer.streamMetadataEvent).toHaveBeenCalled()
        expect(mockSseStreamer.removeClient).toHaveBeenCalledWith('generated-uuid')
    })

    it('sets streaming=true on req.body before invoking buildChatflow in stream mode', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'stream' as const })
        mockCheckIfChatflowIsValidForStreaming.mockResolvedValue({ isStreaming: true })
        mockBuildChatflow.mockResolvedValue({})

        const req = mockReq()
        const res = mockRes()
        ;(res as any).setHeader = jest.fn()
        ;(res as any).flushHeaders = jest.fn()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(mockBuildChatflow).toHaveBeenCalledWith(
            expect.objectContaining({ body: expect.objectContaining({ streaming: true }) }),
            ChatType.WEBHOOK
        )
    })

    it('emits an error event and closes the stream when buildChatflow rejects', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'stream' as const })
        mockCheckIfChatflowIsValidForStreaming.mockResolvedValue({ isStreaming: true })
        mockBuildChatflow.mockRejectedValue(new Error('flow blew up'))

        const req = mockReq()
        const res = mockRes()
        ;(res as any).setHeader = jest.fn()
        ;(res as any).flushHeaders = jest.fn()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(mockSseStreamer.streamErrorEvent).toHaveBeenCalledWith('generated-uuid', expect.stringContaining('flow blew up'))
        expect(mockSseStreamer.removeClient).toHaveBeenCalledWith('generated-uuid')
        // next() must NOT be called — headers were already flushed; calling it would attempt a second response.
        expect(next).not.toHaveBeenCalled()
    })

    it('falls back to synchronous JSON when responseMode is stream but chatflow is not streamable', async () => {
        mockValidateWebhookChatflow.mockResolvedValue({ responseMode: 'stream' as const })
        mockCheckIfChatflowIsValidForStreaming.mockResolvedValue({ isStreaming: false })
        mockBuildChatflow.mockResolvedValue({ text: 'sync fallback' })

        const req = mockReq()
        const res = mockRes()
        ;(res as any).setHeader = jest.fn()
        ;(res as any).flushHeaders = jest.fn()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(mockSseStreamer.addExternalClient).not.toHaveBeenCalled()
        expect(res.json).toHaveBeenCalledWith({ text: 'sync fallback' })
    })
})
