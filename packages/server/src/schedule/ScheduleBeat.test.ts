/**
 * Unit tests for ScheduleBeat — schedule orchestrator.
 * All external dependencies (node-cron, QueueManager, ScheduleExecutor,
 * getRunningExpressApp, schedule service) are mocked.
 */

// ─── Fixtures (created before mock factories so they can be referenced inside) ─

const mockTask = { stop: jest.fn() }
const mockScheduleQueue = {
    upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
    removeJobScheduler: jest.fn().mockResolvedValue(undefined)
}
const mockSave = jest.fn().mockResolvedValue(undefined)
const mockFindOneBy = jest.fn()
const mockRepo = { findOneBy: mockFindOneBy, save: mockSave }
const mockAppDataSource = { getRepository: jest.fn().mockReturnValue(mockRepo) }
const mockAppServer = {
    AppDataSource: mockAppDataSource,
    nodesPool: { componentNodes: {} },
    telemetry: {},
    cachePool: {},
    usageCacheManager: {},
    sseStreamer: {}
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../database/entities/ScheduleRecord', () => ({
    ScheduleRecord: class ScheduleRecord {},
    ScheduleTriggerType: { AGENTFLOW: 'AGENTFLOW' }
}))
jest.mock('../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn().mockReturnValue(mockAppServer)
}))
jest.mock('../queue/ScheduleQueue', () => ({ ScheduleQueue: class ScheduleQueue {} }))
jest.mock('../queue/QueueManager', () => ({
    QueueManager: {
        getInstance: jest.fn().mockReturnValue({
            getQueue: jest.fn().mockReturnValue(mockScheduleQueue)
        })
    }
}))
jest.mock('./ScheduleExecutor', () => ({ executeScheduleJob: jest.fn().mockResolvedValue(undefined) }))
jest.mock('../services/schedule', () => ({
    __esModule: true,
    default: { getEnabledSchedulesBatch: jest.fn().mockResolvedValue([]) }
}))
jest.mock('../Interface', () => ({ MODE: { QUEUE: 'queue' } }))
jest.mock('../utils/logger', () => ({
    __esModule: true,
    default: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))
jest.mock('node-cron', () => ({
    __esModule: true,
    default: {
        validate: jest.fn().mockReturnValue(true),
        schedule: jest.fn().mockReturnValue(mockTask)
    }
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { ScheduleBeat } from './ScheduleBeat'
import { executeScheduleJob } from './ScheduleExecutor'
import scheduleService from '../services/schedule'
import { QueueManager } from '../queue/QueueManager'
import cron from 'node-cron'

const mockExecuteScheduleJob = executeScheduleJob as jest.Mock
const mockGetEnabledSchedulesBatch = scheduleService.getEnabledSchedulesBatch as jest.Mock
const mockCronValidate = cron.validate as jest.Mock
const mockCronSchedule = cron.schedule as jest.Mock

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'rec-1',
    cronExpression: '* * * * *',
    timezone: 'UTC',
    enabled: true,
    targetId: 'flow-1',
    workspaceId: 'ws-1',
    ...overrides
})

/** Reset singleton and optionally set a MODE env var. */
function resetSingleton(mode?: string) {
    ;(ScheduleBeat as any).instance = undefined
    delete process.env.MODE
    if (mode) process.env.MODE = mode
}

// ─── Global setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks()
    resetSingleton()
    // Re-establish default return values after clearAllMocks
    mockAppDataSource.getRepository.mockReturnValue(mockRepo)
    mockGetEnabledSchedulesBatch.mockResolvedValue([])
    mockCronValidate.mockReturnValue(true)
    mockCronSchedule.mockReturnValue(mockTask)
    mockScheduleQueue.upsertJobScheduler.mockResolvedValue(undefined)
    mockScheduleQueue.removeJobScheduler.mockResolvedValue(undefined)
    ;(QueueManager.getInstance as jest.Mock).mockReturnValue({
        getQueue: jest.fn().mockReturnValue(mockScheduleQueue)
    })
    mockExecuteScheduleJob.mockResolvedValue(undefined)
    mockFindOneBy.mockResolvedValue(null)
    mockSave.mockResolvedValue(undefined)
})

