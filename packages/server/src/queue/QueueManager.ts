import { BaseQueue } from './BaseQueue'
import { PredictionQueue } from './PredictionQueue'
import { UpsertQueue } from './UpsertQueue'
import { IComponentNodes } from '../Interface'
import { Telemetry } from '../utils/telemetry'
import { CachePool } from '../CachePool'
import { DataSource } from 'typeorm'
import { AbortControllerPool } from '../AbortControllerPool'
import { QueueEventsProducer, RedisOptions } from 'bullmq'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { Express } from 'express'
import { UsageCacheManager } from '../UsageCacheManager'
import { ExpressAdapter } from '@bull-board/express'

const QUEUE_NAME = process.env.QUEUE_NAME || 'flowise-queue'

// Redis resilience configuration with environment variable support
const REDIS_CONNECT_TIMEOUT = process.env.REDIS_CONNECT_TIMEOUT ? parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) : 10000
const REDIS_COMMAND_TIMEOUT = process.env.REDIS_COMMAND_TIMEOUT ? parseInt(process.env.REDIS_COMMAND_TIMEOUT, 10) : 30000
const REDIS_MAX_RETRIES_PER_REQUEST = process.env.REDIS_MAX_RETRIES_PER_REQUEST ? parseInt(process.env.REDIS_MAX_RETRIES_PER_REQUEST, 10) : 3
const REDIS_LAZY_CONNECT = process.env.REDIS_LAZY_CONNECT === 'false' ? false : true
const REDIS_KEEPALIVE_INTERVAL = process.env.REDIS_KEEPALIVE_INTERVAL ? parseInt(process.env.REDIS_KEEPALIVE_INTERVAL, 10) : 30000

type QUEUE_TYPE = 'prediction' | 'upsert'

export class QueueManager {
    private static instance: QueueManager
    private queues: Map<string, BaseQueue> = new Map()
    private connection: RedisOptions
    private bullBoardRouter?: Express
    private predictionQueueEventsProducer?: QueueEventsProducer

    private constructor() {
        if (process.env.REDIS_URL) {
            let tlsOpts = undefined
            if (process.env.REDIS_URL.startsWith('rediss://')) {
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
                url: process.env.REDIS_URL,
                tls: tlsOpts,
                enableReadyCheck: true,
                keepAlive:
                    process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                        ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                        : REDIS_KEEPALIVE_INTERVAL,
                // Enhanced resilience settings
                connectTimeout: REDIS_CONNECT_TIMEOUT,
                commandTimeout: REDIS_COMMAND_TIMEOUT,
                maxRetriesPerRequest: REDIS_MAX_RETRIES_PER_REQUEST,
                lazyConnect: REDIS_LAZY_CONNECT
            }
        } else {
            let tlsOpts = undefined
            if (process.env.REDIS_TLS === 'true') {
                tlsOpts = {
                    cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
                    key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
                    ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined
                }
            }
            this.connection = {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                username: process.env.REDIS_USERNAME || undefined,
                password: process.env.REDIS_PASSWORD || undefined,
                tls: tlsOpts,
                enableReadyCheck: true,
                keepAlive:
                    process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                        ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                        : REDIS_KEEPALIVE_INTERVAL,
                // Enhanced resilience settings
                connectTimeout: REDIS_CONNECT_TIMEOUT,
                commandTimeout: REDIS_COMMAND_TIMEOUT,
                maxRetriesPerRequest: REDIS_MAX_RETRIES_PER_REQUEST,
                lazyConnect: REDIS_LAZY_CONNECT
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

    public getPredictionQueueEventsProducer(): QueueEventsProducer {
        if (!this.predictionQueueEventsProducer) throw new Error('Prediction queue events producer not found')
        return this.predictionQueueEventsProducer
    }

    public getBullBoardRouter(): Express {
        if (!this.bullBoardRouter) throw new Error('BullBoard router not found')
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
        usageCacheManager,
        serverAdapter
    }: {
        componentNodes: IComponentNodes
        telemetry: Telemetry
        cachePool: CachePool
        appDataSource: DataSource
        abortControllerPool: AbortControllerPool
        usageCacheManager: UsageCacheManager
        serverAdapter?: ExpressAdapter
    }) {
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

        if (serverAdapter) {
            createBullBoard({
                queues: [new BullMQAdapter(predictionQueue.getQueue()), new BullMQAdapter(upsertionQueue.getQueue())],
                serverAdapter: serverAdapter
            })
            this.bullBoardRouter = serverAdapter.getRouter()
        }
    }
}
