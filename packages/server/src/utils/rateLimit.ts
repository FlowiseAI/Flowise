import { NextFunction, Request, Response } from 'express'
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit'
import { IChatFlow } from '../Interface'
import { Mutex } from 'async-mutex'

let rateLimiters: Record<string, RateLimitRequestHandler> = {}
const rateLimiterMutex = new Mutex()

async function addRateLimiter(id: string, duration: number, limit: number, message: string) {
    const release = await rateLimiterMutex.acquire()
    try {
        rateLimiters[id] = rateLimit({
            windowMs: duration * 1000,
            max: limit,
            handler: (_, res) => {
                res.status(429).send(message)
            }
        })
    } finally {
        release()
    }
}

function removeRateLimit(id: string) {
    if (rateLimiters[id]) {
        delete rateLimiters[id]
    }
}

export function getRateLimiter(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id
    if (!rateLimiters[id]) return next()
    const idRateLimiter = rateLimiters[id]
    return idRateLimiter(req, res, next)
}

export async function updateRateLimiter(chatFlow: IChatFlow) {
    if (!chatFlow.apiConfig) return
    const apiConfig = JSON.parse(chatFlow.apiConfig)

    const rateLimit: { limitDuration: number; limitMax: number; limitMsg: string; status?: boolean } = apiConfig.rateLimit
    if (!rateLimit) return

    const { limitDuration, limitMax, limitMsg, status } = rateLimit
    if (status === false) removeRateLimit(chatFlow.id)
    else if (limitMax && limitDuration && limitMsg) await addRateLimiter(chatFlow.id, limitDuration, limitMax, limitMsg)
}

export async function initializeRateLimiter(chatFlowPool: IChatFlow[]) {
    await Promise.all(
        chatFlowPool.map(async (chatFlow) => {
            await updateRateLimiter(chatFlow)
        })
    )
}