afterEach(() => {
    delete process.env.MODE
})

// ─── getInstance ──────────────────────────────────────────────────────────────

describe('getInstance', () => {
    it('returns the same instance on repeated calls', () => {
        const a = ScheduleBeat.getInstance()
        const b = ScheduleBeat.getInstance()
        expect(a).toBe(b)
    })

    it('creates a fresh instance after singleton reset', () => {
        const a = ScheduleBeat.getInstance()
        resetSingleton()
        const b = ScheduleBeat.getInstance()
        expect(a).not.toBe(b)
    })
})

// ─── init (non-queue mode) ────────────────────────────────────────────────────

describe('init — non-queue mode', () => {
    it('registers cron jobs for all enabled records on init', async () => {
        mockGetEnabledSchedulesBatch.mockResolvedValueOnce([makeRecord()]).mockResolvedValueOnce([])
        const beat = ScheduleBeat.getInstance()
        await beat.init()
        expect(mockCronSchedule).toHaveBeenCalledTimes(1)
    })

    it('logs a warning about no distributed locking', async () => {
        const logger = require('../utils/logger').default
        const beat = ScheduleBeat.getInstance()
        await beat.init()
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('non-queue mode'))
    })
})

// ─── init (queue mode) ───────────────────────────────────────────────────────

describe('init — queue mode', () => {
    beforeEach(() => resetSingleton('queue'))

    it('upserts jobs via ScheduleQueue on init', async () => {
        mockGetEnabledSchedulesBatch.mockResolvedValueOnce([makeRecord()]).mockResolvedValueOnce([])
        const beat = ScheduleBeat.getInstance()
        await beat.init()
        expect(mockScheduleQueue.upsertJobScheduler).toHaveBeenCalledTimes(1)
    })

    it('does not register any node-cron tasks in queue mode', async () => {
        mockGetEnabledSchedulesBatch.mockResolvedValueOnce([makeRecord()]).mockResolvedValueOnce([])
        const beat = ScheduleBeat.getInstance()
        await beat.init()
        expect(mockCronSchedule).not.toHaveBeenCalled()
    })

    it('does not emit the non-queue warning in queue mode', async () => {
        const logger = require('../utils/logger').default
        const beat = ScheduleBeat.getInstance()
        await beat.init()
        expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('non-queue mode'))
    })
})

// ─── onScheduleChanged — delete ───────────────────────────────────────────────

describe('onScheduleChanged — delete action', () => {
    it('removes a registered cron job (non-queue mode)', async () => {
        const beat = ScheduleBeat.getInstance()
        ;(beat as any).cronJobs.set('rec-1', mockTask)

        await beat.onScheduleChanged('rec-1', 'delete')

        expect(mockTask.stop).toHaveBeenCalled()
        expect((beat as any).cronJobs.has('rec-1')).toBe(false)
    })

    it('removes the queue job scheduler (queue mode)', async () => {
        resetSingleton('queue')
        const beat = ScheduleBeat.getInstance()

        await beat.onScheduleChanged('rec-1', 'delete')

        expect(mockScheduleQueue.removeJobScheduler).toHaveBeenCalledWith('rec-1')
    })

    it('does not query the database for a delete action', async () => {
        const beat = ScheduleBeat.getInstance()
        await beat.onScheduleChanged('rec-1', 'delete')
        expect(mockFindOneBy).not.toHaveBeenCalled()
    })
})

// ─── onScheduleChanged — upsert ───────────────────────────────────────────────

