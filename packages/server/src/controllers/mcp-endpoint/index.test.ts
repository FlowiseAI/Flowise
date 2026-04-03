/**
 * Unit tests for MCP endpoint controller (packages/server/src/controllers/mcp-endpoint/index.ts)
 *
 * Tests the Express request handlers: token extraction, auth enforcement,
 * rate limiter middleware delegation, and request routing to the service layer.
 */
import { Request, Response, NextFunction } from 'express'

// --- Mock setup ---
const mockHandleMcpRequest = jest.fn()
const mockHandleMcpDeleteRequest = jest.fn()

jest.mock('../../services/mcp-endpoint', () => ({
    __esModule: true,
    default: {
        handleMcpRequest: (...args: any[]) => mockHandleMcpRequest(...args),
        handleMcpDeleteRequest: (...args: any[]) => mockHandleMcpDeleteRequest(...args)
    }
}))

const mockGetRateLimiter = jest.fn().mockReturnValue((_req: any, _res: any, next: any) => next())

jest.mock('../../utils/rateLimit', () => ({
    RateLimiterManager: {
        getInstance: () => ({
            getRateLimiter: () => mockGetRateLimiter()
        })
    }
}))

jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}))

// Import after mocking
import mcpEndpointController from '.'

// Helper: create mock Express objects
function mockReq(overrides: Record<string, any> = {}): Request {
    return {
        params: { chatflowId: 'flow-123' },
        headers: {},
        query: {},
        get: jest.fn(),
        ...overrides
    } as unknown as Request
}

function mockRes(): Response {
    const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        locals: {}
    }
    return res as Response
}

function mockNext(): NextFunction {
    return jest.fn()
}

beforeEach(() => {
    jest.clearAllMocks()
})

describe('MCP Endpoint Controller', () => {
    describe('authenticateToken', () => {
        it('returns 401 when Authorization header is missing', () => {
            const req = mockReq({ headers: {} })
            const res = mockRes()
            const next = mockNext()

            mcpEndpointController.authenticateToken(req, res, next)

            expect(res.status).toHaveBeenCalledWith(401)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    jsonrpc: '2.0',
                    error: expect.objectContaining({ code: -32001 })
                })
            )
            expect(next).not.toHaveBeenCalled()
        })

        it('returns 401 when Authorization header is not Bearer', () => {
            const req = mockReq({ headers: { authorization: 'Basic dXNlcjpwYXNz' } })
            const res = mockRes()
            const next = mockNext()

            mcpEndpointController.authenticateToken(req, res, next)

            expect(res.status).toHaveBeenCalledWith(401)
            expect(next).not.toHaveBeenCalled()
        })

        it('returns 401 when Bearer token is empty', () => {
            const req = mockReq({ headers: { authorization: 'Bearer ' } })
            const res = mockRes()
            const next = mockNext()

            mcpEndpointController.authenticateToken(req, res, next)

            expect(res.status).toHaveBeenCalledWith(401)
            expect(next).not.toHaveBeenCalled()
        })

        it('sets res.locals.token and calls next on valid Bearer token', () => {
            const req = mockReq({ headers: { authorization: 'Bearer my-secret-token' } })
            const res = mockRes()
            const next = mockNext()

            mcpEndpointController.authenticateToken(req, res, next)

            expect(res.locals.token).toBe('my-secret-token')
            expect(next).toHaveBeenCalled()
            expect(res.status).not.toHaveBeenCalled()
        })
    })

    describe('handlePost', () => {
        it('calls service with chatflowId and token from res.locals.token', async () => {
            const req = mockReq({ params: { chatflowId: 'flow-123' } })
            const res = mockRes()
            res.locals.token = 'my-secret-token'
            const next = mockNext()
            mockHandleMcpRequest.mockResolvedValue(undefined)

            await mcpEndpointController.handlePost(req, res, next)

            expect(mockHandleMcpRequest).toHaveBeenCalledWith('flow-123', 'my-secret-token', req, res)
        })

        it('calls next(error) on unexpected errors', async () => {
            const req = mockReq({ params: { chatflowId: 'flow-123' } })
            const res = mockRes()
            res.locals.token = 'token'
            const next = mockNext()
            const error = new Error('Unexpected')
            mockHandleMcpRequest.mockRejectedValue(error)

            await mcpEndpointController.handlePost(req, res, next)

            expect(next).toHaveBeenCalledWith(error)
        })
    })

    describe('handleDelete', () => {
        it('delegates to handleMcpDeleteRequest with chatflowId', async () => {
            const req = mockReq({ params: { chatflowId: 'flow-789' } })
            const res = mockRes()
            const next = mockNext()
            mockHandleMcpDeleteRequest.mockResolvedValue(undefined)

            await mcpEndpointController.handleDelete(req, res, next)

            expect(mockHandleMcpDeleteRequest).toHaveBeenCalledWith('flow-789', req, res)
        })
    })

    describe('getRateLimiterMiddleware', () => {
        it('delegates to RateLimiterManager', async () => {
            const req = mockReq()
            const res = mockRes()
            const next = mockNext()

            await mcpEndpointController.getRateLimiterMiddleware(req, res, next)

            expect(mockGetRateLimiter).toHaveBeenCalled()
        })
    })
})
