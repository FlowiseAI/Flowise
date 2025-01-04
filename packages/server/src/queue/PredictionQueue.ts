import dotenv from 'dotenv'
import { DataSource } from 'typeorm'
import { executeFlow } from '../utils/buildChatflow'
import { IComponentNodes, IExecuteFlowParams } from '../Interface'
import { Telemetry } from '../utils/telemetry'
import { CachePool } from '../CachePool'
import { RedisEventPublisher } from './RedisEventPublisher'
import { AbortControllerPool } from '../AbortControllerPool'
import { BaseQueue } from './BaseQueue'
import { RedisOptions } from 'bullmq'

dotenv.config()

interface PredictionQueueOptions {
    appDataSource: DataSource
    telemetry: Telemetry
    cachePool: CachePool
    componentNodes: IComponentNodes
    abortControllerPool: AbortControllerPool
}

export class PredictionQueue extends BaseQueue {
    private componentNodes: IComponentNodes
    private telemetry: Telemetry
    private cachePool: CachePool
    private appDataSource: DataSource
    private abortControllerPool: AbortControllerPool
    private redisPublisher: RedisEventPublisher
    private queueName: string

    constructor(name: string, connection: RedisOptions, options: PredictionQueueOptions) {
        super(name, connection)
        this.queueName = name
        this.componentNodes = options.componentNodes || {}
        this.telemetry = options.telemetry
        this.cachePool = options.cachePool
        this.appDataSource = options.appDataSource
        this.abortControllerPool = options.abortControllerPool
        this.redisPublisher = new RedisEventPublisher()
        this.redisPublisher.connect()
    }

    public getQueueName() {
        return this.queueName
    }

    public getQueue() {
        return this.queue
    }

    async processJob(data: IExecuteFlowParams) {
        if (this.appDataSource) data.appDataSource = this.appDataSource
        if (this.telemetry) data.telemetry = this.telemetry
        if (this.cachePool) data.cachePool = this.cachePool
        if (this.componentNodes) data.componentNodes = this.componentNodes
        if (this.redisPublisher) data.sseStreamer = this.redisPublisher

        if (this.abortControllerPool) {
            const signal = new AbortController()
            this.abortControllerPool.add(`${data.chatflow.id}_${data.chatId}`, signal)
            data.signal = signal
        }

        return await executeFlow(data)
    }
}
