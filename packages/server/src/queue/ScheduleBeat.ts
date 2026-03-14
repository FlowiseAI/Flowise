/**
 * ScheduleBeat
 *
 * Responsible for keeping BullMQ repeatable jobs (or in-process timers)
 * in sync with the ScheduleRecord table.
 *
 * Queue mode  : delegates scheduling to BullMQ repeat jobs via ScheduleQueue.
 * Non-queue mode: uses setInterval-based in-process timers (1-minute resolution).
 *
 * Either way, ScheduleBeat.init() must be called once after the DB is ready.
 */

import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { ScheduleRecord } from '../database/entities/ScheduleRecord'
import { ScheduleTriggerStatus } from '../database/entities/ScheduleTriggerLog'
import { ScheduleQueue } from './ScheduleQueue'
import { QueueManager } from './QueueManager'
import scheduleService from '../services/schedule'
import { executeAgentFlow } from '../utils/buildAgentflow'
import { IncomingAgentflowInput, MODE } from '../Interface'
import { ChatFlow } from '../database/entities/ChatFlow'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger'

// ---------------------------------------------------------------------------
// Minimal cron-expression parser for non-queue mode
// Returns true if the given Date matches the cron pattern (minute resolution)
// Supports: * and */step, individual values, ranges (a-b), and comma lists
// ---------------------------------------------------------------------------
function matchesCronField(field: string, value: number, min: number, max: number): boolean {
    if (field === '*') return true

    for (const part of field.split(',')) {
        if (part.includes('/')) {
            const [rangeStr, stepStr] = part.split('/')
            const step = parseInt(stepStr, 10)
            if (isNaN(step)) continue
            if (rangeStr === '*') {
                if ((value - min) % step === 0) return true
            } else if (rangeStr.includes('-')) {
                const [start, end] = rangeStr.split('-').map(Number)
                if (value >= start && value <= end && (value - start) % step === 0) return true
            } else {
                if (value === parseInt(rangeStr, 10)) return true
            }
        } else if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number)
            if (value >= start && value <= end) return true
        } else {
            if (value === parseInt(part, 10)) return true
        }
    }
    return false
}

function matchesCron(expression: string, date: Date, timezone: string = 'UTC'): boolean {
    // Extract date/time fields in the target timezone using Intl.DateTimeFormat.formatToParts()
    // to avoid locale/DST-dependent round-tripping through Date parsing.
    let minute: number, hour: number, dom: number, month: number, dow: number
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            weekday: 'short',
            hour12: false
        }).formatToParts(date)
        const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)
        const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
        minute = get('minute')
        hour = get('hour') % 24 // hour12:false returns 24 for midnight in some runtimes
        dom = get('day')
        month = get('month')
        dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayStr)
        if (dow === -1) dow = date.getUTCDay() // safety fallback
    } catch {
        // Fallback to UTC fields if the timezone identifier is invalid
        minute = date.getUTCMinutes()
        hour = date.getUTCHours()
        dom = date.getUTCDate()
        month = date.getUTCMonth() + 1
        dow = date.getUTCDay()
    }

    const fields = expression.trim().split(/\s+/)
    // Support 5-field (standard) and 6-field (with seconds) cron
    const offset = fields.length === 6 ? 1 : 0
    const minuteField = fields[0 + offset]
    const hourField = fields[1 + offset]
    const domField = fields[2 + offset]
    const monthField = fields[3 + offset]
    const dowField = fields[4 + offset]

    // Cron allows both 0 and 7 for Sunday; Date.getDay() only returns 0.
    // When dow is 0 (Sunday), also evaluate the field against 7 so expressions
    // like "7", "1-7", or "5-7" match correctly.
    const dowMatches = matchesCronField(dowField, dow, 0, 7) || (dow === 0 && matchesCronField(dowField, 7, 0, 7))
    return (
        matchesCronField(minuteField, minute, 0, 59) &&
        matchesCronField(hourField, hour, 0, 23) &&
        matchesCronField(domField, dom, 1, 31) &&
        matchesCronField(monthField, month, 1, 12) &&
        dowMatches
    )
}

// ---------------------------------------------------------------------------

export class ScheduleBeat {
    private static instance: ScheduleBeat
    private inProcessTimer: NodeJS.Timeout | null = null
    private isQueueMode: boolean

