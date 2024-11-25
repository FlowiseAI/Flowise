import { Queue, Worker, Job, QueueEvents } from 'bullmq'
import dotenv from 'dotenv'
import { DataSource } from 'typeorm'
import { executeFlow } from '../utils/buildChatflow'
import { IComponentNodes, IExecuteFlowParams } from '../Interface'
import { Telemetry } from '../utils/telemetry'
import { CachePool } from '../CachePool'
import { RedisEventPublisher } from './RedisEventPublisher'

dotenv.config()

interface QueueManagerOptions {
    appDataSource?: DataSource
    telemetry?: Telemetry
    cachePool?: CachePool
    componentNodes?: IComponentNodes
}

export class QueueManager {
    private static instance: QueueManager
    private queue: Queue
    private queueEvents: QueueEvents

    private connection: { host: string; port: number }
    private redisPublisher: RedisEventPublisher
    private componentNodes?: IComponentNodes = {}
    private telemetry?: Telemetry
    private cachePool?: CachePool
    private appDataSource?: DataSource

    private constructor(options?: QueueManagerOptions) {
        const host = process.env.REDIS_HOST
        const port = process.env.REDIS_PORT
        if (!host || !port) {
            throw new Error('Missing Redis host or port')
        }

        this.connection = {
            host,
            port: parseInt(port || '6379')
        }
        this.queue = new Queue(process.env.QUEUE_NAME || 'example-queue', { connection: this.connection })
        this.queueEvents = new QueueEvents(process.env.QUEUE_NAME || 'example-queue', { connection: this.connection })
        this.redisPublisher = new RedisEventPublisher()
        this.redisPublisher.connect()
        this.appDataSource = options?.appDataSource
        this.telemetry = options?.telemetry
        this.cachePool = options?.cachePool
        this.componentNodes = options?.componentNodes || {}
    }

    public static getInstance(options?: QueueManagerOptions): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager(options)
        }
        return QueueManager.instance
    }

    public createWorker(): Worker {
        const worker = new Worker(
            process.env.QUEUE_NAME || 'example-queue',
            async (job: Job) => {
                console.log(`Worker processing job ${job.id}`)
                const result = await this.processJob(job.data)
                console.log(`Worker completed job ${job.id}`)

                return result
            },
            { connection: this.connection }
        )
        return worker
    }

    public getQueueEvents(): QueueEvents {
        return this.queueEvents
    }

    public async addJob(jobData: Partial<IExecuteFlowParams>): Promise<Job> {
        if (!this.queue) throw new Error('Missing Redis host or port')
        console.log('Adding job')
        const job = await this.queue.add(jobData!.flowConfig!.chatId, jobData, { removeOnFail: true })
        return job
    }

    public async getJob(jobId: string): Promise<Job> {
        if (!this.queue) throw new Error('Missing Redis host or port')
        const job = await this.queue.getJob(jobId)
        if (!job) throw new Error(`Job ${jobId} not found`)
        return job
    }

    public async getJobCounts(): Promise<{ [index: string]: number }> {
        if (!this.queue) throw new Error('Missing Redis host or port')
        return await this.queue.getJobCounts()
    }

    public async clearQueue(): Promise<void> {
        if (!this.queue) throw new Error('Missing Redis host or port')
        await this.queue.obliterate({ force: true })
    }

    private async processJob(data: IExecuteFlowParams) {
        if (this.appDataSource) data.appDataSource = this.appDataSource
        if (this.telemetry) data.telemetry = this.telemetry
        if (this.cachePool) data.cachePool = this.cachePool
        if (this.componentNodes) data.componentNodes = this.componentNodes
        if (this.redisPublisher) data.sseStreamer = this.redisPublisher
        const result = await executeFlow(data)
        return result
    }
}
