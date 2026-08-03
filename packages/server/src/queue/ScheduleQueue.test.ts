/**
 * Unit tests for ScheduleQueue.
 * All external dependencies (BullMQ, RedisEventPublisher, ScheduleExecutor)
 * are mocked so no real Redis or database connection is needed.
 */

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockBullQueue = {
    upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
    removeJobScheduler: jest.fn().mockResolvedValue(undefined)
}
const mockSave = jest.fn().mockResolvedValue(undefined)
const mockRepo = { save: mockSave }
const mockAppDataSource = { getRepository: jest.fn().mockReturnValue(mockRepo) }
const mockRedisPublisher = { connect: jest.fn().mockResolvedValue(undefined) }

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => mockBullQueue),
    QueueEvents: jest.fn().mockImplementation(() => ({})),
    Worker: jest.fn().mockImplementation(() => ({}))
}))
jest.mock('./RedisEventPublisher', () => ({
    RedisEventPublisher: jest.fn().mockImplementation(() => mockRedisPublisher)
}))
jest.mock('../schedule/ScheduleExecutor', () => ({ executeScheduleJob: jest.fn().mockResolvedValue(undefined) }))
jest.mock('../database/entities/ScheduleRecord', () => ({
    ScheduleRecord: class ScheduleRecord {}
}))
jest.mock('../utils/logger', () => ({
    __esModule: true,
    default: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))
jest.mock('flowise-components', () => ({}), { virtual: true })
jest.mock('../Interface', () => ({}), { virtual: true })
jest.mock('../Interface.Schedule', () => ({}), { virtual: true })
jest.mock('../utils/telemetry', () => ({ Telemetry: class Telemetry {} }))
jest.mock('../CachePool', () => ({ CachePool: class CachePool {} }))
jest.mock('../UsageCacheManager', () => ({ UsageCacheManager: class UsageCacheManager {} }))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { ScheduleQueue } from './ScheduleQueue'
import { executeScheduleJob } from '../schedule/ScheduleExecutor'
import { RedisEventPublisher } from './RedisEventPublisher'

const mockExecuteScheduleJob = executeScheduleJob as jest.Mock

// ─── Factory helpers ──────────────────────────────────────────────────────────

const CONNECTION = { host: 'localhost', port: 6379 }
const OPTIONS = {
    appDataSource: mockAppDataSource as any,
    telemetry: {} as any,
    cachePool: {} as any,
    componentNodes: {} as any,
    usageCacheManager: {} as any,
    identityManager: {} as any
}

function makeQueue(name = 'schedule') {
    return new ScheduleQueue(name, CONNECTION, OPTIONS)
}

const makeRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'rec-1',
    targetId: 'flow-1',
    cronExpression: '* * * * *',
    timezone: 'UTC',
    defaultInput: 'hello',
    workspaceId: 'ws-1',
    enabled: true,
    ...overrides
})

beforeEach(() => {
    jest.clearAllMocks()
    mockBullQueue.upsertJobScheduler.mockResolvedValue(undefined)
    mockBullQueue.removeJobScheduler.mockResolvedValue(undefined)
    mockAppDataSource.getRepository.mockReturnValue(mockRepo)
    mockSave.mockResolvedValue(undefined)
    mockExecuteScheduleJob.mockResolvedValue(undefined)
    mockRedisPublisher.connect.mockResolvedValue(undefined)
})

// ─── constructor ──────────────────────────────────────────────────────────────

describe('constructor', () => {
    it('constructs without throwing', () => {
        expect(() => makeQueue()).not.toThrow()
    })

    it('creates a RedisEventPublisher and calls connect()', () => {
        makeQueue()
        expect(RedisEventPublisher).toHaveBeenCalledTimes(1)
        expect(mockRedisPublisher.connect).toHaveBeenCalledTimes(1)
    })
})

// ─── getQueueName ─────────────────────────────────────────────────────────────

describe('getQueueName', () => {
    it('returns the name passed to the constructor', () => {
        expect(makeQueue('my-queue').getQueueName()).toBe('my-queue')
    })
})

// ─── getQueue ─────────────────────────────────────────────────────────────────

describe('getQueue', () => {
    it('returns the underlying BullMQ Queue instance', () => {
        const q = makeQueue()
        expect(q.getQueue()).toBe(mockBullQueue)
    })
})

// ─── processJob ───────────────────────────────────────────────────────────────

