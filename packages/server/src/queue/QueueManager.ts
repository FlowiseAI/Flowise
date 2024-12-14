import { Queue, Worker, Job, QueueEvents } from 'bullmq'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'
import { DataSource } from 'typeorm'
import { executeFlow } from '../utils/buildChatflow'
import { IComponentNodes, IExecuteFlowParams } from '../Interface'
import { Telemetry } from '../utils/telemetry'
import { CachePool } from '../CachePool'
import { RedisEventPublisher } from './RedisEventPublisher'
import { ChatflowPool } from '../ChatflowPool'
import { executeUpsert } from '../utils/upsertVector'

dotenv.config()

const QUEUE_NAME = process.env.QUEUE_NAME || 'flowise-queue'
const WORKER_CONCURRENCY = process.env.WORKER_CONCURRENCY ? parseInt(process.env.WORKER_CONCURRENCY) : 300
const QUEUE_REDIS_EVENT_STREAM_MAX_LEN = process.env.QUEUE_REDIS_EVENT_STREAM_MAX_LEN
    ? parseInt(process.env.QUEUE_REDIS_EVENT_STREAM_MAX_LEN)
    : 10000

interface QueueManagerOptions {
    appDataSource?: DataSource
    telemetry?: Telemetry
    cachePool?: CachePool
    componentNodes?: IComponentNodes
    chatflowPool?: ChatflowPool
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
    private chatflowPool?: ChatflowPool

    private constructor(options?: QueueManagerOptions) {
        const host = process.env.QUEUE_REDIS_HOST
        const port = process.env.QUEUE_REDIS_PORT
        if (!host || !port) {
            throw new Error('Missing Redis host or port')
        }

        this.connection = {
            host,
            port: parseInt(port || '6379')
        }

        this.queue = new Queue(QUEUE_NAME, {
            connection: this.connection,
            streams: { events: { maxLen: QUEUE_REDIS_EVENT_STREAM_MAX_LEN } }
        })
        this.queueEvents = new QueueEvents(QUEUE_NAME, { connection: this.connection })
        this.redisPublisher = new RedisEventPublisher()
        this.redisPublisher.connect()
        this.appDataSource = options?.appDataSource
        this.telemetry = options?.telemetry
        this.cachePool = options?.cachePool
        this.componentNodes = options?.componentNodes || {}
        this.chatflowPool = options?.chatflowPool
    }

    public static getQueueName(): string {
        return process.env.QUEUE_NAME || 'flowise-queue'
    }

    public getConnection() {
        return this.connection
    }

    public static getInstance(options?: QueueManagerOptions): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager(options)
        }
        return QueueManager.instance
    }

    public createWorker(): Worker {
        const worker = new Worker(
            QUEUE_NAME,
            async (job: Job) => {
                console.log(`Worker processing job ${job.id}`)
                const result = await this.processJob(job.data)
                console.log(`Worker completed job ${job.id}`)
                return result
            },
            {
                connection: this.connection,
                concurrency: WORKER_CONCURRENCY
            }
        )
        return worker
    }

    public getQueueEvents(): QueueEvents {
        return this.queueEvents
    }

    public async addJob(jobData: Partial<IExecuteFlowParams>): Promise<Job> {
        if (!this.queue) throw new Error('Missing Redis host or port')
        console.log('Adding job')
        const jobId = jobData.chatId || uuidv4()
        const job = await this.queue.add(jobId, jobData, { removeOnFail: true })
        return job
    }

    public async getJobByName(jobName: string): Promise<Job> {
        if (!this.queue) throw new Error('Missing Redis host or port')
        const jobs = await this.queue.getJobs()
        const job = jobs.find((job) => job.name === jobName)
        if (!job) throw new Error(`Job name ${jobName} not found`)
        return job
    }

    public async getAllJobs(): Promise<Job[]> {
        if (!this.queue) throw new Error('Missing Redis host or port')
        const jobs = await this.queue.getJobs()
        return jobs
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

        if (this.chatflowPool) {
            const signal = new AbortController()
            const endingNodeData: any = { signal }
            this.chatflowPool.add(`${data.chatflow.id}_${data.chatId}`, endingNodeData, [])
            data.signal = signal
        }

        const result = data.isUpsert ? await executeUpsert(data) : await executeFlow(data)
        return result
    }
}