describe('onScheduleChanged — upsert action', () => {
    it('removes job when the record is not found', async () => {
        resetSingleton('queue')
        mockFindOneBy.mockResolvedValue(null)
        const beat = ScheduleBeat.getInstance()

        await beat.onScheduleChanged('rec-1', 'upsert')

        expect(mockScheduleQueue.removeJobScheduler).toHaveBeenCalledWith('rec-1')
        expect(mockScheduleQueue.upsertJobScheduler).not.toHaveBeenCalled()
    })

    it('removes job when the record is disabled', async () => {
        resetSingleton('queue')
        mockFindOneBy.mockResolvedValue(makeRecord({ enabled: false }))
        const beat = ScheduleBeat.getInstance()

        await beat.onScheduleChanged('rec-1', 'upsert')

        expect(mockScheduleQueue.removeJobScheduler).toHaveBeenCalledWith('rec-1')
        expect(mockScheduleQueue.upsertJobScheduler).not.toHaveBeenCalled()
    })

    it('upserts the queue job when the record is enabled (queue mode)', async () => {
        resetSingleton('queue')
        const record = makeRecord({ enabled: true })
        mockFindOneBy.mockResolvedValue(record)
        const beat = ScheduleBeat.getInstance()

        await beat.onScheduleChanged('rec-1', 'upsert')

        expect(mockScheduleQueue.upsertJobScheduler).toHaveBeenCalledWith(record)
    })

    it('registers a cron job when the record is enabled (non-queue mode)', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord({ enabled: true }))
        const beat = ScheduleBeat.getInstance()

        await beat.onScheduleChanged('rec-1', 'upsert')

        expect(mockCronSchedule).toHaveBeenCalled()
    })

    it('logs the error and does not throw on unexpected failure', async () => {
        const logger = require('../utils/logger').default
        resetSingleton('queue')
        mockFindOneBy.mockRejectedValue(new Error('db fail'))
        const beat = ScheduleBeat.getInstance()

        await expect(beat.onScheduleChanged('rec-1', 'upsert')).resolves.toBeUndefined()
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('onScheduleChanged error'))
    })
})

// ─── shutdown ─────────────────────────────────────────────────────────────────

describe('shutdown', () => {
    it('stops all registered cron tasks', async () => {
        const beat = ScheduleBeat.getInstance()
        const task1 = { stop: jest.fn() }
        const task2 = { stop: jest.fn() }
        ;(beat as any).cronJobs.set('rec-1', task1)
        ;(beat as any).cronJobs.set('rec-2', task2)

        await beat.shutdown()

        expect(task1.stop).toHaveBeenCalled()
        expect(task2.stop).toHaveBeenCalled()
    })

    it('clears the cronJobs map after shutdown', async () => {
        const beat = ScheduleBeat.getInstance()
        ;(beat as any).cronJobs.set('rec-1', { stop: jest.fn() })

        await beat.shutdown()

        expect((beat as any).cronJobs.size).toBe(0)
    })

    it('resolves without error when there are no cron tasks', async () => {
        const beat = ScheduleBeat.getInstance()
        await expect(beat.shutdown()).resolves.toBeUndefined()
    })
})

// ─── _syncAllJobs — non-queue mode ────────────────────────────────────────────

describe('_syncAllJobs — non-queue mode', () => {
    it('stops and clears existing cron jobs before syncing', async () => {
        const beat = ScheduleBeat.getInstance()
        const existingTask = { stop: jest.fn() }
        ;(beat as any).cronJobs.set('old-rec', existingTask)

        await (beat as any)._syncAllJobs()

        expect(existingTask.stop).toHaveBeenCalled()
        expect((beat as any).cronJobs.has('old-rec')).toBe(false)
    })

    it('registers all records returned in the first batch', async () => {
        const beat = ScheduleBeat.getInstance()
        mockGetEnabledSchedulesBatch.mockResolvedValueOnce([makeRecord({ id: 'r1' }), makeRecord({ id: 'r2' })]).mockResolvedValueOnce([])

        await (beat as any)._syncAllJobs()

        expect(mockCronSchedule).toHaveBeenCalledTimes(2)
    })

    it('pages through multiple batches until empty', async () => {
        const beat = ScheduleBeat.getInstance()
        mockGetEnabledSchedulesBatch
            .mockResolvedValueOnce([makeRecord({ id: 'r1' })])
            .mockResolvedValueOnce([makeRecord({ id: 'r2' })])
            .mockResolvedValueOnce([])

        await (beat as any)._syncAllJobs()

        expect(mockCronSchedule).toHaveBeenCalledTimes(2)
    })

    it('advances skip by batch size on each page', async () => {
        const beat = ScheduleBeat.getInstance()
        mockGetEnabledSchedulesBatch
            .mockResolvedValueOnce([makeRecord()])
            .mockResolvedValueOnce([makeRecord({ id: 'r2' })])
            .mockResolvedValueOnce([])

        await (beat as any)._syncAllJobs()

        expect(mockGetEnabledSchedulesBatch).toHaveBeenNthCalledWith(1, 0)
        expect(mockGetEnabledSchedulesBatch).toHaveBeenNthCalledWith(2, 1)
        expect(mockGetEnabledSchedulesBatch).toHaveBeenNthCalledWith(3, 2)
    })

    it('registers no jobs when there are no enabled schedules', async () => {
        const beat = ScheduleBeat.getInstance()
        await (beat as any)._syncAllJobs()
        expect(mockCronSchedule).not.toHaveBeenCalled()
    })
})

