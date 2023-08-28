import { NextFunction, Request, Response } from 'express'
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit'

interface RateLimit {
    id: string
    rateLimitObj: RateLimitRequestHandler
}

export const specificRouteLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: 1 * 60 * 1000, // 15 minutes
    max: 1, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.'
})

let rateLimiters: RateLimit[] = []

export function createRateLimiter(req: Request) {
    const id = req.body.id
    const duration = req.body.duration
    const limit = req.body.limit
    const message = req.body.message

    const rateLimitObj: RateLimitRequestHandler = rateLimit({
        windowMs: Number(duration),
        max: limit,
        handler: (req, res) => {
            res.status(429).json({ error: message })
        }
    })

    const existingIndex: number = rateLimiters.findIndex((rateLimit) => rateLimit.id === id)

    if (existingIndex === -1) {
        rateLimiters.push({
            id,
            rateLimitObj
        })
    } else {
        rateLimiters[existingIndex] = {
            id,
            rateLimitObj
        }
    }
}

export function getRateLimiter(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id

    const ratelimiter = rateLimiters.find((rateLimit) => rateLimit.id === id)

    if (!ratelimiter) return next()

    const idRateLimiter = ratelimiter.rateLimitObj

    return idRateLimiter(req, res, next)
}
