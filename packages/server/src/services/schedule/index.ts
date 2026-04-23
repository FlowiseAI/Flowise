import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import { ScheduleRecord, ScheduleTriggerType } from '../../database/entities/ScheduleRecord'
import { ScheduleTriggerLog, ScheduleTriggerStatus } from '../../database/entities/ScheduleTriggerLog'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import { DataSource } from 'typeorm'
import {
    validateCronExpression,
    computeNextRunAt,
    isDefaultInputValid,
    resolveScheduleCron,
    validateVisualPickerFields,
    buildCronFromVisualPicker,
    canScheduleEnable
} from './utils'
import { ICommonObject } from 'flowise-components'

export {
    validateCronExpression,
    computeNextRunAt,
    validateVisualPickerFields,
    buildCronFromVisualPicker,
    resolveScheduleCron,
    isDefaultInputValid,
    canScheduleEnable
} from './utils'
export type { VisualPickerInput } from './utils'

export interface CreateScheduleInput {
    triggerType: ScheduleTriggerType
    targetId: string
    nodeId?: string
    cronExpression: string
    timezone?: string
    enabled?: boolean
    defaultInput?: string
    endDate?: Date
    workspaceId: string
}

export interface UpdateScheduleInput {
    cronExpression?: string
    timezone?: string
    enabled?: boolean
    defaultInput?: string
    endDate?: Date | null
}

/**
 * A fallback cron expression used when the provided one is invalid,
 * to prevent the schedule from being deleted and to allow users
 * to fix the cron expression without losing the schedule record.
 * The beat will skip execution if it detects this fallback expression, and will log an error for visibility.
 */
export const FALLBACK_CRON_EXPRESSION = '0 0 * * *' // daily at midnight UTC
export const FALLBACK_TIMEZONE = 'UTC'

/* Schedule batch size for processing schedules in batches */
const SCHEDULE_BATCH_SIZE = 100

const createOrUpdateSchedule = async (input: CreateScheduleInput): Promise<ScheduleRecord> => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(ScheduleRecord)

        const validation = validateCronExpression(input.cronExpression, input.timezone ?? FALLBACK_TIMEZONE)
        const cronExpression = validation.valid ? input.cronExpression : FALLBACK_CRON_EXPRESSION
        const timezone = validation.valid ? input.timezone ?? FALLBACK_TIMEZONE : FALLBACK_TIMEZONE

        // Upsert: find existing record for this target + triggerType
        const existing = await repo.findOne({
            where: {
                targetId: input.targetId,
                triggerType: input.triggerType,
                workspaceId: input.workspaceId
            }
        })

        if (existing) {
            const updateSchedule = new ScheduleRecord()
            const bodySchedule: ICommonObject = {
                cronExpression,
                timezone
            }
            if (input.enabled !== undefined) bodySchedule.enabled = input.enabled
            if (input.defaultInput !== undefined) bodySchedule.defaultInput = input.defaultInput
            if (input.nodeId !== undefined) bodySchedule.nodeId = input.nodeId
            bodySchedule.endDate = input.endDate ?? null
            bodySchedule.nextRunAt = computeNextRunAt(cronExpression, timezone) ?? null

            // NOTE: Use assign + merge to update `endDate` and `nextRunAt` even if they are null
            Object.assign(updateSchedule, bodySchedule)
            const merged = repo.merge(existing, updateSchedule)
            const saved = await repo.save(merged)
            logger.debug(`[ScheduleService]: Updated schedule ${saved.id} for ${input.triggerType}:${input.targetId}`)
            return saved
        }

        const record = repo.create({
            triggerType: input.triggerType,
            targetId: input.targetId,
            nodeId: input.nodeId,
            cronExpression: cronExpression,
            timezone: timezone,
            enabled: input.enabled !== undefined ? input.enabled : validation.valid, // default to enabled if valid, disabled if invalid
            defaultInput: input.defaultInput,
            endDate: input.endDate,
            nextRunAt: computeNextRunAt(cronExpression, timezone) ?? undefined,
            workspaceId: input.workspaceId
        })

        const saved = await repo.save(record)
        logger.debug(`[ScheduleService]: Created schedule ${saved.id} for ${input.triggerType}:${input.targetId}`)
        return saved
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: scheduleService.createOrUpdateSchedule - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Deletes the schedule record for a given target and trigger type.
 * NOTE: The log should be retained for historical/audit purposes, even if the schedule is deleted.
 */
const deleteScheduleForTarget = async (
    targetId: string,
    triggerType: ScheduleTriggerType,
    workspaceId: string
): Promise<ScheduleRecord | void> => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(ScheduleRecord)
        const record = await repo.findOne({ where: { targetId, triggerType, workspaceId } })
        if (!record) return
        await repo.delete(record.id)
        logger.debug(`[ScheduleService]: Deleted schedule for ${triggerType}:${targetId}`)
        return record
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: scheduleService.deleteScheduleForTarget - ${getErrorMessage(error)}`
        )
    }
}

const getEnabledSchedulesBatch = async (skip: number = 0, take: number = SCHEDULE_BATCH_SIZE): Promise<ScheduleRecord[]> => {
    try {
        const appServer = getRunningExpressApp()
        return await appServer.AppDataSource.getRepository(ScheduleRecord).find({
            where: { enabled: true },
            order: { createdDate: 'ASC' },
            skip,
            take
        })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: scheduleService.getEnabledSchedulesBatch - ${getErrorMessage(error)}`
        )
    }
}

// ---------------------------------------------------------------------------
// Cron field helpers (used by computeNextRunAt)
// ---------------------------------------------------------------------------