// ─── _syncAllJobs — queue mode ────────────────────────────────────────────────

describe('_syncAllJobs — queue mode', () => {
    beforeEach(() => resetSingleton('queue'))

    it('does not stop existing cron jobs in queue mode', async () => {
        const beat = ScheduleBeat.getInstance()
        const existingTask = { stop: jest.fn() }
        ;(beat as any).cronJobs.set('old-rec', existingTask)

        await (beat as any)._syncAllJobs()

        expect(existingTask.stop).not.toHaveBeenCalled()
    })

    it('upserts all records via ScheduleQueue', async () => {
        const beat = ScheduleBeat.getInstance()
        mockGetEnabledSchedulesBatch.mockResolvedValueOnce([makeRecord({ id: 'r1' }), makeRecord({ id: 'r2' })]).mockResolvedValueOnce([])

        await (beat as any)._syncAllJobs()

        expect(mockScheduleQueue.upsertJobScheduler).toHaveBeenCalledTimes(2)
        expect(mockCronSchedule).not.toHaveBeenCalled()
    })
})

// ─── _upsertCronJob ───────────────────────────────────────────────────────────

describe('_upsertCronJob', () => {
    it('registers a new cron task with correct expression and timezone', () => {
        const beat = ScheduleBeat.getInstance()
        ;(beat as any)._upsertCronJob(makeRecord())

        expect(mockCronSchedule).toHaveBeenCalledWith('* * * * *', expect.any(Function), { timezone: 'UTC' })
        expect((beat as any).cronJobs.get('rec-1')).toBe(mockTask)
    })

    it('stops the existing task before registering a replacement', () => {
        const beat = ScheduleBeat.getInstance()
        const oldTask = { stop: jest.fn() }
        ;(beat as any).cronJobs.set('rec-1', oldTask)
        ;(beat as any)._upsertCronJob(makeRecord())

        expect(oldTask.stop).toHaveBeenCalled()
        expect((beat as any).cronJobs.get('rec-1')).toBe(mockTask)
    })

    it('skips registration when cron expression is invalid', () => {
        const beat = ScheduleBeat.getInstance()
        mockCronValidate.mockReturnValue(false)
        ;(beat as any)._upsertCronJob(makeRecord({ cronExpression: 'not-valid' }))

        expect(mockCronSchedule).not.toHaveBeenCalled()
        expect((beat as any).cronJobs.has('rec-1')).toBe(false)
    })

    it('defaults timezone to UTC when record.timezone is null', () => {
        const beat = ScheduleBeat.getInstance()
        ;(beat as any)._upsertCronJob(makeRecord({ timezone: null }))

        expect(mockCronSchedule).toHaveBeenCalledWith(expect.anything(), expect.any(Function), { timezone: 'UTC' })
    })

    it('fires _onCronFire when the cron task triggers', async () => {
        const beat = ScheduleBeat.getInstance()
        const onCronFire = jest.spyOn(beat as any, '_onCronFire').mockResolvedValue(undefined)

        ;(beat as any)._upsertCronJob(makeRecord())

        // Extract and invoke the cron callback captured by cron.schedule
        const cronCallback = mockCronSchedule.mock.calls[0][1] as () => void
        cronCallback()
        // Allow any pending microtasks to flush
        await new Promise((r) => setImmediate(r))

        expect(onCronFire).toHaveBeenCalledWith('rec-1')
        onCronFire.mockRestore()
    })

    // ── `L` (last day of month) compatibility with node-cron ───────────

    it('expands `L` in DOM field to `28-31` before handing the cron expression to node-cron', () => {
        const beat = ScheduleBeat.getInstance()
        ;(beat as any)._upsertCronJob(makeRecord({ cronExpression: '0 9 L * *' }))

        // node-cron is the one that does not understand L; it must receive the expanded expression.
        expect(mockCronValidate).toHaveBeenCalledWith('0 9 28-31 * *')
        expect(mockCronSchedule).toHaveBeenCalledWith('0 9 28-31 * *', expect.any(Function), { timezone: 'UTC' })
    })

    it('expands `L` correctly inside a comma-separated DOM list', () => {
        const beat = ScheduleBeat.getInstance()
        ;(beat as any)._upsertCronJob(makeRecord({ cronExpression: '0 9 1,15,L * *' }))

        expect(mockCronSchedule).toHaveBeenCalledWith('0 9 1,15,28-31 * *', expect.any(Function), { timezone: 'UTC' })
    })

    it('expands `L` correctly when the last day of the month is specified and L special character', () => {
        const beat = ScheduleBeat.getInstance()
        ;(beat as any)._upsertCronJob(makeRecord({ cronExpression: '0 9 31,L * *' }))

        // L should be expanded to 28-31 even if 31 is already present, to ensure the runtime filter logic works correctly.
        expect(mockCronSchedule).toHaveBeenCalledWith('0 9 28-31 * *', expect.any(Function), { timezone: 'UTC' })
    })

    it('skips firing on candidate days that are not actually the last day of the month', () => {
        const beat = ScheduleBeat.getInstance()
        const onCronFire = jest.spyOn(beat as any, '_onCronFire').mockResolvedValue(undefined)

        // Register an L-based cron. node-cron will fire on 28/29/30/31 every month;
        // ScheduleBeat must filter out the spurious days.
        ;(beat as any)._upsertCronJob(makeRecord({ cronExpression: '0 9 L * *' }))
        const cronCallback = mockCronSchedule.mock.calls[0][1] as () => void

        // Pretend node-cron fired on Jan 30 2025 — Jan has 31 days, so this is NOT the last day.
        jest.useFakeTimers().setSystemTime(new Date('2025-01-30T09:00:00Z'))
        cronCallback()
        expect(onCronFire).not.toHaveBeenCalled()

        // Now Jan 31 2025 — the actual last day.
        jest.setSystemTime(new Date('2025-01-31T09:00:00Z'))
        cronCallback()
        expect(onCronFire).toHaveBeenCalledWith('rec-1')

        jest.useRealTimers()
        onCronFire.mockRestore()
    })

    it('does not apply runtime DOM filtering when the original expression has no L', () => {
        const beat = ScheduleBeat.getInstance()
        const onCronFire = jest.spyOn(beat as any, '_onCronFire').mockResolvedValue(undefined)

        ;(beat as any)._upsertCronJob(makeRecord({ cronExpression: '0 9 * * 1-5' }))
        const cronCallback = mockCronSchedule.mock.calls[0][1] as () => void

        // Any date should fire because there is no DOM filter to reject it.
        jest.useFakeTimers().setSystemTime(new Date('2025-01-30T09:00:00Z'))
        cronCallback()
        expect(onCronFire).toHaveBeenCalledWith('rec-1')

        jest.useRealTimers()
        onCronFire.mockRestore()
    })

    it('passes the schedule timezone through to the runtime DOM filter', () => {
        const beat = ScheduleBeat.getInstance()
        const onCronFire = jest.spyOn(beat as any, '_onCronFire').mockResolvedValue(undefined)

        ;(beat as any)._upsertCronJob(makeRecord({ cronExpression: '0 9 L * *', timezone: 'America/New_York' }))
        expect(mockCronSchedule).toHaveBeenCalledWith('0 9 28-31 * *', expect.any(Function), { timezone: 'America/New_York' })
        const cronCallback = mockCronSchedule.mock.calls[0][1] as () => void

        // 2025-02-01T03:00:00Z is Jan 31 22:00 in America/New_York → last day in the schedule's tz
        jest.useFakeTimers().setSystemTime(new Date('2025-02-01T03:00:00Z'))
        cronCallback()
        expect(onCronFire).toHaveBeenCalledWith('rec-1')

        jest.useRealTimers()
        onCronFire.mockRestore()
    })
})