    private constructor() {
        this.isQueueMode = process.env.MODE === MODE.QUEUE
    }

    public static getInstance(): ScheduleBeat {
        if (!ScheduleBeat.instance) {
            ScheduleBeat.instance = new ScheduleBeat()
        }
        return ScheduleBeat.instance
    }

    /**
     * Initialize scheduling. Must be called after the DB is initialized.
     *
     * NOTE: In non-queue mode, schedules are executed via in-process timers without
     * any distributed locking or leader election. If the API is deployed with
     * multiple replicas and all of them call ScheduleBeat.init(), each replica
     * will run the same schedules, causing duplicate executions. For High Availability (HA) / multi-
     * replica deployments, configure MODE.QUEUE and use the queue-based scheduler.
     */
    public async init(): Promise<void> {
        logger.info(`[ScheduleBeat]: Initializing in ${this.isQueueMode ? 'queue' : 'non-queue'} mode`)
        if (this.isQueueMode) {
            await this._syncQueueModeSchedules()
        } else {
            logger.warn(
                '[ScheduleBeat]: Running in non-queue mode with in-process timers and no distributed locking. ' +
                    'If multiple API replicas are running, schedules will be executed once per replica. ' +
                    'For High Availability (HA) deployments, enable queue mode (MODE.QUEUE) to avoid duplicate executions.'
            )
            this._startInProcessTimer()
        }
    }

    /**
     * Call this after a schedule is created/updated/deleted to resync the queue.
     * In queue mode it re-registers the BullMQ repeatable job.
     * In non-queue mode the in-process timer re-reads the DB on every tick, so no action needed.
     */
    public async onScheduleChanged(scheduleRecordId: string, action: 'upsert' | 'delete'): Promise<void> {
        if (!this.isQueueMode) return // no-op; timer picks up DB changes automatically
        try {
            // NOTE: Need to load the ScheduleRecord here to get the cron expression and timezone for removing the old job.
            const appServer = getRunningExpressApp()
            const scheduleRecord = await appServer.AppDataSource.getRepository(ScheduleRecord).findOneBy({ id: scheduleRecordId })
            if (!scheduleRecord) {
                logger.warn(`[ScheduleBeat]: Schedule record ${scheduleRecordId} not found for onScheduleChanged`)
                return
            }
            const scheduleQueue = QueueManager.getInstance().getQueue('schedule') as ScheduleQueue | undefined
            if (!scheduleQueue) {
                logger.warn('[ScheduleBeat]: ScheduleQueue not available — cannot sync schedule changes')
                return
            }
            if (action === 'delete' || !scheduleRecord.enabled) {
                await scheduleQueue.removeJobScheduler(scheduleRecord.id)
            } else {
                // Remove old job first (in case cron expression changed)
                await scheduleQueue.removeJobScheduler(scheduleRecord.id)
                // Add new job
                await scheduleQueue.upsertJobScheduler(scheduleRecord)
            }
        } catch (error) {
            logger.error(`[ScheduleBeat]: onScheduleChanged error: ${error}`)
        }
    }

    /**
     * Stop all scheduling activity (called on graceful shutdown).
     */
    public async shutdown(): Promise<void> {
        if (this.inProcessTimer) {
            clearInterval(this.inProcessTimer)
            this.inProcessTimer = null
        }
    }

    // ─── Queue mode ────────────────────────────────────────────────────────────

    private async _syncQueueModeSchedules(): Promise<void> {
        try {
            const scheduleQueue = QueueManager.getInstance().getQueue('schedule') as ScheduleQueue | undefined
            if (!scheduleQueue) {
                logger.warn('[ScheduleBeat]: ScheduleQueue not available — skipping sync')
                return
            }

            // NOTE: This naively re-registers all enabled schedules on every startup.
            // BullMQ will deduplicate them by jobId, so this is safe but could be optimized by only upserting changed schedules if needed.
            const records = await scheduleService.getAllEnabledSchedules()
            for (const record of records) {
                await scheduleQueue.upsertJobScheduler(record)
            }
            logger.info(`[ScheduleBeat]: Synced ${records.length} schedule(s) to BullMQ`)

            // NOTE: For the disabled schedules, we rely on the fact that ScheduleBeat.onScheduleChanged will be called
            // on each schedule update to remove the corresponding repeatable job from BullMQ.
            // This means that if a schedule is disabled but not deleted, its repeatable job will still be
            // registered on startup but should be removed shortly after when onScheduleChanged is triggered.
            // No need to explicitly remove disabled schedules here since they will be cleaned up by onScheduleChanged.
        } catch (error) {
            logger.error(`[ScheduleBeat]: Failed to sync schedules in queue mode: ${error}`)
        }
    }

