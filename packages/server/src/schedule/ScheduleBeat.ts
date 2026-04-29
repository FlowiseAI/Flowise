/**
 * ScheduleBeat
 *
 * Responsible for keeping BullMQ repeatable jobs (or in-process timers)
 * in sync with the ScheduleRecord table.
 *
 * Queue mode    : delegates scheduling to BullMQ repeat jobs via ScheduleQueue.
 * Non-queue mode: uses node-cron to register per-schedule cron jobs in-process.
 *
 * Either way, ScheduleBeat.init() must be called once after the DB is ready.
 */

import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { ScheduleRecord } from '../database/entities/ScheduleRecord'
import { ScheduleQueue } from '../queue/ScheduleQueue'
import { QueueManager } from '../queue/QueueManager'
import { executeScheduleJob } from './ScheduleExecutor'
import scheduleService from '../services/schedule'
import { expandCronLForNodeCron, cronDomMatchesNow } from '../services/schedule/utils'
import { MODE } from '../Interface'
import logger from '../utils/logger'
import cron, { ScheduledTask } from 'node-cron'

// ---------------------------------------------------------------------------

export class ScheduleBeat {
    private static instance: ScheduleBeat
    private isQueueMode: boolean
    /** Map of scheduleRecordId → node-cron ScheduledTask (non-queue mode only) */
    private cronJobs: Map<string, ScheduledTask> = new Map()

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
     * NOTE: In non-queue mode, schedules are executed via in-process cron jobs without
     * any distributed locking or leader election. If the API is deployed with
     * multiple replicas and all of them call ScheduleBeat.init(), each replica
     * will run the same schedules, causing duplicate executions. For High Availability (HA) / multi-
     * replica deployments, configure MODE.QUEUE and use the queue-based scheduler.
     */
    public async init(): Promise<void> {
        logger.info(`[ScheduleBeat]: Initializing in ${this.isQueueMode ? 'queue' : 'non-queue'} mode`)
        if (!this.isQueueMode) {
            logger.warn(
                '[ScheduleBeat]: Running in non-queue mode with node-cron and no distributed locking. ' +
                    'If multiple API replicas are running, schedules will be executed once per replica. ' +
                    'For High Availability (HA) deployments, enable queue mode (MODE.QUEUE) to avoid duplicate executions.'
            )
        }
        await this._syncAllJobs()
    }

    /**
     * Call this after a schedule is created/updated/deleted to resync.
     * Mode-agnostic — delegates to _removeJob / _upsertJob which dispatch
     * to BullMQ (queue mode) or node-cron (non-queue mode).
     */
    public async onScheduleChanged(scheduleRecordId: string, action: 'upsert' | 'delete'): Promise<void> {
        try {
            if (action === 'delete') {
                await this._removeJob(scheduleRecordId)
                return
            }
            const appServer = getRunningExpressApp()
            const scheduleRecord = await appServer.AppDataSource.getRepository(ScheduleRecord).findOneBy({ id: scheduleRecordId })

            if (!scheduleRecord || !scheduleRecord.enabled) {
                await this._removeJob(scheduleRecordId)
            } else {
                await this._upsertJob(scheduleRecord)
            }
        } catch (error) {
            logger.error(`[ScheduleBeat]: onScheduleChanged error: ${error}`)
        }
    }

    /**
     * Stop all scheduling activity (called on graceful shutdown).
     */
    public async shutdown(): Promise<void> {
        for (const [, task] of this.cronJobs) {
            task.stop()
        }
        this.cronJobs.clear()
    }

    // ─── Mode-agnostic job management ───────────────────────────────────────

    /**
     * Register (or re-register) a schedule job via the active backend.
     */
    private async _upsertJob(record: ScheduleRecord): Promise<void> {
        if (this.isQueueMode) {
            const scheduleQueue = this._getScheduleQueue()
            if (!scheduleQueue) return
            await scheduleQueue.upsertJobScheduler(record)
        } else {
            this._upsertCronJob(record)
        }
    }

    /**
     * Remove a schedule job from the active backend.
     */
    private async _removeJob(scheduleRecordId: string): Promise<void> {
        if (this.isQueueMode) {
            const scheduleQueue = this._getScheduleQueue()
            if (!scheduleQueue) return
            await scheduleQueue.removeJobScheduler(scheduleRecordId)
        } else {
            this._removeCronJob(scheduleRecordId)
        }
    }

