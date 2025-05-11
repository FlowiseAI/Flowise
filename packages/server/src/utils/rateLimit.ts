import { NextFunction, Request, Response } from 'express'
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit'
import { IChatFlow, MODE } from '../Interface'
import { Mutex } from 'async-mutex'
import { RedisStore } from 'rate-limit-redis'
import Redis from 'ioredis'
import { QueueEvents, QueueEventsListener, QueueEventsProducer } from 'bullmq'

interface CustomListener extends QueueEventsListener {
    updateRateLimiter: (args: { limitDuration: number; limitMax: number; limitMsg: string; id: string }) => void
}

const QUEUE_NAME = 'ratelimit'
const QUEUE_EVENT_NAME = 'updateRateLimiter'

export class RateLimiterManager {
    private rateLimiters: Record<string, RateLimitRequestHandler> = {}
    private rateLimiterMutex: Mutex = new Mutex()
    private redisClient: Redis
    private static instance: RateLimiterManager
    private queueEventsProducer: QueueEventsProducer
    private queueEvents: QueueEvents

    constructor() {
        if (process.env.MODE === MODE.QUEUE) {
            if (process.env.REDIS_URL) {
                this.redisClient = new Redis(process.env.REDIS_URL, {
                    keepAlive:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                })
            } else {
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
                            : undefined,
                    keepAlive:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                })
            }
            this.queueEventsProducer = new QueueEventsProducer(QUEUE_NAME, { connection: this.getConnection() })
            this.queueEvents = new QueueEvents(QUEUE_NAME, { connection: this.getConnection() })
        }
    }

    getConnection() {
        let tlsOpts = undefined
        if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('rediss://')) {
            tlsOpts = {
                rejectUnauthorized: false
            }
        } else if (process.env.REDIS_TLS === 'true') {
            tlsOpts = {
                cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
                key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
                ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined
            }
        }
        return {
            url: process.env.REDIS_URL || undefined,
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            username: process.env.REDIS_USERNAME || undefined,
            password: process.env.REDIS_PASSWORD || undefined,
            tls: tlsOpts,
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
            keepAlive:
                process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                    ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                    : undefined
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
                    message,
                    store: new RedisStore({
                        prefix: `rl:${id}`,
                        // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
                        sendCommand: (...args: string[]) => this.redisClient.call(...args)
                    })
                })
            } else {
                this.rateLimiters[id] = rateLimit({
                    windowMs: duration * 1000,
                    max: limit,
                    message
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

    public async updateRateLimiter(chatFlow: IChatFlow, isInitialized?: boolean): Promise<void> {
        if (!chatFlow.apiConfig) return
        const apiConfig = JSON.parse(chatFlow.apiConfig)

        const rateLimit: { limitDuration: number; limitMax: number; limitMsg: string; status?: boolean } = apiConfig.rateLimit
        if (!rateLimit) return

        const { limitDuration, limitMax, limitMsg, status } = rateLimit

        if (!isInitialized && process.env.MODE === MODE.QUEUE && this.queueEventsProducer) {
            await this.queueEventsProducer.publishEvent({
                eventName: QUEUE_EVENT_NAME,
                limitDuration,
                limitMax,
                limitMsg,
                id: chatFlow.id
            })
        } else {
            if (status === false) {
                this.removeRateLimiter(chatFlow.id)
            } else if (limitMax && limitDuration && limitMsg) {
                await this.addRateLimiter(chatFlow.id, limitDuration, limitMax, limitMsg)
            }
        }
    }

    public async initializeRateLimiters(chatflows: IChatFlow[]): Promise<void> {
        await Promise.all(
            chatflows.map(async (chatFlow) => {
                await this.updateRateLimiter(chatFlow, true)
            })
        )

        if (process.env.MODE === MODE.QUEUE && this.queueEvents) {
            this.queueEvents.on<CustomListener>(
                QUEUE_EVENT_NAME,
                async ({
                    limitDuration,
                    limitMax,
                    limitMsg,
                    id
                }: {
                    limitDuration: number
                    limitMax: number
                    limitMsg: string
                    id: string
                }) => {
                    await this.addRateLimiter(id, limitDuration, limitMax, limitMsg)
                }
            )
        }
    }
}
