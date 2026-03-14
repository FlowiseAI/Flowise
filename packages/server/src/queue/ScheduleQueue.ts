import { RedisOptions, RepeatOptions } from 'bullmq'
import { BaseQueue } from './BaseQueue'
import { executeAgentFlow } from '../utils/buildAgentflow'
import { ScheduleRecord, ScheduleTriggerType } from '../database/entities/ScheduleRecord'
import { ScheduleTriggerStatus } from '../database/entities/ScheduleTriggerLog'
import scheduleService from '../services/schedule'
import { IComponentNodes, IncomingAgentflowInput } from '../Interface'
import { ChatFlow } from '../database/entities/ChatFlow'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger'
import { IScheduleAgentflowJobData } from '../Interface.Schedule'
import { DataSource } from 'typeorm'
import { Telemetry } from '../utils/telemetry'
import { CachePool } from '../CachePool'
import { UsageCacheManager } from '../UsageCacheManager'
import { RedisEventPublisher } from './RedisEventPublisher'

interface ScheduleQueueOptions {
    appDataSource: DataSource
    telemetry: Telemetry
    cachePool: CachePool
    componentNodes: IComponentNodes
    usageCacheManager: UsageCacheManager
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

        const { scheduleRecordId, targetId, defaultInput, workspaceId } = data
        // Compute the effective scheduled time at execution to avoid reusing
        // a stale timestamp baked into the repeatable job payload.
        const scheduledAtDate = new Date()
        const startTime = Date.now()

        const scheduleRecord = await this.appDataSource.getRepository(ScheduleRecord).findOneBy({ id: scheduleRecordId })
        if (!scheduleRecord) {
            logger.error(`[ScheduleQueue]: Schedule record ${scheduleRecordId} not found, skipping job`)
            return
        }
        if (!scheduleRecord.enabled) {
            logger.debug(`[ScheduleQueue]: Schedule record ${scheduleRecordId} is disabled, skipping job`)
            return
        }

        // Create an initial log entry
        const log = await scheduleService.createTriggerLog({
            appDataSource: this.appDataSource,
            scheduleRecordId,
            triggerType: scheduleRecord.triggerType ?? ScheduleTriggerType.AGENTFLOW,
            targetId,
            status: ScheduleTriggerStatus.RUNNING,
            scheduledAt: scheduledAtDate,
            workspaceId
        })

        try {
            // Load the chatflow
            const chatflow = await this.appDataSource.getRepository(ChatFlow).findOneBy({ id: targetId })
            if (!chatflow) {
                throw new Error(`ChatFlow ${targetId} not found`)
            }
            if (chatflow.type !== 'AGENTFLOW') {
                throw new Error(`ChatFlow ${targetId} is not of type AGENTFLOW`)
            }

            // Build minimal IncomingAgentflowInput
            const chatId = uuidv4()
            const incomingInput: IncomingAgentflowInput = {
                question: defaultInput || '',
                chatId,
                streaming: false
            }

            const result = await executeAgentFlow({
                componentNodes: this.componentNodes,
                incomingInput,
                chatflow,
                chatId,
                appDataSource: this.appDataSource,
                telemetry: this.telemetry,
                cachePool: this.cachePool,
                usageCacheManager: this.usageCacheManager,
                sseStreamer: this.redisPublisher,
                baseURL: '',
                isInternal: true,
                uploadedFilesContent: '',
                fileUploads: [],
                isTool: true, // suppresses SSE streaming
                workspaceId: chatflow.workspaceId ?? workspaceId,
                orgId: '',
                subscriptionId: '',
                productId: ''
            })

            const elapsedTimeMs = Date.now() - startTime
            const executionId: string | undefined =
                result && typeof result === 'object' && 'executionId' in result ? (result as any).executionId : undefined

            await scheduleService.updateTriggerLog(this.appDataSource, log.id, {
                status: ScheduleTriggerStatus.SUCCEEDED,
                elapsedTimeMs,
                executionId
            })

            await scheduleService.updateLastRunAt(this.appDataSource, scheduleRecordId, new Date())
            logger.debug(`[ScheduleQueue]: Completed job for schedule ${scheduleRecordId} (${elapsedTimeMs}ms)`)
            return result
        } catch (error) {
            const elapsedTimeMs = Date.now() - startTime
            const errMsg = error instanceof Error ? error.message : String(error)
            logger.error(`[ScheduleQueue]: Job failed for schedule ${scheduleRecordId}: ${errMsg}`)

            await scheduleService.updateTriggerLog(this.appDataSource, log.id, {
                status: ScheduleTriggerStatus.FAILED,
                elapsedTimeMs,
                error: errMsg
            })

            throw error
        }
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

        logger.info(`[ScheduleQueue]: Registered repeatable job for schedule ${record.id} (${record.cronExpression})`)
    }

    /**
     * Remove a repeatable scheduled job from the queue.
     */
    public async removeJobScheduler(scheduleRecordId: string): Promise<void> {
        try {
            await this.queue.removeJobScheduler(`schedule:${scheduleRecordId}`)
            logger.info(`[ScheduleQueue]: Removed repeatable job for schedule ${scheduleRecordId}`)
        } catch (error) {
            logger.warn(`[ScheduleQueue]: Could not remove repeatable job for schedule ${scheduleRecordId}: ${error}`)
        }
    }
}