describe('processJob', () => {
    it('calls executeScheduleJob with the scheduleRecordId from job data', async () => {
        const q = makeQueue()
        await q.processJob({ scheduleRecordId: 'rec-1' } as any)

        expect(mockExecuteScheduleJob).toHaveBeenCalledWith(
            expect.objectContaining({ appDataSource: mockAppDataSource }),
            'rec-1',
            expect.objectContaining({
                onRecordNotFoundOrDisabled: expect.any(Function),
                onRecordExpiredOrInvalid: expect.any(Function)
            })
        )
    })

    it('passes the RedisEventPublisher instance as sseStreamer', async () => {
        const q = makeQueue()
        await q.processJob({ scheduleRecordId: 'rec-1' } as any)

        expect(mockExecuteScheduleJob).toHaveBeenCalledWith(
            expect.objectContaining({ sseStreamer: mockRedisPublisher }),
            expect.anything(),
            expect.anything()
        )
    })

    it('returns the result from executeScheduleJob', async () => {
        mockExecuteScheduleJob.mockResolvedValue({ answer: 'done' })
        const q = makeQueue()
        const result = await q.processJob({ scheduleRecordId: 'rec-1' } as any)
        expect(result).toEqual({ answer: 'done' })
    })

    it('onRecordNotFoundOrDisabled callback removes the job scheduler', async () => {
        const q = makeQueue()
        let capturedCallbacks: any

        mockExecuteScheduleJob.mockImplementation(async (_ctx: any, _id: string, callbacks: any) => {
            capturedCallbacks = callbacks
        })

        await q.processJob({ scheduleRecordId: 'rec-1' } as any)
        await capturedCallbacks.onRecordNotFoundOrDisabled()

        expect(mockBullQueue.removeJobScheduler).toHaveBeenCalledWith('schedule:rec-1')
    })

    it('onRecordExpiredOrInvalid callback sets enabled=false, saves record, and removes job scheduler', async () => {
        const q = makeQueue()
        const record = makeRecord({ enabled: true }) as any
        let capturedCallbacks: any

        mockExecuteScheduleJob.mockImplementation(async (_ctx: any, _id: string, callbacks: any) => {
            capturedCallbacks = callbacks
        })

        await q.processJob({ scheduleRecordId: 'rec-1' } as any)
        await capturedCallbacks.onRecordExpiredOrInvalid(record)

        expect(record.enabled).toBe(false)
        expect(mockSave).toHaveBeenCalledWith(record)
        expect(mockBullQueue.removeJobScheduler).toHaveBeenCalledWith('schedule:rec-1')
    })
})

// ─── upsertJobScheduler ───────────────────────────────────────────────────────

describe('upsertJobScheduler', () => {
    it('calls queue.upsertJobScheduler with the correct scheduler id', async () => {
        const q = makeQueue()
        await q.upsertJobScheduler(makeRecord() as any)

        expect(mockBullQueue.upsertJobScheduler).toHaveBeenCalledWith('schedule:rec-1', expect.anything(), expect.anything())
    })

    it('sets the repeat pattern and timezone from the record', async () => {
        const record = makeRecord({ cronExpression: '0 9 * * 1-5', timezone: 'America/New_York' })
        const q = makeQueue()
        await q.upsertJobScheduler(record as any)

        expect(mockBullQueue.upsertJobScheduler).toHaveBeenCalledWith(
            expect.anything(),
            { pattern: '0 9 * * 1-5', tz: 'America/New_York' },
            expect.anything()
        )
    })

    it('defaults timezone to UTC when record.timezone is null', async () => {
        const q = makeQueue()
        await q.upsertJobScheduler(makeRecord({ timezone: null }) as any)

        expect(mockBullQueue.upsertJobScheduler).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ tz: 'UTC' }),
            expect.anything()
        )
    })

    it('includes scheduleRecordId, targetId, and workspaceId in job data', async () => {
        const q = makeQueue()
        await q.upsertJobScheduler(makeRecord() as any)

        expect(mockBullQueue.upsertJobScheduler).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
                data: expect.objectContaining({
                    scheduleRecordId: 'rec-1',
                    targetId: 'flow-1',
                    workspaceId: 'ws-1'
                })
            })
        )
    })

    it('sets defaultInput from the record', async () => {
        const q = makeQueue()
        await q.upsertJobScheduler(makeRecord({ defaultInput: 'run report' }) as any)

        expect(mockBullQueue.upsertJobScheduler).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ data: expect.objectContaining({ defaultInput: 'run report' }) })
        )
    })

    it('sets defaultInput to undefined when record.defaultInput is null', async () => {
        const q = makeQueue()
        await q.upsertJobScheduler(makeRecord({ defaultInput: null }) as any)

        expect(mockBullQueue.upsertJobScheduler).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ data: expect.objectContaining({ defaultInput: undefined }) })
        )
    })

    it('uses the scheduler id as the job name', async () => {
        const q = makeQueue()
        await q.upsertJobScheduler(makeRecord() as any)

        expect(mockBullQueue.upsertJobScheduler).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({ name: 'schedule:rec-1' })
        )
    })
})

// ─── removeJobScheduler ───────────────────────────────────────────────────────

describe('removeJobScheduler', () => {
    it('calls queue.removeJobScheduler with the correct scheduler id', async () => {
        const q = makeQueue()
        await q.removeJobScheduler('rec-1')

        expect(mockBullQueue.removeJobScheduler).toHaveBeenCalledWith('schedule:rec-1')
    })

    it('does not throw when the underlying call fails (swallows error)', async () => {
        mockBullQueue.removeJobScheduler.mockRejectedValue(new Error('redis fail'))
        const q = makeQueue()
        await expect(q.removeJobScheduler('rec-1')).resolves.toBeUndefined()
    })

    it('logs a warning when removeJobScheduler fails', async () => {
        const logger = require('../utils/logger').default
        mockBullQueue.removeJobScheduler.mockRejectedValue(new Error('redis fail'))
        const q = makeQueue()
        await q.removeJobScheduler('rec-1')
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('rec-1'))
    })
})
