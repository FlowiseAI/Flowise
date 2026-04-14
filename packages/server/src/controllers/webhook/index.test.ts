import { StatusCodes } from 'http-status-codes'
import { Request, Response, NextFunction } from 'express'

const mockValidateWebhookChatflow = jest.fn()
const mockBuildChatflow = jest.fn()

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

import webhookController from './index'

const mockReq = (overrides: Partial<Request> = {}): Request =>
    ({
        params: { id: 'chatflow-123' },
        body: { foo: 'bar' },
        user: undefined,
        ...overrides
    } as unknown as Request)

const mockRes = (): Response => {
    const res = {} as Response
    res.json = jest.fn().mockReturnValue(res)
    return res
}

const mockNext = (): NextFunction => jest.fn()

describe('createWebhook', () => {
    beforeEach(() => {
        jest.clearAllMocks()
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
        mockValidateWebhookChatflow.mockResolvedValue(undefined)
        mockBuildChatflow.mockResolvedValue({})

        const originalBody = { foo: 'bar' }
        const req = mockReq({ body: originalBody })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(mockBuildChatflow).toHaveBeenCalledWith(expect.objectContaining({ body: { webhook: { body: originalBody } } }))
    })

    it('returns buildChatflow result as JSON response', async () => {
        mockValidateWebhookChatflow.mockResolvedValue(undefined)
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
        mockValidateWebhookChatflow.mockResolvedValue(undefined)
        const error = new Error('execution failed')
        mockBuildChatflow.mockRejectedValue(error)

        const req = mockReq()
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(next).toHaveBeenCalledWith(error)
    })

    it('passes the original body to validateWebhookChatflow before mutation', async () => {
        mockValidateWebhookChatflow.mockResolvedValue(undefined)
        mockBuildChatflow.mockResolvedValue({})

        const req = mockReq({ body: { foo: 'bar' } })
        const res = mockRes()
        const next = mockNext()

        await webhookController.createWebhook(req, res, next)

        expect(mockValidateWebhookChatflow).toHaveBeenCalledWith('chatflow-123', undefined, { foo: 'bar' })
    })
})
