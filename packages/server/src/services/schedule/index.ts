import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import { ScheduleRecord, ScheduleTriggerType } from '../../database/entities/ScheduleRecord'
import { ScheduleTriggerLog, ScheduleTriggerStatus } from '../../database/entities/ScheduleTriggerLog'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import { DataSource } from 'typeorm'

export interface CreateScheduleInput {
    triggerType: ScheduleTriggerType
    targetId: string
    nodeId?: string
    cronExpression: string
    timezone?: string
    enabled?: boolean
    defaultInput?: string
    workspaceId: string
}

export interface UpdateScheduleInput {
    cronExpression?: string
    timezone?: string
    enabled?: boolean
    defaultInput?: string
}

/**
 * Validates a cron expression and returns parsed info.
 * Uses a lightweight regex-based check without external dependencies.
 *
 * Supports standard 5-field cron: minute hour day month weekday
 */
export const validateCronExpression = (expression: string, timezone: string = 'UTC'): { valid: boolean; error?: string } => {
    if (!expression || typeof expression !== 'string') {
        return { valid: false, error: 'Cron expression must be a non-empty string' }
    }

    const trimmed = expression.trim()
    const fields = trimmed.split(/\s+/)

    if (fields.length !== 5 && fields.length !== 6) {
        return {
            valid: false,
            error: 'Cron expression must have 5 fields (minute hour day month weekday) or 6 fields (second minute hour day month weekday)'
        }
    }

    // Validate timezone
    try {
        Intl.DateTimeFormat('en-US', { timeZone: timezone })
    } catch {
        return { valid: false, error: `Invalid timezone: ${timezone}` }
    }

    // Returns true if s is a valid integer in [min, max] or a valid range "start-end"
    const isValidRangeOrNumber = (s: string, min: number, max: number): boolean => {
        const dashIdx = s.indexOf('-')
        if (dashIdx !== -1) {
            const startStr = s.slice(0, dashIdx)
            const endStr = s.slice(dashIdx + 1)
            if (!/^\d+$/.test(startStr) || !/^\d+$/.test(endStr)) return false
            const start = parseInt(startStr, 10)
            const end = parseInt(endStr, 10)
            return start >= min && start <= max && end >= min && end <= max && start <= end
        }
        if (!/^\d+$/.test(s)) return false
        const n = parseInt(s, 10)
        return n >= min && n <= max
    }

    // Validate a single cron field: supports *, numbers, ranges (n-m), steps (*/s, n/s, n-m/s), and comma-separated lists
    const validateCronField = (field: string, min: number, max: number): boolean => {
        const parts = field.split(',')
        if (parts.some((p) => p === '')) return false // catches leading/trailing/consecutive commas

        for (const part of parts) {
            const slashIdx = part.indexOf('/')
            if (slashIdx !== -1) {
                const base = part.slice(0, slashIdx)
                const stepStr = part.slice(slashIdx + 1)
                if (!/^\d+$/.test(stepStr)) return false
                const step = parseInt(stepStr, 10)
                if (step < 1) return false
                // Base must be *, a plain number, or a range
                if (base !== '*' && !isValidRangeOrNumber(base, min, max)) return false
            } else if (part !== '*') {
                if (!isValidRangeOrNumber(part, min, max)) return false
            }
        }
        return true
    }

    // Per-position field ranges [min, max]: minute hour day-of-month month day-of-week
    const fieldRanges: Array<[number, number]> = [
        [0, 59], // minutes (or seconds when 6-field)
        [0, 23], // hours
        [1, 31], // day of month
        [1, 12], // month
        [0, 7] // day of week (0 and 7 both represent Sunday)
    ]

    // For 6-field cron, prepend an extra seconds range (same as minutes: 0-59)
    const ranges: Array<[number, number]> = fields.length === 6 ? [[0, 59], ...fieldRanges] : fieldRanges
    for (let i = 0; i < fields.length; i++) {
        if (!validateCronField(fields[i], ranges[i][0], ranges[i][1])) {
            return { valid: false, error: `Invalid cron field at position ${i + 1}: "${fields[i]}"` }
        }
    }

    return { valid: true }
}

