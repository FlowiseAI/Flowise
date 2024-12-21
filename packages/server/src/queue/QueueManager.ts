import dotenv from 'dotenv'
import { BaseQueue } from './BaseQueue'
import { PredictionQueue } from './PredictionQueue'
import { UpsertQueue } from './UpsertQueue'
import { IComponentNodes } from '../Interface'
import { Telemetry } from '../utils/telemetry'
import { CachePool } from '../CachePool'
import { DataSource } from 'typeorm'
import { AbortControllerPool } from '../AbortControllerPool'

dotenv.config()

const QUEUE_NAME = process.env.QUEUE_NAME || 'flowise-queue'

type QUEUE_TYPE = 'prediction' | 'upsert'

export class QueueManager {
    private static instance: QueueManager
    private queues: Map<string, BaseQueue> = new Map()
    private connection: { host: string; port: number }

    private constructor() {
        const host = process.env.QUEUE_REDIS_HOST
        const port = process.env.QUEUE_REDIS_PORT

        if (!host || !port) {
            throw new Error('Missing Redis host or port')
        }

        this.connection = {
            host,
            port: parseInt(port)
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
        abortControllerPool
    }: {
        componentNodes: IComponentNodes
        telemetry: Telemetry
        cachePool: CachePool
        appDataSource: DataSource
        abortControllerPool: AbortControllerPool
    }) {
        const predictionQueueName = `${QUEUE_NAME}-prediction`
        const predictionQueue = new PredictionQueue(predictionQueueName, this.connection, {
            componentNodes,
            telemetry,
            cachePool,
            appDataSource,
            abortControllerPool
        })
        this.registerQueue('prediction', predictionQueue)

        const upsertionQueueName = `${QUEUE_NAME}-upsertion`
        const upsertionQueue = new UpsertQueue(upsertionQueueName, this.connection, {
            componentNodes,
            telemetry,
            cachePool,
            appDataSource
        })
        this.registerQueue('upsert', upsertionQueue)
    }
}
