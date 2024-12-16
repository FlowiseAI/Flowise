import { Queue, Worker, Job, QueueEvents } from 'bullmq'
import { v4 as uuidv4 } from 'uuid'

const QUEUE_REDIS_EVENT_STREAM_MAX_LEN = process.env.QUEUE_REDIS_EVENT_STREAM_MAX_LEN
    ? parseInt(process.env.QUEUE_REDIS_EVENT_STREAM_MAX_LEN)
    : 10000
const WORKER_CONCURRENCY = process.env.WORKER_CONCURRENCY ? parseInt(process.env.WORKER_CONCURRENCY) : 300

export abstract class BaseQueue {
    protected queue: Queue
    protected queueEvents: QueueEvents
    protected connection: { host: string; port: number }

    constructor(queueName: string, connection: { host: string; port: number }) {
        this.connection = connection
        this.queue = new Queue(queueName, {
            connection: this.connection,
            streams: { events: { maxLen: QUEUE_REDIS_EVENT_STREAM_MAX_LEN } }
        })
        this.queueEvents = new QueueEvents(queueName, { connection: this.connection })
    }

    abstract processJob(data: any): Promise<any>

    abstract getQueueName(): string

    public async addJob(jobData: any): Promise<Job> {
        const jobId = jobData.id || uuidv4()
        return await this.queue.add(jobId, jobData, { removeOnFail: true })
    }

    public createWorker(concurrency: number = WORKER_CONCURRENCY): Worker {
        return new Worker(
            this.queue.name,
            async (job: Job) => {
                console.log(`Processing job ${job.id} in ${this.queue.name}`)
                const result = await this.processJob(job.data)
                console.log(`Completed job ${job.id} in ${this.queue.name}`)
                return result
            },
            {
                connection: this.connection,
                concurrency
            }
        )
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
