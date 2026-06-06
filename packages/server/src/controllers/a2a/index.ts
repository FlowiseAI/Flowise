import { NextFunction, Request, Response } from 'express'
import a2aService from '../../services/a2a'
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
 * If A2A_AUTH_DISABLED env var is set to 'true', authentication is bypassed.
 */
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.A2A_AUTH_DISABLED === 'true') {
        next()
        return
    }

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
 * Rate limiter middleware for A2A endpoint.
 */
const getRateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return RateLimiterManager.getInstance().getRateLimiter()(req, res, next)
    } catch (error) {
        next(error)
    }
}

/**
 * Handle GET /.well-known/agent-card.json for a specific chatflow.
 * This is the A2A agent discovery endpoint.
 */
const handleAgentCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { chatflowId } = req.params
        logger.debug(`[A2A] AgentCard request for chatflow: ${chatflowId}`)
        await a2aService.handleAgentCard(chatflowId, req, res)
    } catch (error) {
        next(error)
    }
}

/**
 * Handle POST /api/v1/a2a/:chatflowId — A2A JSON-RPC messages.
 * Handles: tasks/send, tasks/sendSubscribe, tasks/get, tasks/cancel, agent/card
 */
const handlePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { chatflowId } = req.params
        logger.debug(`[A2A] JSON-RPC request for chatflow: ${chatflowId}`)
        await a2aService.handleJsonRpc(chatflowId, req, res)
    } catch (error) {
        next(error)
    }
}

/**
 * Handle OPTIONS preflight requests for A2A endpoints.
 */
const handleOptions = async (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Max-Age', '86400')
    res.status(204).end()
}

export default {
    authenticateToken,
    handleAgentCard,
    handlePost,
    handleOptions,
    getRateLimiterMiddleware
}
