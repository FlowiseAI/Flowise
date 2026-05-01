import { RedisOptions, RepeatOptions } from 'bullmq'
import { BaseQueue } from './BaseQueue'
import { ScheduleRecord } from '../database/entities/ScheduleRecord'
import { IComponentNodes } from '../Interface'
import logger from '../utils/logger'
import { IScheduleAgentflowJobData } from '../Interface.Schedule'
import { DataSource } from 'typeorm'
import { Telemetry } from '../utils/telemetry'
import { CachePool } from '../CachePool'
import { UsageCacheManager } from '../UsageCacheManager'
import { RedisEventPublisher } from './RedisEventPublisher'
import { executeScheduleJob } from '../schedule/ScheduleExecutor'
import { IdentityManager } from '../IdentityManager'

interface ScheduleQueueOptions {
    appDataSource: DataSource
    telemetry: Telemetry
    cachePool: CachePool
    componentNodes: IComponentNodes
    usageCacheManager: UsageCacheManager
    identityManager: IdentityManager
}

interface ScheduleAgentflowJobData {
    scheduleRecordId: string
    targetId: string
    cronExpression: string
    timezone: string
    defaultInput?: string
    workspaceId: string
    scheduledAt: string // ISO string
}

export class ScheduleQueue extends BaseQueue {
    private componentNodes: IComponentNodes
    private telemetry: Telemetry
    private cachePool: CachePool
    private appDataSource: DataSource
    private usageCacheManager: UsageCacheManager
    private identityManager: IdentityManager
    private redisPublisher: RedisEventPublisher
    private queueName: string

    constructor(name: string, connection: RedisOptions, options: ScheduleQueueOptions) {
        super(name, connection)
        this.queueName = name
        this.componentNodes = options.componentNodes || {}
        this.telemetry = options.telemetry
        this.cachePool = options.cachePool
        this.appDataSource = options.appDataSource
        this.usageCacheManager = options.usageCacheManager
        this.identityManager = options.identityManager
        this.redisPublisher = new RedisEventPublisher() // sseStreamer for agentflow execution results
        this.redisPublisher.connect()
    }

    public getQueueName() {
        return this.queueName
    }

    public getQueue() {
        return this.queue
    }

    async processJob(data: IScheduleAgentflowJobData): Promise<any> {
        if (this.appDataSource) data.appDataSource = this.appDataSource
        if (this.telemetry) data.telemetry = this.telemetry
        if (this.cachePool) data.cachePool = this.cachePool
        if (this.usageCacheManager) data.usageCacheManager = this.usageCacheManager
        if (this.componentNodes) data.componentNodes = this.componentNodes

        const { scheduleRecordId } = data

        const ctx = {
            appDataSource: this.appDataSource,
            componentNodes: this.componentNodes,
            telemetry: this.telemetry,
            cachePool: this.cachePool,
            usageCacheManager: this.usageCacheManager,
            sseStreamer: this.redisPublisher,
            identityManager: this.identityManager
        }

        return executeScheduleJob(ctx, scheduleRecordId, {
            onRecordNotFoundOrDisabled: async () => {
                await this.removeJobScheduler(scheduleRecordId)
            },
            onRecordExpiredOrInvalid: async (record) => {
                record.enabled = false
                await this.appDataSource.getRepository(ScheduleRecord).save(record)
                await this.removeJobScheduler(scheduleRecordId)
            }
        })
    }

    /**
     * Add a repeatable scheduled job using BullMQ's repeat options.
     * BullMQ deduplicates repeatable jobs by jobId pattern — safe to call on every startup.
     */
    public async upsertJobScheduler(record: ScheduleRecord): Promise<void> {
        const timezone = record.timezone ?? 'UTC'
        const jobData: ScheduleAgentflowJobData = {
            scheduleRecordId: record.id,
            targetId: record.targetId,
            cronExpression: record.cronExpression,
            timezone: timezone,
            defaultInput: record.defaultInput ?? undefined,
            workspaceId: record.workspaceId,
            scheduledAt: new Date().toISOString()
        }

        const repeatOptions: RepeatOptions = {
            pattern: record.cronExpression,
            tz: timezone
        }
        await this.queue.upsertJobScheduler(`schedule:${record.id}`, repeatOptions, {
            name: `schedule:${record.id}`,
            data: jobData
        })

        logger.debug(`[ScheduleQueue]: Registered repeatable job for schedule ${record.id} (${record.cronExpression})`)
    }

    /**
     * Remove a repeatable scheduled job from the queue.
     */
    public async removeJobScheduler(scheduleRecordId: string): Promise<void> {
        try {
            await this.queue.removeJobScheduler(`schedule:${scheduleRecordId}`)
            logger.debug(`[ScheduleQueue]: Removed repeatable job for schedule ${scheduleRecordId}`)
        } catch (error) {
            logger.warn(`[ScheduleQueue]: Could not remove repeatable job for schedule ${scheduleRecordId}: ${error}`)
        }
    }
}
