import { InternalFlowiseError } from '../errors/internalFlowiseError'
import logger from '../utils/logger'
import { MODE } from '../Interface'
import { Redis } from 'ioredis'
import { StatusCodes } from 'http-status-codes'

export class RedisConnector {
    private redis: Redis
    private connection: Record<string, unknown>

    constructor() {
        let keepAlive: number =
            process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                : 0

        let tlsOptions: Record<string, unknown> =
            process.env.REDIS_TLS === 'true'
                ? {
                      cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
                      key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
                      ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined
                  }
                : {}

        switch (process.env.MODE) {
            case MODE.QUEUE:
                this.initializeQueueMode(keepAlive, tlsOptions)
                break
            case MODE.MAIN:
                logger.error(`[server]: MODE ${process.env.MODE} not implemented`)
                throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `[server]: MODE ${process.env.MODE} not implemented`)
                break
            default:
                logger.error(`[server]: Unrecognized MODE - ${process.env.MODE}`)
                throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Unrecognized MODE - ${process.env.MODE}`)
        }
    }

    /**
     * Connect to Redis in Queue mode.
     */
    private initializeQueueMode(keepAlive: number, tlsOptions: Record<string, unknown>) {
        if (process.env.REDIS_URL) {
            logger.info('[server] Queue mode using REDIS_URL.')
            // Disable `rejectUnauthorized` if `REDIS_URL` contains `rediss://` and TLS is not enforced
            tlsOptions.rejectUnauthorized = !(process.env.REDIS_URL.startsWith('rediss://') && process.env.REDIS_TLS !== 'true')
            this.connection = {
                keepAlive: keepAlive,
                tls: tlsOptions,
                enableReadyCheck: true,
                reconnectOnError: this.connectOnError.bind(this)
            }
            this.redis = new Redis(process.env.REDIS_URL, this.connection)
        } else if (process.env.REDIS_HOST) {
            logger.info('[server] Queue mode using REDIS_HOST.')
            this.connection = {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT || '6379'),
                username: process.env.REDIS_USERNAME || undefined,
                password: process.env.REDIS_PASSWORD || undefined,
                keepAlive: keepAlive,
                tls: tlsOptions,
                enableReadyCheck: true,
                reconnectOnError: this.connectOnError.bind(this)
            }
            this.redis = new Redis(this.connection)
        } else {
            logger.info('[server] Queue mode using localhost.')
            this.connection = {
                host: 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                username: process.env.REDIS_USERNAME || undefined,
                password: process.env.REDIS_PASSWORD || undefined,
                keepAlive: keepAlive,
                tls: tlsOptions,
                enableReadyCheck: true,
                reconnectOnError: this.connectOnError.bind(this)
            }
            this.redis = new Redis(this.connection)
        }
    }

    /**
     * Always reconnect to Redis in case of errors (does not retry the failed command), used as callback.
     * https://redis.github.io/ioredis/interfaces/CommonRedisOptions.html#reconnectOnError
     */
    private connectOnError(err: Error): number {
        logger.error(`[server]: Redis connection error - ${err.message}`)
        return 1
    }

    /**
     * Returns the Redis `ioredis` object created.
     */
    public getRedisClient(): Redis {
        return this.redis
    }

    /**
     * Returns the dictionary used to create the Redis `ioredis` object.
     */
    public getRedisConnection() {
        return this.connection
    }
}
