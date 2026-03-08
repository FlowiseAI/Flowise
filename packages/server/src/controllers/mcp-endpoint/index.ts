import { NextFunction, Request, Response } from 'express'
import mcpEndpointService from '../../services/mcp-server/endpoint'
import { RateLimiterManager } from '../../utils/rateLimit'
import logger from '../../utils/logger'

/**
 * Extract token from the Authorization: Bearer <token> header.
 * Returns null if not present or malformed.
 */
function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null
    const token = authHeader.slice(7).trim()
    return token.length > 0 ? token : null
}

/**
 * Authentication middleware — validates Bearer token and attaches it to res.locals.
 */
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req)
    if (!token) {
        res.status(401).json({
            jsonrpc: '2.0',
            error: { code: -32001, message: 'Unauthorized: missing or invalid Authorization header. Use Bearer <token>.' },
            id: null
        })
        return
    }
    res.locals.token = token
    next()
}

/**
 * Rate limiter middleware for MCP endpoint — reuses per-chatflow rate limiters.
 */
const getRateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return RateLimiterManager.getInstance().getRateLimiter()(req, res, next)
    } catch (error) {
        next(error)
    }
}

/**
 * Handle POST /api/v1/mcp/chatflow/:chatflowId — MCP JSON-RPC messages
 * Auth: token must be in Authorization: Bearer <token> header
 */
const handlePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { chatflowId } = req.params
        const token = res.locals.token as string

        logger.debug(`[MCP] POST request for chatflow: ${chatflowId}`)
        await mcpEndpointService.handleMcpRequest(chatflowId, token, req, res)
    } catch (error) {
        next(error)
    }
}

/**
 * Handle GET /api/v1/mcp/chatflow/:chatflowId/sse — SSE stream (deprecated transport)
 * Auth: token must be in Authorization: Bearer <token> header
 */
const handleGet = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { chatflowId } = req.params
        const token = res.locals.token as string

        logger.debug(`[MCP] GET SSE request for chatflow: ${chatflowId}`)
        await mcpEndpointService.handleMcpSseRequest(chatflowId, token, req, res)
    } catch (error) {
        next(error)
    }
}

/**
 * Handle POST /api/v1/mcp/chatflow/:chatflowId/messages?sessionId=... — SSE message relay
 * Auth: token must be in Authorization: Bearer <token> header
 */
const handleSseMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { chatflowId } = req.params
        const token = res.locals.token as string

        const sessionId = req.query.sessionId as string
        if (!sessionId) {
            res.status(400).json({
                jsonrpc: '2.0',
                error: { code: -32600, message: 'Missing required query parameter: sessionId' },
                id: null
            })
            return
        }

        logger.debug(`[MCP] POST SSE message for chatflow: ${chatflowId}, session: ${sessionId}`)
        await mcpEndpointService.handleMcpSseMessageRequest(chatflowId, token, sessionId, req, res)
    } catch (error) {
        next(error)
    }
}

/**
 * Handle DELETE /api/v1/mcp/chatflow/:chatflowId — Session termination
 */
const handleDelete = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { chatflowId } = req.params
        await mcpEndpointService.handleMcpDeleteRequest(chatflowId, req, res)
    } catch (error) {
        next(error)
    }
}

export default {
    authenticateToken,
    handlePost,
    handleGet,
    handleSseMessage,
    handleDelete,
    getRateLimiterMiddleware
}
