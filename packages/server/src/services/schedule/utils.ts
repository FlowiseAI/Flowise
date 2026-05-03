/**
 * Pure utility functions for schedule management.
 * No server, database, or Express dependencies — safe to import and test in isolation.
 */

import type { ScheduleInputMode } from '../../Interface'

// ─── Cron expression validation ──────────────────────────────────────────────

const MIN_SCHEDULE_INTERVAL_SECONDS = Math.max(1, parseInt(process.env.MIN_SCHEDULE_INTERVAL_SECONDS || '60', 10) || 60)

/**
 * Validates a cron expression and returns parsed info.
 * Uses a lightweight regex-based check without external dependencies.
 *
 * Supports extended 6-field cron: second minute hour day month weekday
 */
export const validateCronExpression = (
    expression: string,
    timezone: string = 'UTC',
    minIntervalSeconds: number = MIN_SCHEDULE_INTERVAL_SECONDS
): { valid: boolean; error?: string } => {
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

    // Validate a single cron field: supports *, numbers, ranges (n-m), steps (*/s, n/s, n-m/s), and comma-separated lists.
    // When `allowL` is true, also accepts the standalone `L` token (used for the day-of-month field to mean "last day of month").
    const validateCronField = (field: string, min: number, max: number, allowL: boolean = false): boolean => {
        const parts = field.split(',')
        if (parts.some((p) => p === '')) return false // catches leading/trailing/consecutive commas

        for (const part of parts) {
            if (allowL && part === 'L') continue
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
    // Day-of-month is at position 2 (5-field) or 3 (6-field). Allow `L` only there.
    const domIndex = fields.length === 6 ? 3 : 2
    for (let i = 0; i < fields.length; i++) {
        if (!validateCronField(fields[i], ranges[i][0], ranges[i][1], i === domIndex)) {
            return { valid: false, error: `Invalid cron field at position ${i + 1}: "${fields[i]}"` }
        }
    }

    // For 6-field cron, verify the seconds field doesn't cause firing more frequently than minIntervalSeconds
    if (fields.length === 6 && minIntervalSeconds > 1) {
        const secondsField = fields[0]
        // Expand the seconds field to all matching values in [0, 59]
        const matchingSeconds: number[] = []
        const seen = new Set<number>()
        for (const part of secondsField.split(',')) {
            if (part.includes('/')) {
                const [rangeStr, stepStr] = part.split('/')
                const step = parseInt(stepStr, 10)
                let start: number, end: number
                if (rangeStr === '*') {
                    start = 0
                    end = 59
                } else if (rangeStr.includes('-')) {
                    ;[start, end] = rangeStr.split('-').map(Number)
                } else {
                    start = parseInt(rangeStr, 10)
                    end = 59
                }
                for (let v = start; v <= end; v += step) {
                    if (!seen.has(v)) {
                        seen.add(v)
                        matchingSeconds.push(v)
                    }
                }
            } else if (part === '*') {
                for (let v = 0; v <= 59; v++) {
                    if (!seen.has(v)) {
                        seen.add(v)
                        matchingSeconds.push(v)
                    }
                }
            } else if (part.includes('-')) {
                const [s, e] = part.split('-').map(Number)
                for (let v = s; v <= e; v++) {
                    if (!seen.has(v)) {
                        seen.add(v)
                        matchingSeconds.push(v)
                    }
                }
            } else {
                const v = parseInt(part, 10)
                if (!seen.has(v)) {
                    seen.add(v)
                    matchingSeconds.push(v)
                }
            }
        }
        matchingSeconds.sort((a, b) => a - b)

        if (matchingSeconds.length > 1) {
            // Compute the minimum gap between consecutive matching seconds (including wrap-around)
            let minGap = 60 - matchingSeconds[matchingSeconds.length - 1] + matchingSeconds[0]
            for (let i = 1; i < matchingSeconds.length; i++) {
                minGap = Math.min(minGap, matchingSeconds[i] - matchingSeconds[i - 1])
            }
            if (minGap < minIntervalSeconds) {
                return {
                    valid: false,
                    error: `Cron expression fires every ${minGap}s which is below the minimum interval of ${minIntervalSeconds}s`
                }
            }
        }
    }

    return { valid: true }
}

// ---------------------------------------------------------------------------
// Cron field helpers (used by computeNextRunAt)
// ---------------------------------------------------------------------------
function _matchCronField(field: string, value: number, min: number): boolean {
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
                const start = parseInt(rangeStr, 10)
                if (value >= start && (value - start) % step === 0) return true
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

/**
 * Day-of-month matcher that additionally supports the `L` token, which fires only on the
 * last day of the current month. Other parts (numbers, ranges, lists, steps) fall through
 * to `_matchCronField`.
 */
function _matchDomField(field: string, dom: number, lastDay: number): boolean {
    if (field === '*') return true
    for (const part of field.split(',')) {
        if (part === 'L') {
            if (dom === lastDay) return true
            continue
        }
        if (_matchCronField(part, dom, 1)) return true
    }
    return false
}

interface _ParsedCronFields {
    minuteField: string
    hourField: string
    domField: string
    monthField: string
    dowField: string
}

/** Parse a cron expression once so fields can be reused across many date checks. */
function _parseCronFields(expression: string): _ParsedCronFields {
    const fields = expression.trim().split(/\s+/)
    const offset = fields.length === 6 ? 1 : 0
    return {
        minuteField: fields[0 + offset],
        hourField: fields[1 + offset],
        domField: fields[2 + offset],
        monthField: fields[3 + offset],
        dowField: fields[4 + offset]
    }
}

/**
 * Check whether a pre-parsed cron matches `date`, using a pre-built Intl.DateTimeFormat for TZ conversion.
 * Both `parsed` and `fmt` should be created once outside any hot loop.
 */
function _cronMatchesParsed(parsed: _ParsedCronFields, date: Date, fmt: Intl.DateTimeFormat): boolean {
    let minute: number, hour: number, dom: number, month: number, dow: number, year: number
    try {
        const parts = fmt.formatToParts(date)
        const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)
        const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
        minute = get('minute')
        hour = get('hour') % 24
        dom = get('day')
        month = get('month')
        year = get('year')
        dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayStr)
        if (dow === -1) dow = date.getUTCDay()
    } catch {
        minute = date.getUTCMinutes()
        hour = date.getUTCHours()
        dom = date.getUTCDate()
        month = date.getUTCMonth() + 1
        year = date.getUTCFullYear()
        dow = date.getUTCDay()
    }
    // Last day of the (TZ-local) month: `new Date(year, month, 0)` rolls to the last day of `month`
    // because day 0 of the next month equals the last day of the current month.
    const lastDay = new Date(year, month, 0).getDate()
    const dowMatches = _matchCronField(parsed.dowField, dow, 0) || (dow === 0 && _matchCronField(parsed.dowField, 7, 0))
    return (
        _matchCronField(parsed.minuteField, minute, 0) &&
        _matchCronField(parsed.hourField, hour, 0) &&
        _matchDomField(parsed.domField, dom, lastDay) &&
        _matchCronField(parsed.monthField, month, 1) &&
        dowMatches
    )
}

/**
 * Computes the next Date after `after` (defaults to now) when the cron expression will fire.
 *
 * For 5-field cron expressions, searches minute-by-minute up to 1 year ahead.
 *
 * For 6-field cron expressions (with seconds), finds the next matching minute first,
 * then resolves the exact second within that minute. This supports sub-minute schedules
 * such as every 15 or 30 seconds (default minimum safe threshold: 60 seconds).
 *
 * The Intl.DateTimeFormat instance and parsed cron fields are created once before the loop
 * to avoid repeated allocations on every iteration.
 */
export const computeNextRunAt = (cronExpression: string, timezone: string = 'UTC', after?: Date): Date | null => {
    const fields = cronExpression.trim().split(/\s+/)
    const hasSeconds = fields.length === 6

    const start = new Date(after ? after.getTime() : Date.now())

    // Hoist allocations outside the loop
    const parsed = _parseCronFields(cronExpression)
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        weekday: 'short',
        hour12: false
    })

    if (!hasSeconds) {
        // ── 5-field cron: minute-level search ──────────────────────────────
        start.setSeconds(0, 0)
        start.setMinutes(start.getMinutes() + 1)

        const maxIterations = 60 * 24 * 366 // up to ~1 year of minutes
        for (let i = 0; i < maxIterations; i++) {
            const candidate = new Date(start.getTime() + i * 60_000)
            if (_cronMatchesParsed(parsed, candidate, fmt)) {
                return candidate
            }
        }
        return null
    }

    // ── 6-field cron: second-level search ──────────────────────────────────
    const secondField = fields[0]

    // Snap to the start of the next second
    start.setMilliseconds(0)
    start.setSeconds(start.getSeconds() + 1)

    // Determine the first minute boundary and the second offset within it
    const firstMinuteMs = start.getTime() - (start.getTime() % 60_000)
    const firstSecondOffset = Math.round((start.getTime() - firstMinuteMs) / 1000)

    const maxMinuteIterations = 60 * 24 * 366 // up to ~1 year of minutes
    for (let i = 0; i < maxMinuteIterations; i++) {
        const minuteMs = firstMinuteMs + i * 60_000
        const minuteDate = new Date(minuteMs)

        if (!_cronMatchesParsed(parsed, minuteDate, fmt)) continue

        // This minute matches — find the first matching second
        // For the first iteration, skip seconds before our start time
        const secStart = i === 0 ? firstSecondOffset : 0
        for (let s = secStart; s <= 59; s++) {
            if (_matchCronField(secondField, s, 0)) {
                return new Date(minuteMs + s * 1000)
            }
        }
    }
    return null
}

