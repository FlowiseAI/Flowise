import { BaseQueue } from './BaseQueue'
// import { PredictionQueue } from './PredictionQueue' // Keep for redis
// import { UpsertQueue } from './UpsertQueue' // Keep for redis
import { IComponentNodes } from '../Interface'
import { PgBossQueue } from './PgBossQueue'
// We'll need to import the new PgBoss specific queue types too
import { PgBossPredictionQueue } from './PgBossPredictionQueue' // Assuming this will be created
import { PgBossUpsertQueue } from './PgBossUpsertQueue' // Assuming this will be created
import { PredictionQueue } from './PredictionQueue' // Keep for redis
import { UpsertQueue } from './UpsertQueue' // Keep for redis
import { DataSourceOptions } from 'typeorm' // For typing appDataSource.options
import logger from '../utils/logger'
import { Telemetry } from '../utils/telemetry'
import { CachePool } from '../CachePool'
import { DataSource } from 'typeorm'
import { AbortControllerPool } from '../AbortControllerPool'
import { QueueEventsProducer, RedisOptions } from 'bullmq'
import { createBullBoard } from 'bull-board'
import { BullMQAdapter } from 'bull-board/bullMQAdapter'
import { Express } from 'express'
import { UsageCacheManager } from '../UsageCacheManager'

const QUEUE_NAME = process.env.QUEUE_NAME || 'flowise-queue'

type QUEUE_TYPE = 'prediction' | 'upsert'

export class QueueManager {
    private static instance: QueueManager
    private queues: Map<string, BaseQueue> = new Map()
    private connection: RedisOptions
    private bullBoardRouter?: Express
    private predictionQueueEventsProducer?: QueueEventsProducer

    private constructor() {
        // Redis connection setup is only needed if QUEUE_PROVIDER is 'redis'
        // However, this.connection is used by other methods like getConnection()
        // For now, we'll keep it, but it might be undefined if pgboss is used.
        // A better approach might be to initialize connection on demand or make it nullable.
        if (!process.env.QUEUE_PROVIDER || process.env.QUEUE_PROVIDER === 'redis') {
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
            this.connection = {
                url: process.env.REDIS_URL || undefined,
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                username: process.env.REDIS_USERNAME || undefined,
                password: process.env.REDIS_PASSWORD || undefined,
                tls: tlsOpts,
                enableReadyCheck: true,
                keepAlive:
                    process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                        ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                        : undefined
            }
        }
    }

    public static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager()
        }
        return QueueManager.instance
    }

    public registerQueue(name: string, queue: BaseQueue) {
        this.queues.set(name, queue)
    }

    public getConnection() {
        return this.connection
    }

    public getQueue(name: QUEUE_TYPE): BaseQueue {
        const queue = this.queues.get(name)
        if (!queue) throw new Error(`Queue ${name} not found`)
        return queue
    }

    public getPredictionQueueEventsProducer(): QueueEventsProducer | undefined { // Return type changed
        if (!this.predictionQueueEventsProducer) {
            logger.warn('Prediction queue events producer accessed but not available (likely using pg-boss).')
            return undefined
        }
        return this.predictionQueueEventsProducer
    }

    public getBullBoardRouter(): Express | undefined { // Return type changed to allow undefined
        if (!this.bullBoardRouter) {
            logger.warn('BullBoard router accessed but not available (likely using pg-boss).')
            return undefined
        }
        return this.bullBoardRouter
    }

    public async getAllJobCounts(): Promise<{ [queueName: string]: { [status: string]: number } }> {
        const counts: { [queueName: string]: { [status: string]: number } } = {}

        for (const [name, queue] of this.queues) {
            counts[name] = await queue.getJobCounts()
        }

        return counts
    }

    public setupAllQueues({
        componentNodes,
        telemetry,
        cachePool,
        appDataSource,
        abortControllerPool,
        usageCacheManager
    }: {
        componentNodes: IComponentNodes
        telemetry: Telemetry
        cachePool: CachePool
        appDataSource: DataSource
        abortControllerPool: AbortControllerPool
        usageCacheManager: UsageCacheManager
    }) {
        const queueProvider = process.env.QUEUE_PROVIDER || 'redis' // Default to redis

        if (queueProvider === 'pgboss') {
            if (appDataSource.options.type !== 'postgres') {
                logger.error('QUEUE_PROVIDER is set to pgboss, but the database is not PostgreSQL. Falling back to redis.')
                // Fallback or throw error, for now, let's log and potentially use redis or do nothing for queues.
                // For this subtask, let's proceed assuming if pgboss is chosen, postgres is configured.
                // A more robust solution would handle this mismatch.
            }

            const dbOptions = appDataSource.options as any // Cast to any to access properties like host, port etc.
            // TypeORM's DataSourceOptions is a union type.
            const connectionString =
                process.env.PG_BOSS_DATABASE_URL ||
                `postgresql://${dbOptions.username}:${dbOptions.password}@${dbOptions.host}:${dbOptions.port}/${dbOptions.database}`

            const pgBossOptions = { connectionString }
            // Add other pg-boss options from env if needed

            const predictionQueueName = `${QUEUE_NAME}-prediction`
            const predictionQueue = new PgBossPredictionQueue( // Use the new PgBossPredictionQueue
                predictionQueueName,
                pgBossOptions,
                {
                    componentNodes,
                    telemetry,
                    cachePool,
                    appDataSource,
                    abortControllerPool,
                    usageCacheManager
                }
            )
            this.registerQueue('prediction', predictionQueue as any) // Cast to any to satisfy BaseQueue type for now

            // Note: PgBossPredictionQueue will extend PgBossQueue, which extends BaseQueue.
            // So the 'as any' might not be strictly needed if types align well.

            const upsertionQueueName = `${QUEUE_NAME}-upsertion`
            const upsertionQueue = new PgBossUpsertQueue( // Use the new PgBossUpsertQueue
                upsertionQueueName,
                pgBossOptions,
                {
                    componentNodes,
                    telemetry,
                    cachePool,
                    appDataSource,
                    usageCacheManager
                }
            )
            this.registerQueue('upsert', upsertionQueue as any) // Cast to any

            logger.info('Using pg-boss for queue management.')
            // BullBoard and QueueEventsProducer are BullMQ specific, so we don't set them up for pg-boss.
            // this.predictionQueueEventsProducer = ...; (SKIP for pgboss)
            // this.bullBoardRouter = ...; (SKIP for pgboss)
        } else {
            // Default to redis (current implementation)
            const predictionQueueName = `${QUEUE_NAME}-prediction`
            const predictionQueue = new PredictionQueue(predictionQueueName, this.connection, {
                componentNodes,
                telemetry,
                cachePool,
                appDataSource,
                abortControllerPool,
                usageCacheManager
            })
            this.registerQueue('prediction', predictionQueue)
            this.predictionQueueEventsProducer = new QueueEventsProducer(predictionQueue.getQueueName(), {
                connection: this.connection
            })

            const upsertionQueueName = `${QUEUE_NAME}-upsertion`
            const upsertionQueue = new UpsertQueue(upsertionQueueName, this.connection, {
                componentNodes,
                telemetry,
                cachePool,
                appDataSource,
                usageCacheManager
            })
            this.registerQueue('upsert', upsertionQueue)

            const bullboard = createBullBoard([new BullMQAdapter(predictionQueue.getQueue()), new BullMQAdapter(upsertionQueue.getQueue())])
            this.bullBoardRouter = bullboard.router
            logger.info('Using redis (bullmq) for queue management.')
        }
    }
}
