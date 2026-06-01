/**
 * ScheduleExecutor
 *
 * Shared execution logic for scheduled agentflow jobs. Used by both
 * ScheduleBeat (non-queue / node-cron mode) and ScheduleQueue (BullMQ mode)
 * so that validation, execution, logging, and post-run updates live in one place.
 */

import { DataSource } from 'typeorm'
import { ChatType, IComponentNodes, IncomingAgentflowInput } from '../Interface'
import { IServerSideEventStreamer } from 'flowise-components'
import { ScheduleRecord, ScheduleTriggerType } from '../database/entities/ScheduleRecord'
import { ScheduleTriggerStatus } from '../database/entities/ScheduleTriggerLog'
import { ChatFlow } from '../database/entities/ChatFlow'
import { Workspace } from '../enterprise/database/entities/workspace.entity'
import { Organization } from '../enterprise/database/entities/organization.entity'
import { executeAgentFlow } from '../utils/buildAgentflow'
import { checkPredictions, updatePredictionsUsage } from '../utils/quotaUsage'
import scheduleService from '../services/schedule'
import { Telemetry } from '../utils/telemetry'
import { CachePool } from '../CachePool'
import { UsageCacheManager } from '../UsageCacheManager'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger'
import { IdentityManager } from '../IdentityManager'

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * Runtime dependencies required to execute a scheduled agentflow.
 * Both queue and non-queue modes supply these from their own context.
 */
export interface ScheduleExecutionContext {
    appDataSource: DataSource
    componentNodes: IComponentNodes
    telemetry: Telemetry
    cachePool: CachePool
    usageCacheManager: UsageCacheManager
    sseStreamer: IServerSideEventStreamer
    identityManager: IdentityManager
}

/**
 * Optional hooks for mode-specific side-effects during validation.
 * These let each mode handle cleanup its own way (e.g. removing a cron job
 * vs. removing a BullMQ job scheduler) without polluting the shared logic.
 */
