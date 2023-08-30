import { NextFunction, Request, Response } from 'express'
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit'
import { IChatFlow } from '../Interface'
import { Mutex } from 'async-mutex'

let rateLimiters: Record<string, RateLimitRequestHandler> = {}
const rateLimiterMutex = new Mutex()

export async function createRateLimiter(id: string, duration: number, limit: number, message: string) {
    const release = await rateLimiterMutex.acquire()
    try {
        rateLimiters[id] = rateLimit({
            windowMs: duration,
            max: limit,
            handler: (req, res) => {
                res.status(429).send(message)
            }
        })
    } finally {
        release()
    }
}

export function getRateLimiter(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id

    if (!rateLimiters[id]) return next()

    const idRateLimiter = rateLimiters[id]

    return idRateLimiter(req, res, next)
}

export async function initializeRateLimiter(ChatFlowPool: IChatFlow[]) {
    await ChatFlowPool.map(async (ChatFlow) => {
        if (ChatFlow.rateLimitDuration && ChatFlow.rateLimit && ChatFlow.rateLimitMsg)
            await createRateLimiter(ChatFlow.id, ChatFlow.rateLimitDuration, ChatFlow.rateLimit, ChatFlow.rateLimitMsg)
    })
}