const updateScheduleAfterRun = async (
    appDataSource: DataSource,
    scheduleRecordId: string,
    cronExpression: string,
    timezone: string = 'UTC'
): Promise<void> => {
    try {
        const lastRunAt = new Date()
        const nextRunAt = computeNextRunAt(cronExpression, timezone, lastRunAt) ?? undefined
        await appDataSource.getRepository(ScheduleRecord).update({ id: scheduleRecordId }, { lastRunAt, nextRunAt })
    } catch (error) {
        logger.error(`[ScheduleService]: updateScheduleAfterRun failed for ${scheduleRecordId}: ${getErrorMessage(error)}`)
    }
}

/**
 * Returns the current schedule record and whether it can be enabled,
 * validated against the live flowData (not the stored cron which may be a fallback).
 */
const getScheduleStatus = async (
    targetId: string,
    workspaceId: string
): Promise<{ record: ScheduleRecord | null; canEnable: boolean; reason?: string }> => {
    try {
        const appServer = getRunningExpressApp()
        const record = await appServer.AppDataSource.getRepository(ScheduleRecord).findOne({
            where: { targetId, triggerType: ScheduleTriggerType.AGENTFLOW, workspaceId }
        })

        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({
            where: { id: targetId, workspaceId }
        })
        if (!chatflow?.flowData) {
            return { record, canEnable: false, reason: 'Flow not found or has no data' }
        }

        try {
            const parsedFlowData = JSON.parse(chatflow.flowData)
            const startNode = (parsedFlowData.nodes || []).find((n: any) => n.data?.name === 'startAgentflow')
            if (!startNode || startNode.data?.inputs?.startInputType !== 'scheduleInput') {
                return { record, canEnable: false, reason: 'Flow is not configured as a scheduled flow' }
            }

            const inputs = startNode.data.inputs as Record<string, any>
            const cronResult = resolveScheduleCron(inputs)
            if (!cronResult.valid) {
                return { record, canEnable: false, reason: cronResult.error || 'Invalid cron expression or timezone' }
            }

            // endDate must be in the future if set
            const endDateValue = inputs.scheduleEndDate || record?.endDate
            if (endDateValue) {
                const endDate = new Date(endDateValue)
                if (isNaN(endDate.getTime())) {
                    return { record, canEnable: false, reason: 'Invalid end date' }
                }
                if (endDate <= new Date()) {
                    return { record, canEnable: false, reason: 'End date is in the past' }
                }
            }

            // defaultInput is required for cron-based schedules since there is no user to provide a question at runtime
            const isDefaultInputValidResult = isDefaultInputValid(inputs.scheduleDefaultInput ?? record?.defaultInput)
            if (!isDefaultInputValidResult) {
                return { record, canEnable: false, reason: 'Default input is required to enable schedule' }
            }

            return { record, canEnable: true }
        } catch {
            return { record, canEnable: false, reason: 'Could not parse flow data' }
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: scheduleService.getScheduleStatus - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Toggles the enabled state of a schedule record.
 * When enabling, validates the schedule config first.
 * Caller is responsible for notifying ScheduleBeat after this returns.
 */
const toggleScheduleEnabled = async (targetId: string, workspaceId: string, enabled: boolean): Promise<ScheduleRecord> => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(ScheduleRecord)
        const record = await repo.findOne({
            where: { targetId, triggerType: ScheduleTriggerType.AGENTFLOW, workspaceId }
        })
        if (!record) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No schedule record found for this flow')
        }

        if (enabled) {
            const status = await getScheduleStatus(targetId, workspaceId)
            if (!status.canEnable) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, status.reason || 'Cannot enable schedule: invalid configuration')
            }
        }

        record.enabled = enabled
        const saved = await repo.save(record)
        logger.debug(`[ScheduleService]: Schedule ${record.id} toggled to ${enabled ? 'enabled' : 'disabled'}`)
        return saved
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: scheduleService.toggleScheduleEnabled - ${getErrorMessage(error)}`
        )
    }
}

// ─── Log functions ─────────────────────────────────────────────────────────────

const createTriggerLog = async (data: {
    appDataSource: DataSource
    scheduleRecordId: string
    triggerType: ScheduleTriggerType
    targetId: string
    status: ScheduleTriggerStatus
    scheduledAt: Date
    workspaceId: string
    executionId?: string
    error?: string
    elapsedTimeMs?: number
}): Promise<ScheduleTriggerLog> => {
    try {
        const repo = data.appDataSource.getRepository(ScheduleTriggerLog)
        const log = repo.create({
            id: uuidv4(),
            ...data
        })
        return await repo.save(log)
    } catch (error) {
        logger.error(`[ScheduleService]: createTriggerLog failed: ${getErrorMessage(error)}`)
        throw error
    }
}

const updateTriggerLog = async (
    appDataSource: DataSource,
    logId: string,
    update: { status: ScheduleTriggerStatus; error?: string; elapsedTimeMs?: number; executionId?: string }
): Promise<void> => {
    try {
        await appDataSource.getRepository(ScheduleTriggerLog).update({ id: logId }, update)
    } catch (error) {
        logger.error(`[ScheduleService]: updateTriggerLog failed for ${logId}: ${getErrorMessage(error)}`)
    }
}

// ─── Visual Picker helpers ──────────────────────────────────────────────────

export default {
    validateCronExpression,
    validateVisualPickerFields,
    buildCronFromVisualPicker,
    resolveScheduleCron,
    createOrUpdateSchedule,
    deleteScheduleForTarget,
    getEnabledSchedulesBatch,
    updateScheduleAfterRun,
    computeNextRunAt,
    createTriggerLog,
    updateTriggerLog,
    getScheduleStatus,
    toggleScheduleEnabled,
    isDefaultInputValid,
    canScheduleEnable
}