// ─── _removeCronJob ───────────────────────────────────────────────────────────

describe('_removeCronJob', () => {
    it('stops and removes an existing cron task', () => {
        const beat = ScheduleBeat.getInstance()
        const task = { stop: jest.fn() }
        ;(beat as any).cronJobs.set('rec-1', task)
        ;(beat as any)._removeCronJob('rec-1')

        expect(task.stop).toHaveBeenCalled()
        expect((beat as any).cronJobs.has('rec-1')).toBe(false)
    })

    it('is a no-op when the record has no registered task', () => {
        const beat = ScheduleBeat.getInstance()
        expect(() => (beat as any)._removeCronJob('nonexistent')).not.toThrow()
    })
})

// ─── _onCronFire ──────────────────────────────────────────────────────────────

describe('_onCronFire', () => {
    it('calls executeScheduleJob with the correct execution context', async () => {
        const beat = ScheduleBeat.getInstance()

        await (beat as any)._onCronFire('rec-1')

        expect(mockExecuteScheduleJob).toHaveBeenCalledWith(
            {
                appDataSource: mockAppDataSource,
                componentNodes: {},
                telemetry: {},
                cachePool: {},
                usageCacheManager: {},
                sseStreamer: {}
            },
            'rec-1',
            expect.objectContaining({
                onRecordNotFoundOrDisabled: expect.any(Function),
                onRecordExpiredOrInvalid: expect.any(Function)
            })
        )
    })

    it('onRecordNotFoundOrDisabled callback removes the cron job', async () => {
        const beat = ScheduleBeat.getInstance()
        const task = { stop: jest.fn() }
        ;(beat as any).cronJobs.set('rec-1', task)

        let capturedCallbacks: any
        mockExecuteScheduleJob.mockImplementation(async (_ctx: any, _id: string, callbacks: any) => {
            capturedCallbacks = callbacks
        })

        await (beat as any)._onCronFire('rec-1')
        capturedCallbacks.onRecordNotFoundOrDisabled('rec-1')

        expect(task.stop).toHaveBeenCalled()
        expect((beat as any).cronJobs.has('rec-1')).toBe(false)
    })

    it('onRecordExpiredOrInvalid callback sets enabled=false and saves the record', async () => {
        const beat = ScheduleBeat.getInstance()
        const record = makeRecord({ enabled: true }) as any

        let capturedCallbacks: any
        mockExecuteScheduleJob.mockImplementation(async (_ctx: any, _id: string, callbacks: any) => {
            capturedCallbacks = callbacks
        })

        await (beat as any)._onCronFire('rec-1')
        await capturedCallbacks.onRecordExpiredOrInvalid(record)

        expect(record.enabled).toBe(false)
        expect(mockSave).toHaveBeenCalledWith(record)
    })

    it('onRecordExpiredOrInvalid callback removes the cron job', async () => {
        const beat = ScheduleBeat.getInstance()
        const task = { stop: jest.fn() }
        ;(beat as any).cronJobs.set('rec-1', task)
        const record = makeRecord({ enabled: true }) as any

        let capturedCallbacks: any
        mockExecuteScheduleJob.mockImplementation(async (_ctx: any, _id: string, callbacks: any) => {
            capturedCallbacks = callbacks
        })

        await (beat as any)._onCronFire('rec-1')
        await capturedCallbacks.onRecordExpiredOrInvalid(record)

        expect(task.stop).toHaveBeenCalled()
        expect((beat as any).cronJobs.has('rec-1')).toBe(false)
    })

    it('uses record.id (not the fired schedule id) when removing job in onRecordExpiredOrInvalid', async () => {
        const beat = ScheduleBeat.getInstance()
        const task = { stop: jest.fn() }
        ;(beat as any).cronJobs.set('rec-different', task)
        const record = makeRecord({ id: 'rec-different', enabled: true }) as any

        let capturedCallbacks: any
        mockExecuteScheduleJob.mockImplementation(async (_ctx: any, _id: string, callbacks: any) => {
            capturedCallbacks = callbacks
        })

        await (beat as any)._onCronFire('rec-different')
        await capturedCallbacks.onRecordExpiredOrInvalid(record)

        expect(task.stop).toHaveBeenCalled()
    })
})