const createOrUpdateSchedule = async (input: CreateScheduleInput): Promise<ScheduleRecord> => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(ScheduleRecord)

        const validation = validateCronExpression(input.cronExpression, input.timezone ?? 'UTC')
        if (!validation.valid) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, validation.error!)
        }

        // Upsert: find existing record for this target + triggerType
        let existing = await repo.findOne({
            where: {
                targetId: input.targetId,
                triggerType: input.triggerType,
                workspaceId: input.workspaceId
            }
        })

        if (existing) {
            existing.cronExpression = input.cronExpression
            existing.timezone = input.timezone ?? 'UTC'
            if (input.enabled !== undefined) existing.enabled = input.enabled
            if (input.defaultInput !== undefined) existing.defaultInput = input.defaultInput
            if (input.nodeId !== undefined) existing.nodeId = input.nodeId
            const saved = await repo.save(existing)
            logger.debug(`[ScheduleService]: Updated schedule ${saved.id} for ${input.triggerType}:${input.targetId}`)
            return saved
        }

        const record = repo.create({
            id: uuidv4(),
            triggerType: input.triggerType,
            targetId: input.targetId,
            nodeId: input.nodeId,
            cronExpression: input.cronExpression,
            timezone: input.timezone ?? 'UTC',
            enabled: input.enabled !== undefined ? input.enabled : true,
            defaultInput: input.defaultInput,
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

const disableSchedulesForTarget = async (
    targetId: string,
    triggerType: ScheduleTriggerType,
    workspaceId: string
): Promise<ScheduleRecord | void> => {
    try {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(ScheduleRecord)
        const record = await repo.findOne({ where: { targetId, triggerType, workspaceId } })
        if (!record) return
        record.enabled = false
        await repo.save(record)
        logger.debug(`[ScheduleService]: Disabled schedule for ${triggerType}:${targetId}`)
        return record
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: scheduleService.disableSchedulesForTarget - ${getErrorMessage(error)}`
        )
    }
}

const getAllEnabledSchedules = async (): Promise<ScheduleRecord[]> => {
    try {
        const appServer = getRunningExpressApp()
        return await appServer.AppDataSource.getRepository(ScheduleRecord).find({
            where: { enabled: true }
        })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: scheduleService.getAllEnabledSchedules - ${getErrorMessage(error)}`
        )
    }
}

const updateLastRunAt = async (appDataSource: DataSource, scheduleRecordId: string, lastRunAt: Date): Promise<void> => {
    try {
        await appDataSource.getRepository(ScheduleRecord).update({ id: scheduleRecordId }, { lastRunAt })
    } catch (error) {
        logger.error(`[ScheduleService]: updateLastRunAt failed for ${scheduleRecordId}: ${getErrorMessage(error)}`)
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

export interface VisualPickerInput {
    scheduleFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
    scheduleOnMinute?: string | number
    scheduleOnTime?: string // "HH:mm"
    scheduleOnDayOfWeek?: string // comma-separated "1,3,5" (1=Mon … 7=Sun)
    scheduleOnDayOfMonth?: string // comma-separated "1,15"
}

/**
 * Validate the visual-picker fields and return errors (if any).
 */
export const validateVisualPickerFields = (input: VisualPickerInput): { valid: boolean; error?: string } => {
    const { scheduleFrequency, scheduleOnMinute, scheduleOnTime, scheduleOnDayOfWeek, scheduleOnDayOfMonth } = input

    if (!scheduleFrequency) {
        return { valid: false, error: 'Frequency is required' }
    }
    if (!['hourly', 'daily', 'weekly', 'monthly'].includes(scheduleFrequency)) {
        return { valid: false, error: `Invalid frequency: ${scheduleFrequency}` }
    }

    if (scheduleFrequency === 'hourly') {
        const minute = Number(scheduleOnMinute)
        if (scheduleOnMinute === undefined || scheduleOnMinute === '' || isNaN(minute)) {
            return { valid: false, error: 'On Minute is required for hourly frequency' }
        }
        if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
            return { valid: false, error: 'On Minute must be an integer between 0 and 59' }
        }
    }

    if (['daily', 'weekly', 'monthly'].includes(scheduleFrequency)) {
        if (!scheduleOnTime) {
            return { valid: false, error: 'On Time is required for daily/weekly/monthly frequency' }
        }
        if (!/^\d{2}:\d{2}$/.test(scheduleOnTime)) {
            return { valid: false, error: 'On Time must be in HH:mm format' }
        }
        const [h, m] = scheduleOnTime.split(':').map(Number)
        if (h < 0 || h > 23 || m < 0 || m > 59) {
            return { valid: false, error: 'On Time contains out-of-range values' }
        }
    }

    if (scheduleFrequency === 'weekly') {
        if (!scheduleOnDayOfWeek) {
            return { valid: false, error: 'On Day of Week is required for weekly frequency' }
        }
        const days = scheduleOnDayOfWeek
            .split(',')
            .map((d) => d.trim())
            .filter((d) => d !== '')
        for (const d of days) {
            const n = Number(d)
            if (isNaN(n) || !Number.isInteger(n) || n < 0 || n > 7) {
                return { valid: false, error: `Invalid day of week value: ${d} (expected 0-7)` }
            }
        }
    }

    if (scheduleFrequency === 'monthly') {
        if (!scheduleOnDayOfMonth) {
            return { valid: false, error: 'On Day of Month is required for monthly frequency' }
        }
        const days = scheduleOnDayOfMonth
            .split(',')
            .map((d) => d.trim())
            .filter((d) => d !== '')
        for (const d of days) {
            const n = Number(d)
            if (isNaN(n) || !Number.isInteger(n) || n < 1 || n > 31) {
                return { valid: false, error: `Invalid day of month value: ${d} (expected 1-31)` }
            }
        }
    }

    return { valid: true }
}

/**
 * Convert visual-picker fields into a standard 5-field cron expression.
 * Assumes fields have already been validated via validateVisualPickerFields.
 */
export const buildCronFromVisualPicker = (input: VisualPickerInput): string => {
    const { scheduleFrequency, scheduleOnMinute, scheduleOnTime, scheduleOnDayOfWeek, scheduleOnDayOfMonth } = input

    switch (scheduleFrequency) {
        case 'hourly': {
            // "<minute> * * * *"
            return `${Number(scheduleOnMinute)} * * * *`
        }
        case 'daily': {
            const [h, m] = scheduleOnTime!.split(':').map(Number)
            return `${m} ${h} * * *`
        }
        case 'weekly': {
            const [h, m] = scheduleOnTime!.split(':').map(Number)
            return `${m} ${h} * * ${scheduleOnDayOfWeek}`
        }
        case 'monthly': {
            const [h, m] = scheduleOnTime!.split(':').map(Number)
            return `${m} ${h} ${scheduleOnDayOfMonth} * *`
        }
        default:
            throw new Error(`Unsupported frequency: ${scheduleFrequency}`)
    }
}

/**
 * Unified helper: resolves the cron expression from a Start node's inputs,
 * handling both "cronExpression" and "visualPicker" schedule types.
 * Returns { valid, cronExpression?, error? }.
 */
export const resolveScheduleCron = (inputs: Record<string, any>): { valid: boolean; cronExpression?: string; error?: string } => {
    const scheduleType = (inputs.scheduleType as string) || 'cronExpression'
    const timezone = (inputs.scheduleTimezone as string) || 'UTC'

    if (scheduleType === 'visualPicker') {
        const pickerInput: VisualPickerInput = {
            scheduleFrequency: inputs.scheduleFrequency,
            scheduleOnMinute: inputs.scheduleOnMinute,
            scheduleOnTime: inputs.scheduleOnTime,
            scheduleOnDayOfWeek: inputs.scheduleOnDayOfWeek,
            scheduleOnDayOfMonth: inputs.scheduleOnDayOfMonth
        }
        const pickerResult = validateVisualPickerFields(pickerInput)
        if (!pickerResult.valid) {
            return { valid: false, error: pickerResult.error }
        }
        const cron = buildCronFromVisualPicker(pickerInput)
        // Also validate the resulting cron + timezone
        const cronResult = validateCronExpression(cron, timezone)
        if (!cronResult.valid) {
            return { valid: false, error: cronResult.error }
        }
        return { valid: true, cronExpression: cron }
    }

    // scheduleType === 'cronExpression'
    const expression = inputs.scheduleCronExpression as string
    const cronResult = validateCronExpression(expression, timezone)
    if (!cronResult.valid) {
        return { valid: false, error: cronResult.error }
    }
    return { valid: true, cronExpression: expression }
}

export default {
    validateCronExpression,
    validateVisualPickerFields,
    buildCronFromVisualPicker,
    resolveScheduleCron,
    createOrUpdateSchedule,
    disableSchedulesForTarget,
    getAllEnabledSchedules,
    updateLastRunAt,
    createTriggerLog,
    updateTriggerLog
}