    // ─── Non-queue mode ────────────────────────────────────────────────────────

    private _startInProcessTimer(): void {
        // Tick every 60 seconds, aligned to the start of the next minute
        const now = Date.now()
        const msToNextMinute = 60_000 - (now % 60_000)

        setTimeout(() => {
            this._tick()
            this.inProcessTimer = setInterval(() => this._tick(), 60_000)
        }, msToNextMinute)

        logger.info(`[ScheduleBeat]: In-process cron timer will fire in ${Math.round(msToNextMinute / 1000)}s`)
    }

    private async _tick(): Promise<void> {
        const now = new Date()
        logger.debug(`[ScheduleBeat]: Tick at ${now.toISOString()}`)

        let records: ScheduleRecord[]
        try {
            records = await scheduleService.getAllEnabledSchedules()
        } catch (error) {
            logger.error(`[ScheduleBeat]: Could not load schedules: ${error}`)
            return
        }

        for (const record of records) {
            if (matchesCron(record.cronExpression, now, record.timezone ?? 'UTC')) {
                this._fireSchedule(record, now).catch((err) => {
                    logger.error(`[ScheduleBeat]: Error firing schedule ${record.id}: ${err}`)
                })
            }
        }
    }

    private async _fireSchedule(record: ScheduleRecord, scheduledAt: Date): Promise<void> {
        const appServer = getRunningExpressApp()
        const appDataSource = appServer.AppDataSource
        const startTime = Date.now()
        const log = await scheduleService.createTriggerLog({
            appDataSource,
            scheduleRecordId: record.id,
            triggerType: record.triggerType,
            targetId: record.targetId,
            status: ScheduleTriggerStatus.RUNNING,
            scheduledAt,
            workspaceId: record.workspaceId
        })

        try {
            const chatflow = await appDataSource.getRepository(ChatFlow).findOneBy({ id: record.targetId })
            if (!chatflow) throw new Error(`ChatFlow ${record.targetId} not found`)
            if (chatflow.type !== 'AGENTFLOW') throw new Error(`ChatFlow ${record.targetId} is not type AGENTFLOW`)

            const chatId = uuidv4()
            const incomingInput: IncomingAgentflowInput = {
                question: record.defaultInput || '',
                chatId,
                streaming: false
            }

            const result = await executeAgentFlow({
                componentNodes: appServer.nodesPool.componentNodes,
                incomingInput,
                chatflow,
                chatId,
                appDataSource,
                telemetry: appServer.telemetry,
                cachePool: appServer.cachePool,
                usageCacheManager: appServer.usageCacheManager,
                sseStreamer: appServer.sseStreamer,
                baseURL: '',
                isInternal: true,
                uploadedFilesContent: '',
                fileUploads: [],
                isTool: true, // suppresses SSE streaming
                workspaceId: chatflow.workspaceId ?? record.workspaceId,
                orgId: '',
                subscriptionId: '',
                productId: ''
            })

            const elapsedTimeMs = Date.now() - startTime
            const executionId: string | undefined =
                result && typeof result === 'object' && 'executionId' in result ? (result as any).executionId : undefined

            await scheduleService.updateTriggerLog(appDataSource, log.id, {
                status: ScheduleTriggerStatus.SUCCEEDED,
                elapsedTimeMs,
                executionId
            })
            await scheduleService.updateLastRunAt(appDataSource, record.id, new Date())
            logger.debug(`[ScheduleBeat]: Fired schedule ${record.id} successfully (${elapsedTimeMs}ms)`)
        } catch (error) {
            const elapsedTimeMs = Date.now() - startTime
            const errMsg = error instanceof Error ? error.message : String(error)
            await scheduleService.updateTriggerLog(appDataSource, log.id, {
                status: ScheduleTriggerStatus.FAILED,
                elapsedTimeMs,
                error: errMsg
            })
            logger.error(`[ScheduleBeat]: Schedule ${record.id} failed: ${errMsg}`)
        }
    }
}