// ─── node-cron compatibility helpers (`L` token) ──────────────────────────────

/**
 * `node-cron` does not understand the `L` token (last day of month). To stay
 * compatible across both BullMQ (cron-parser, supports `L`) and node-cron
 * scheduling backends, expand any standalone `L` part in the day-of-month
 * field to the candidate range `28-31`, while leaving the rest of the
 * expression untouched.
 *
 * The expanded expression is *only* meant to be handed to `node-cron`; the
 * original (un-expanded) expression should still be used for any actual
 * "does this date match?" decision via {@link cronDomMatchesNow}.
 *
 * @returns `{ expression, hasL }` — `expression` is the expanded cron string
 * (or the input verbatim if there was nothing to expand); `hasL` indicates
 * whether the input contained `L` and therefore needs runtime DOM filtering.
 */
export const expandCronLForNodeCron = (cronExpression: string): { expression: string; hasL: boolean } => {
    const fields = cronExpression.trim().split(/\s+/)
    if (fields.length !== 5 && fields.length !== 6) {
        return { expression: cronExpression, hasL: false }
    }
    const domIdx = fields.length === 6 ? 3 : 2
    const domField = fields[domIdx]
    const parts = domField.split(',')
    const hasL = parts.includes('L')
    if (!hasL) return { expression: cronExpression, hasL: false }

    // L expands to `28-31`, so drop any user-specified parts that are already
    // covered by that range to avoid redundant entries like `31,28-31`.
    // Ranges/steps that aren't fully inside [28, 31] are left untouched —
    // node-cron will simply union them with the appended `28-31` part.
    const kept: string[] = []
    for (const p of parts) {
        if (p === 'L') continue
        if (/^\d+$/.test(p)) {
            const n = parseInt(p, 10)
            if (n >= 28 && n <= 31) continue
        } else {
            const rangeMatch = /^(\d+)-(\d+)$/.exec(p)
            if (rangeMatch) {
                const a = parseInt(rangeMatch[1], 10)
                const b = parseInt(rangeMatch[2], 10)
                if (a >= 28 && b <= 31) continue
            }
        }
        kept.push(p)
    }
    kept.push('28-31')
    fields[domIdx] = kept.join(',')
    return { expression: fields.join(' '), hasL: true }
}