    /**
     * Get the ScheduleQueue instance (queue mode only). Returns undefined with a warning if unavailable.
     */
    private _getScheduleQueue(): ScheduleQueue | undefined {
        const scheduleQueue = QueueManager.getInstance().getQueue('schedule') as ScheduleQueue | undefined
        if (!scheduleQueue) {
            logger.warn('[ScheduleBeat]: ScheduleQueue not available')
        }
        return scheduleQueue
    }

    /**
     * Loads all enabled schedules in batches and registers them via the active backend.
     */
    private async _syncAllJobs(): Promise<void> {
        // In non-queue mode, stop existing cron jobs first
        if (!this.isQueueMode) {
            for (const [, task] of this.cronJobs) {
                task.stop()
            }
            this.cronJobs.clear()
        }

        let skip = 0
        let totalSynced = 0
        let batch: ScheduleRecord[]
        do {
            batch = await scheduleService.getEnabledSchedulesBatch(skip)
            for (const record of batch) {
                await this._upsertJob(record)
            }
            totalSynced += batch.length
            skip += batch.length
        } while (batch.length > 0)
        logger.info(`[ScheduleBeat]: Synced ${totalSynced} schedule(s)`)
    }

    /**
     * Register (or re-register) a node-cron job for a schedule record.
     *
     * `node-cron` does not support the `L` (last day of month) token, while BullMQ /
     * cron-parser does. To keep both backends in sync we expand `L` → `28-31` for
     * node-cron's parser and add a runtime DOM filter so candidate days only
     * actually fire when they really are the last day of the current month.
     */
    private _upsertCronJob(record: ScheduleRecord): void {
        this._removeCronJob(record.id)

        const tz = record.timezone ?? 'UTC'

        const { expression: nodeCronExpression, hasL } = expandCronLForNodeCron(record.cronExpression)

        if (!cron.validate(nodeCronExpression)) {
            logger.warn(`[ScheduleBeat]: Invalid cron expression for schedule ${record.id}: "${record.cronExpression}", skipping`)
            return
        }

        const task = cron.schedule(
            nodeCronExpression,
            () => {
                // When the original expression used `L`, only fire on a real match
                // (i.e. today's DOM in `tz` actually satisfies the original DOM field).
                if (hasL && !cronDomMatchesNow(record.cronExpression, new Date(), tz)) {
                    logger.debug(
                        `[ScheduleBeat]: Skipping cron fire for schedule ${record.id} because today does not match original DOM field with L token`
                    )
                    return
                }
                this._onCronFire(record.id).catch((err) => {
                    logger.error(`[ScheduleBeat]: Error firing schedule ${record.id}: ${err}`)
                })
            },
            { timezone: tz }
        )

        this.cronJobs.set(record.id, task)
        logger.debug(
            `[ScheduleBeat]: Registered cron job for schedule ${record.id} ` +
                `(${record.cronExpression}${hasL ? ` → ${nodeCronExpression}` : ''} ${tz})`
        )
    }

    /**
     * Stop and remove a node-cron job for a schedule record.
     */
    private _removeCronJob(scheduleRecordId: string): void {
        const existing = this.cronJobs.get(scheduleRecordId)
        if (existing) {
            existing.stop()
            this.cronJobs.delete(scheduleRecordId)
            logger.debug(`[ScheduleBeat]: Removed cron job for schedule ${scheduleRecordId}`)
        }
    }

    /**
     * Callback fired by node-cron. Delegates to the shared ScheduleExecutor
     * with Beat-specific cleanup callbacks.
     */
    private async _onCronFire(scheduleRecordId: string): Promise<void> {
        const appServer = getRunningExpressApp()
        const ctx = {
            appDataSource: appServer.AppDataSource,
            componentNodes: appServer.nodesPool.componentNodes,
            telemetry: appServer.telemetry,
            cachePool: appServer.cachePool,
            usageCacheManager: appServer.usageCacheManager,
            sseStreamer: appServer.sseStreamer,
            identityManager: appServer.identityManager
        }

        await executeScheduleJob(ctx, scheduleRecordId, {
            onRecordNotFoundOrDisabled: () => {
                this._removeCronJob(scheduleRecordId)
            },
            onRecordExpiredOrInvalid: async (record) => {
                record.enabled = false
                await appServer.AppDataSource.getRepository(ScheduleRecord).save(record)
                this._removeCronJob(record.id)
            }
        })
    }
}
