import { NextFunction, Request, Response } from 'express'
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit'
import { IChatFlow, MODE } from '../Interface'
import { Mutex } from 'async-mutex'
import { RedisStore } from 'rate-limit-redis'
import Redis from 'ioredis'

export class RateLimiterManager {
    private rateLimiters: Record<string, RateLimitRequestHandler> = {}
    private rateLimiterMutex: Mutex = new Mutex()
    private redisClient: Redis
    private static instance: RateLimiterManager

    constructor() {
        if (process.env.MODE === MODE.QUEUE) {
            this.redisClient = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                username: process.env.REDIS_USERNAME || undefined,
                password: process.env.REDIS_PASSWORD || undefined,
                tls:
                    process.env.REDIS_TLS === 'true'
                        ? {
                              cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
                              key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
                              ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined
                          }
                        : undefined
            })
        }
    }

    public static getInstance(): RateLimiterManager {
        if (!RateLimiterManager.instance) {
            RateLimiterManager.instance = new RateLimiterManager()
        }
        return RateLimiterManager.instance
    }

    public async addRateLimiter(id: string, duration: number, limit: number, message: string): Promise<void> {
        const release = await this.rateLimiterMutex.acquire()
        try {
            if (process.env.MODE === MODE.QUEUE) {
                this.rateLimiters[id] = rateLimit({
                    windowMs: duration * 1000,
                    max: limit,
                    standardHeaders: true,
                    legacyHeaders: false,
                    store: new RedisStore({
                        // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
                        sendCommand: (...args: string[]) => this.redisClient.call(...args)
                    }),
                    handler: (_, res) => {
                        res.status(429).send(message)
                    }
                })
            } else {
                this.rateLimiters[id] = rateLimit({
                    windowMs: duration * 1000,
                    max: limit,
                    handler: (_, res) => {
                        res.status(429).send(message)
                    }
                })
            }
        } finally {
            release()
        }
    }

    public removeRateLimiter(id: string): void {
        if (this.rateLimiters[id]) {
            delete this.rateLimiters[id]
        }
    }

    public getRateLimiter(): (req: Request, res: Response, next: NextFunction) => void {
        return (req: Request, res: Response, next: NextFunction) => {
            const id = req.params.id
            if (!this.rateLimiters[id]) return next()
            const idRateLimiter = this.rateLimiters[id]
            return idRateLimiter(req, res, next)
        }
    }

    public async updateRateLimiter(chatFlow: IChatFlow): Promise<void> {
        if (!chatFlow.apiConfig) return
        const apiConfig = JSON.parse(chatFlow.apiConfig)

        const rateLimit: { limitDuration: number; limitMax: number; limitMsg: string; status?: boolean } = apiConfig.rateLimit
        if (!rateLimit) return

        const { limitDuration, limitMax, limitMsg, status } = rateLimit
        if (status === false) {
            this.removeRateLimiter(chatFlow.id)
        } else if (limitMax && limitDuration && limitMsg) {
            await this.addRateLimiter(chatFlow.id, limitDuration, limitMax, limitMsg)
        }
    }

    public async initializeRateLimiters(chatflows: IChatFlow[]): Promise<void> {
        await Promise.all(
            chatflows.map(async (chatFlow) => {
                await this.updateRateLimiter(chatFlow)
            })
        )
    }
}