export interface ScheduleExecutionCallbacks {
    /** Called when the schedule record is not found or is disabled. */
    onRecordNotFoundOrDisabled?: (scheduleRecordId: string) => Promise<void> | void
    /** Called when the schedule has passed its endDate or has invalid input. */
    onRecordExpiredOrInvalid?: (record: ScheduleRecord) => Promise<void> | void
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Validate and execute a single scheduled agentflow job.
 *
 * Pipeline:
 *  1. Load ScheduleRecord from DB
 *  2. Check enabled / endDate / defaultInput / nextRunAt  →  SKIPPED if invalid
 *  3. Create RUNNING trigger log
 *  4. Load ChatFlow, build input, execute agentflow
 *  5. Update trigger log (SUCCEEDED / FAILED)
 *  6. Update schedule after run (lastRunAt, nextRunAt)
 *
 * @returns The agentflow execution result, or `undefined` if skipped.
 */
export async function executeScheduleJob(
    ctx: ScheduleExecutionContext,
    scheduleRecordId: string,
    callbacks?: ScheduleExecutionCallbacks
): Promise<any> {
    const scheduledAt = new Date()
    const { appDataSource } = ctx

    // ── 1. Load & validate record ──────────────────────────────────────────
    const scheduleRecord = await appDataSource.getRepository(ScheduleRecord).findOneBy({ id: scheduleRecordId })

    // If the record is missing entirely, log and skip without creating a trigger log.
    if (!scheduleRecord) {
        logger.warn(`[ScheduleExecutor]: Schedule ${scheduleRecordId} not found, skipping`)
        await callbacks?.onRecordNotFoundOrDisabled?.(scheduleRecordId)
        return undefined
    }
    // If the record exists but is disabled, record a SKIPPED trigger log with proper attribution.
    if (!scheduleRecord.enabled) {
        logger.warn(`[ScheduleExecutor]: Schedule ${scheduleRecordId} disabled, skipping`)
        await callbacks?.onRecordNotFoundOrDisabled?.(scheduleRecordId)
        await scheduleService.createTriggerLog({
            appDataSource,
            scheduleRecordId,
            triggerType: scheduleRecord.triggerType ?? ScheduleTriggerType.AGENTFLOW,
            targetId: scheduleRecord.targetId,
            status: ScheduleTriggerStatus.SKIPPED,
            scheduledAt,
            workspaceId: scheduleRecord.workspaceId
        })
        return undefined
    }

    // ── 2. End-date / input validation ─────────────────────────────────────
    const isInputValid =
        scheduleRecord.scheduleInputMode === 'text'
            ? scheduleService.isScheduleInputValid(scheduleRecord.scheduleInputMode, scheduleRecord.defaultInput)
            : true
    if ((scheduleRecord.endDate && scheduledAt >= scheduleRecord.endDate) || !isInputValid) {
        logger.debug(`[ScheduleExecutor]: Schedule ${scheduleRecordId} has passed end date or invalid input, disabling`)
        await callbacks?.onRecordExpiredOrInvalid?.(scheduleRecord)
        await scheduleService.createTriggerLog({
            appDataSource,
            scheduleRecordId,
            triggerType: scheduleRecord.triggerType ?? ScheduleTriggerType.AGENTFLOW,
            targetId: scheduleRecord.targetId,
            status: ScheduleTriggerStatus.SKIPPED,
            scheduledAt,
            workspaceId: scheduleRecord.workspaceId
        })
        return undefined
    }

    // ── 3. nextRunAt guard ─────────────────────────────────────────────────
    if (scheduleRecord.nextRunAt && scheduleRecord.nextRunAt > scheduledAt) {
        logger.debug(
            `[ScheduleExecutor]: Scheduled time ${scheduledAt.toISOString()} is before nextRunAt ` +
                `${scheduleRecord.nextRunAt.toISOString()} for schedule ${scheduleRecordId}, skipping`
        )
        await scheduleService.createTriggerLog({
            appDataSource,
            scheduleRecordId,
            triggerType: scheduleRecord.triggerType ?? ScheduleTriggerType.AGENTFLOW,
            targetId: scheduleRecord.targetId,
            status: ScheduleTriggerStatus.SKIPPED,
            scheduledAt,
            workspaceId: scheduleRecord.workspaceId
        })
        return undefined
    }

    // ── 4. Execute ─────────────────────────────────────────────────────────
    return _executeAgentflow(ctx, scheduleRecord, scheduledAt)
}

// ─── Internal ──────────────────────────────────────────────────────────────────

async function _executeAgentflow(ctx: ScheduleExecutionContext, record: ScheduleRecord, scheduledAt: Date): Promise<any> {
    const { appDataSource, componentNodes, telemetry, cachePool, usageCacheManager, sseStreamer, identityManager } = ctx
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
        const isAgentFlow = chatflow.type === 'AGENTFLOW'
        if (!isAgentFlow) throw new Error(`ChatFlow ${record.targetId} is not of type AGENTFLOW`)

        const workspaceId = chatflow.workspaceId ?? record.workspaceId

        const workspace = await appDataSource.getRepository(Workspace).findOneBy({ id: workspaceId })
        if (!workspace) throw new Error(`Workspace ${workspaceId} not found`)
        const org = await appDataSource.getRepository(Organization).findOneBy({ id: workspace.organizationId })
        if (!org) throw new Error(`Organization ${workspace.organizationId} not found`)

        const orgId = org.id
        const subscriptionId = org.subscriptionId as string
        const productId = await identityManager.getProductIdFromSubscription(subscriptionId)

        await checkPredictions(org.id, subscriptionId, usageCacheManager)

        const chatId = uuidv4()
        const incomingInput: IncomingAgentflowInput = { chatId, streaming: false }
        if (record.scheduleInputMode === 'form') {
            try {
                incomingInput.form = record.defaultForm ? JSON.parse(record.defaultForm) : {}
            } catch (e) {
                logger.warn(`[ScheduleExecutor]: schedule ${record.id} defaultForm is not valid JSON, falling back to {}`)
                incomingInput.form = {}
            }
        } else if (record.scheduleInputMode === 'none') {
            // Use a single-space sentinel rather than an empty string, since some models do accept whitespace characters.
            incomingInput.question = ' '
        } else {
            incomingInput.question = record.defaultInput
        }

        const result = await executeAgentFlow({
            componentNodes,
            incomingInput,
            chatflow,
            chatId,
            appDataSource,
            telemetry,
            cachePool,
            usageCacheManager,
            sseStreamer,
            baseURL: process.env.APP_URL ?? '',
            isInternal: true,
            chatType: ChatType.SCHEDULED,
            orgId,
            workspaceId,
            subscriptionId,
            productId
        })

        const elapsedTimeMs = Date.now() - startTime
        const executionId: string | undefined =
            result && typeof result === 'object' && 'executionId' in result ? (result as any).executionId : undefined

        await scheduleService.updateTriggerLog(appDataSource, log.id, {
            status: ScheduleTriggerStatus.SUCCEEDED,
            elapsedTimeMs,
            executionId
        })

        await updatePredictionsUsage(orgId, subscriptionId, workspaceId, usageCacheManager)
        await scheduleService.updateScheduleAfterRun(appDataSource, record.id, record.cronExpression, record.timezone ?? 'UTC')
        logger.debug(`[ScheduleExecutor]: Completed schedule ${record.id} (${elapsedTimeMs}ms)`)
        return result
    } catch (error) {
        const elapsedTimeMs = Date.now() - startTime
        const errMsg = error instanceof Error ? error.message : String(error)

        await scheduleService.updateTriggerLog(appDataSource, log.id, {
            status: ScheduleTriggerStatus.FAILED,
            elapsedTimeMs,
            error: errMsg
        })

        logger.error(`[ScheduleExecutor]: Schedule ${record.id} failed: ${errMsg}`)
        throw error
    }
}
