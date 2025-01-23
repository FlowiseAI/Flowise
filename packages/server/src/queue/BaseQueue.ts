import { Queue, Worker, Job, QueueEvents, RedisOptions } from 'bullmq'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger'

const QUEUE_REDIS_EVENT_STREAM_MAX_LEN = process.env.QUEUE_REDIS_EVENT_STREAM_MAX_LEN
    ? parseInt(process.env.QUEUE_REDIS_EVENT_STREAM_MAX_LEN)
    : 10000
const WORKER_CONCURRENCY = process.env.WORKER_CONCURRENCY ? parseInt(process.env.WORKER_CONCURRENCY) : 100000

export abstract class BaseQueue {
    protected queue: Queue
    protected queueEvents: QueueEvents
    protected connection: RedisOptions
    private worker: Worker

    constructor(queueName: string, connection: RedisOptions) {
        this.connection = connection
        this.queue = new Queue(queueName, {
            connection: this.connection,
            streams: { events: { maxLen: QUEUE_REDIS_EVENT_STREAM_MAX_LEN } }
        })
        this.queueEvents = new QueueEvents(queueName, { connection: this.connection })
    }

    abstract processJob(data: any): Promise<any>

    abstract getQueueName(): string

    abstract getQueue(): Queue

    public getWorker(): Worker {
        return this.worker
    }

    public async addJob(jobData: any): Promise<Job> {
        const jobId = jobData.id || uuidv4()
        return await this.queue.add(jobId, jobData, { removeOnFail: true })
    }

    public createWorker(concurrency: number = WORKER_CONCURRENCY): Worker {
        this.worker = new Worker(
            this.queue.name,
            async (job: Job) => {
                const start = new Date().getTime()
                logger.info(`Processing job ${job.id} in ${this.queue.name} at ${new Date().toISOString()}`)
                const result = await this.processJob(job.data)
                const end = new Date().getTime()
                logger.info(`Completed job ${job.id} in ${this.queue.name} at ${new Date().toISOString()} (${end - start}ms)`)
                return result
            },
            {
                connection: this.connection,
                concurrency
            }
        )
        return this.worker
    }

    public async getJobs(): Promise<Job[]> {
        return await this.queue.getJobs()
    }

    public async getJobCounts(): Promise<{ [index: string]: number }> {
        return await this.queue.getJobCounts()
    }

    public async getJobByName(jobName: string): Promise<Job> {
        const jobs = await this.queue.getJobs()
        const job = jobs.find((job) => job.name === jobName)
        if (!job) throw new Error(`Job name ${jobName} not found`)
        return job
    }

    public getQueueEvents(): QueueEvents {
        return this.queueEvents
    }

    public async clearQueue(): Promise<void> {
        await this.queue.obliterate({ force: true })
    }
}