/**
 * Verify that the given `date`'s day-of-month (interpreted in `timezone`)
 * satisfies the day-of-month field of the *original* cron expression,
 * including the `L` token. Used to filter false-positive fires from
 * `node-cron` after expanding `L` → `28-31` via {@link expandCronLForNodeCron}.
 *
 * Returns `true` when the DOM matches (fire is legitimate) or when the
 * original expression contains no `L` (no filtering needed).
 */
export const cronDomMatchesNow = (cronExpression: string, date: Date = new Date(), timezone: string = 'UTC'): boolean => {
    const parsed = _parseCronFields(cronExpression)

    // Extract DOM, month, year in the schedule's timezone so leap-year and
    // DST month boundaries are honoured.
    let dom: number, month: number, year: number
    try {
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        })
        const parts = fmt.formatToParts(date)
        const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)
        dom = get('day')
        month = get('month')
        year = get('year')
    } catch {
        dom = date.getUTCDate()
        month = date.getUTCMonth() + 1
        year = date.getUTCFullYear()
    }

    // Day 0 of next month == last day of current month.
    const lastDay = new Date(year, month, 0).getDate()
    return _matchDomField(parsed.domField, dom, lastDay)
}

// ─── Visual Picker helpers ────────────────────────────────────────────────────

export interface VisualPickerInput {
    scheduleFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
    scheduleOnMinute?: string | number
    scheduleOnTime?: string // "HH:mm"
    scheduleOnDayOfWeek?: string // comma-separated "1,3,5" (1=Mon … 6=Sat, 7=Sun)
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
            if (isNaN(n) || !Number.isInteger(n) || n < 1 || n > 7) {
                return { valid: false, error: `Invalid day of week value: ${d} (expected 1-7)` }
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
            if (d === 'L') continue // "Last Day of month" token
            const n = Number(d)
            if (isNaN(n) || !Number.isInteger(n) || n < 1 || n > 31) {
                return { valid: false, error: `Invalid day of month value: ${d} (expected 1-31 or L)` }
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

/**
 * Mode-aware schedule input validator.
 *  - 'text': requires a non-empty defaultInput (treats `<p></p>` — the rich-text empty marker — as empty).
 *  - 'form': requires at least one field defined in scheduleFormInputTypes.
 *  - 'none': always valid (flow opts out of receiving input).
 *
 */
export const isScheduleInputValid = (mode: ScheduleInputMode, defaultInput?: string, scheduleFormInputTypes?: any[]): boolean => {
    if (mode === 'none') return true
    if (mode === 'form') return Array.isArray(scheduleFormInputTypes) && scheduleFormInputTypes.length > 0
    return !!defaultInput && defaultInput !== '<p></p>'
}

/**
 * Determines if a schedule can be enabled based on its inputs: cron validity,
 * end date (must be in the future if set), and mode-specific input validity.
 */
export const canScheduleEnable = (inputs: Record<string, any>): boolean => {
    const cronResult = resolveScheduleCron(inputs)
    const isEndDateValid = !inputs.scheduleEndDate || new Date(inputs.scheduleEndDate) > new Date()
    const mode = inputs.scheduleInputMode
    if (!mode) return false
    const isInputValid = isScheduleInputValid(mode, inputs.scheduleDefaultInput, inputs.scheduleFormInputTypes)
    return cronResult.valid && isEndDateValid && isInputValid
}
