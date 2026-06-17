/**
 * Unit tests for ScheduleExecutor — shared schedule job execution logic.
 * All external dependencies (TypeORM, agentflow runner, schedule service)
 * are mocked so no real database or Express app is needed.
 */

// ─── Infrastructure mocks ─────────────────────────────────────────────────────

jest.mock('../database/entities/ScheduleRecord', () => ({
    ScheduleRecord: class ScheduleRecord {},
    ScheduleTriggerType: { AGENTFLOW: 'AGENTFLOW' }
}))
jest.mock('../database/entities/ScheduleTriggerLog', () => ({
    ScheduleTriggerLog: class ScheduleTriggerLog {},
    ScheduleTriggerStatus: {
        QUEUED: 'QUEUED',
        RUNNING: 'RUNNING',
        SUCCEEDED: 'SUCCEEDED',
        FAILED: 'FAILED',
        SKIPPED: 'SKIPPED'
    }
}))
jest.mock('../database/entities/ChatFlow', () => ({ ChatFlow: class ChatFlow {} }))
jest.mock('../utils/buildAgentflow', () => ({ executeAgentFlow: jest.fn() }))
jest.mock('../services/schedule', () => ({
    __esModule: true,
    default: {
        isScheduleInputValid: jest.fn().mockReturnValue(true),
        createTriggerLog: jest.fn(),
        updateTriggerLog: jest.fn(),
        updateScheduleAfterRun: jest.fn()
    }
}))
jest.mock('../utils/logger', () => ({
    __esModule: true,
    default: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))
jest.mock('flowise-components', () => ({}), { virtual: true })
jest.mock(
    '../Interface',
    () => ({
        ChatType: {
            INTERNAL: 'INTERNAL',
            EXTERNAL: 'EXTERNAL',
            EVALUATION: 'EVALUATION',
            MCP: 'MCP',
            SCHEDULED: 'SCHEDULED'
        }
    }),
    { virtual: true }
)
jest.mock('../utils/telemetry', () => ({ Telemetry: class Telemetry {} }))
jest.mock('../CachePool', () => ({ CachePool: class CachePool {} }))
jest.mock('../UsageCacheManager', () => ({ UsageCacheManager: class UsageCacheManager {} }))
jest.mock('../IdentityManager', () => ({ IdentityManager: class IdentityManager {} }))
jest.mock('../utils/quotaUsage', () => ({
    checkPredictions: jest.fn(),
    updatePredictionsUsage: jest.fn()
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { executeScheduleJob } from './ScheduleExecutor'
import { executeAgentFlow } from '../utils/buildAgentflow'
import scheduleService from '../services/schedule'
import { ScheduleTriggerType } from '../database/entities/ScheduleRecord'
import { ScheduleTriggerStatus } from '../database/entities/ScheduleTriggerLog'

const mockExecuteAgentFlow = executeAgentFlow as jest.Mock

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal ScheduleRecord-like object */
const makeRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'rec-1',
    targetId: 'flow-1',
    triggerType: ScheduleTriggerType.AGENTFLOW,
    cronExpression: '* * * * *',
    timezone: 'UTC',
    enabled: true,
    workspaceId: 'ws-1',
    scheduleInputMode: 'text' as const,
    defaultInput: 'hello',
    endDate: undefined as Date | undefined,
    nextRunAt: undefined as Date | undefined,
    ...overrides
})

/** Minimal ChatFlow-like object of AGENTFLOW type */
const makeChatFlow = (overrides: Record<string, unknown> = {}) => ({
    id: 'flow-1',
    type: 'AGENTFLOW',
    workspaceId: 'ws-1',
    ...overrides
})

// ─── Test fixture setup ───────────────────────────────────────────────────────

let mockFindOneBy: jest.Mock
let mockWorkspaceFindOneBy: jest.Mock
let mockOrgFindOneBy: jest.Mock
let mockAppDataSource: { getRepository: jest.Mock }
let mockCtx: any

beforeEach(() => {
    jest.clearAllMocks()

    mockFindOneBy = jest.fn()
    mockWorkspaceFindOneBy = jest.fn().mockResolvedValue({ id: 'ws-1', organizationId: 'org-1' })
    mockOrgFindOneBy = jest.fn().mockResolvedValue({ id: 'org-1', subscriptionId: 'sub-1' })
    mockAppDataSource = {
        getRepository: jest.fn().mockImplementation((Entity: any) => {
            const name = Entity?.name ?? ''
            if (name === 'Workspace') return { findOneBy: mockWorkspaceFindOneBy }
            if (name === 'Organization') return { findOneBy: mockOrgFindOneBy }
            return { findOneBy: mockFindOneBy }
        })
    }
    mockCtx = {
        appDataSource: mockAppDataSource,
        componentNodes: {},
        telemetry: {},
        cachePool: {},
        usageCacheManager: {},
        sseStreamer: {},
        identityManager: { getProductIdFromSubscription: jest.fn().mockResolvedValue('prod-1') }
    }
    ;(scheduleService.isScheduleInputValid as jest.Mock).mockReturnValue(true)
    ;(scheduleService.createTriggerLog as jest.Mock).mockResolvedValue({ id: 'log-1' })
    ;(scheduleService.updateTriggerLog as jest.Mock).mockResolvedValue(undefined)
    ;(scheduleService.updateScheduleAfterRun as jest.Mock).mockResolvedValue(undefined)
})

// ─── executeScheduleJob: record-not-found branch ──────────────────────────────

describe('executeScheduleJob — record not found', () => {
    it('returns undefined when the record does not exist', async () => {
        mockFindOneBy.mockResolvedValue(null)

        const result = await executeScheduleJob(mockCtx, 'rec-1')

        expect(result).toBeUndefined()
    })

    it('calls onRecordNotFoundOrDisabled when record is missing', async () => {
        mockFindOneBy.mockResolvedValue(null)
        const onRecordNotFoundOrDisabled = jest.fn()

        await executeScheduleJob(mockCtx, 'rec-1', { onRecordNotFoundOrDisabled })

        expect(onRecordNotFoundOrDisabled).toHaveBeenCalledWith('rec-1')
    })

    it('does not create a trigger log when the record is missing', async () => {
        mockFindOneBy.mockResolvedValue(null)

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(scheduleService.createTriggerLog).not.toHaveBeenCalled()
    })

    it('does not throw when no callbacks are provided', async () => {
        mockFindOneBy.mockResolvedValue(null)

        await expect(executeScheduleJob(mockCtx, 'rec-1')).resolves.toBeUndefined()
    })
})

// ─── executeScheduleJob: record disabled branch ───────────────────────────────

describe('executeScheduleJob — record disabled', () => {
    it('returns undefined when the record is disabled', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord({ enabled: false }))

        const result = await executeScheduleJob(mockCtx, 'rec-1')

        expect(result).toBeUndefined()
    })

    it('calls onRecordNotFoundOrDisabled with the record id', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord({ enabled: false }))
        const onRecordNotFoundOrDisabled = jest.fn()

        await executeScheduleJob(mockCtx, 'rec-1', { onRecordNotFoundOrDisabled })

        expect(onRecordNotFoundOrDisabled).toHaveBeenCalledWith('rec-1')
    })

    it('creates a SKIPPED trigger log for a disabled record', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord({ enabled: false }))

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(scheduleService.createTriggerLog).toHaveBeenCalledWith(
            expect.objectContaining({
                appDataSource: mockAppDataSource,
                scheduleRecordId: 'rec-1',
                status: ScheduleTriggerStatus.SKIPPED,
                targetId: 'flow-1',
                workspaceId: 'ws-1'
            })
        )
    })

    it('falls back to AGENTFLOW trigger type when record.triggerType is null', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord({ enabled: false, triggerType: null }))

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(scheduleService.createTriggerLog).toHaveBeenCalledWith(
            expect.objectContaining({ triggerType: ScheduleTriggerType.AGENTFLOW })
        )
    })
})

// ─── executeScheduleJob: expired / invalid-input branch ───────────────────────

describe('executeScheduleJob — expired or invalid input', () => {
    it('returns undefined when end date has passed', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord({ endDate: new Date(Date.now() - 60_000) }))

        const result = await executeScheduleJob(mockCtx, 'rec-1')

        expect(result).toBeUndefined()
    })

    it('calls onRecordExpiredOrInvalid when end date has passed', async () => {
        const record = makeRecord({ endDate: new Date(Date.now() - 60_000) })
        mockFindOneBy.mockResolvedValue(record)
        const onRecordExpiredOrInvalid = jest.fn()

        await executeScheduleJob(mockCtx, 'rec-1', { onRecordExpiredOrInvalid })

        expect(onRecordExpiredOrInvalid).toHaveBeenCalledWith(record)
    })

    it('creates a SKIPPED log when end date has passed', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord({ endDate: new Date(Date.now() - 60_000) }))

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(scheduleService.createTriggerLog).toHaveBeenCalledWith(expect.objectContaining({ status: ScheduleTriggerStatus.SKIPPED }))
    })

    it('returns undefined when default input is invalid', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord())
        ;(scheduleService.isScheduleInputValid as jest.Mock).mockReturnValue(false)

        const result = await executeScheduleJob(mockCtx, 'rec-1')

        expect(result).toBeUndefined()
    })

    it('calls onRecordExpiredOrInvalid when default input is invalid', async () => {
        const record = makeRecord()
        mockFindOneBy.mockResolvedValue(record)
        ;(scheduleService.isScheduleInputValid as jest.Mock).mockReturnValue(false)
        const onRecordExpiredOrInvalid = jest.fn()

        await executeScheduleJob(mockCtx, 'rec-1', { onRecordExpiredOrInvalid })

        expect(onRecordExpiredOrInvalid).toHaveBeenCalledWith(record)
    })

    it('creates a SKIPPED log when default input is invalid', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord())
        ;(scheduleService.isScheduleInputValid as jest.Mock).mockReturnValue(false)

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(scheduleService.createTriggerLog).toHaveBeenCalledWith(expect.objectContaining({ status: ScheduleTriggerStatus.SKIPPED }))
    })

    it('does not execute the agentflow when input is invalid', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord())
        ;(scheduleService.isScheduleInputValid as jest.Mock).mockReturnValue(false)

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(mockExecuteAgentFlow).not.toHaveBeenCalled()
    })
})

// ─── executeScheduleJob: nextRunAt guard ──────────────────────────────────────

describe('executeScheduleJob — nextRunAt guard', () => {
    it('returns undefined when nextRunAt is in the future', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord({ nextRunAt: new Date(Date.now() + 60_000) }))

        const result = await executeScheduleJob(mockCtx, 'rec-1')

        expect(result).toBeUndefined()
    })

    it('creates a SKIPPED log when nextRunAt is in the future', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord({ nextRunAt: new Date(Date.now() + 60_000) }))

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(scheduleService.createTriggerLog).toHaveBeenCalledWith(expect.objectContaining({ status: ScheduleTriggerStatus.SKIPPED }))
    })

    it('does NOT call onRecordExpiredOrInvalid for the nextRunAt guard', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord({ nextRunAt: new Date(Date.now() + 60_000) }))
        const onRecordExpiredOrInvalid = jest.fn()

        await executeScheduleJob(mockCtx, 'rec-1', { onRecordExpiredOrInvalid })

        expect(onRecordExpiredOrInvalid).not.toHaveBeenCalled()
    })

    it('does not execute the agentflow when nextRunAt is in the future', async () => {
        mockFindOneBy.mockResolvedValue(makeRecord({ nextRunAt: new Date(Date.now() + 60_000) }))

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(mockExecuteAgentFlow).not.toHaveBeenCalled()
    })

    it('proceeds to execution when nextRunAt is in the past', async () => {
        const record = makeRecord({ nextRunAt: new Date(Date.now() - 60_000) })
        const chatflow = makeChatFlow()
        mockFindOneBy.mockResolvedValueOnce(record).mockResolvedValueOnce(chatflow)
        mockExecuteAgentFlow.mockResolvedValue({})

        const result = await executeScheduleJob(mockCtx, 'rec-1')

        expect(mockExecuteAgentFlow).toHaveBeenCalled()
        expect(result).toBeDefined()
    })
})

// ─── executeScheduleJob: successful execution ─────────────────────────────────

describe('executeScheduleJob — successful execution', () => {
    it('returns the agentflow result', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({ executionId: 'exec-1', answer: 'done' })

        const result = await executeScheduleJob(mockCtx, 'rec-1')

        expect(result).toEqual({ executionId: 'exec-1', answer: 'done' })
    })

    it('creates a RUNNING trigger log before executing', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(scheduleService.createTriggerLog).toHaveBeenCalledWith(expect.objectContaining({ status: ScheduleTriggerStatus.RUNNING }))
    })

    it('updates the trigger log with SUCCEEDED status and executionId', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({ executionId: 'exec-42' })

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(scheduleService.updateTriggerLog).toHaveBeenCalledWith(
            mockAppDataSource,
            'log-1',
            expect.objectContaining({
                status: ScheduleTriggerStatus.SUCCEEDED,
                executionId: 'exec-42',
                elapsedTimeMs: expect.any(Number)
            })
        )
    })

    it('calls updateScheduleAfterRun with cron and timezone', async () => {
        const record = makeRecord({ cronExpression: '0 9 * * 1-5', timezone: 'America/New_York' })
        mockFindOneBy.mockResolvedValueOnce(record).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(scheduleService.updateScheduleAfterRun).toHaveBeenCalledWith(mockAppDataSource, 'rec-1', '0 9 * * 1-5', 'America/New_York')
    })

    it('uses record defaultInput as the agentflow question', async () => {
        const record = makeRecord({ defaultInput: 'run daily report' })
        mockFindOneBy.mockResolvedValueOnce(record).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(mockExecuteAgentFlow).toHaveBeenCalledWith(
            expect.objectContaining({
                incomingInput: expect.objectContaining({ question: 'run daily report' })
            })
        )
    })

    it('passes correct flags to executeAgentFlow', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(mockExecuteAgentFlow).toHaveBeenCalledWith(
            expect.objectContaining({
                isInternal: true,
                chatType: 'SCHEDULED',
                incomingInput: expect.objectContaining({ streaming: false })
            })
        )
        // isTool is not set — scheduled runs are not tool invocations
        expect(mockExecuteAgentFlow.mock.calls[0][0].isTool).toBeUndefined()
    })

    it('uses chatflow.workspaceId when set', async () => {
        mockFindOneBy
            .mockResolvedValueOnce(makeRecord({ workspaceId: 'ws-record' }))
            .mockResolvedValueOnce(makeChatFlow({ workspaceId: 'ws-flow' }))
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(mockExecuteAgentFlow).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 'ws-flow' }))
    })

    it('falls back to record.workspaceId when chatflow.workspaceId is null', async () => {
        mockFindOneBy
            .mockResolvedValueOnce(makeRecord({ workspaceId: 'ws-record' }))
            .mockResolvedValueOnce(makeChatFlow({ workspaceId: null }))
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(mockExecuteAgentFlow).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 'ws-record' }))
    })

    it('sets executionId to undefined when result has no executionId field', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({ answer: 'no id here' })

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(scheduleService.updateTriggerLog).toHaveBeenCalledWith(
            mockAppDataSource,
            'log-1',
            expect.objectContaining({ executionId: undefined })
        )
    })

    it('uses empty string as question when defaultInput is falsy', async () => {
        const record = makeRecord({ defaultInput: '' })
        mockFindOneBy.mockResolvedValueOnce(record).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1')

        expect(mockExecuteAgentFlow).toHaveBeenCalledWith(
            expect.objectContaining({ incomingInput: expect.objectContaining({ question: '' }) })
        )
    })
})

// ─── executeScheduleJob: scheduleInputMode variants ───────────────────────────

describe('executeScheduleJob — scheduleInputMode', () => {
    it('text mode (default): passes defaultInput as incomingInput.question', async () => {
        const record = makeRecord({ scheduleInputMode: 'text', defaultInput: 'daily summary' })
        mockFindOneBy.mockResolvedValueOnce(record).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1')

        const call = mockExecuteAgentFlow.mock.calls[0][0]
        expect(call.incomingInput.question).toBe('daily summary')
        expect(call.incomingInput.form).toBeUndefined()
    })

    it('form mode: parses defaultForm JSON into incomingInput.form and omits question', async () => {
        const record = makeRecord({
            scheduleInputMode: 'form',
            defaultInput: '',
            defaultForm: JSON.stringify({ team: 'engineering', metric: 'p95' })
        })
        mockFindOneBy.mockResolvedValueOnce(record).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1')

        const call = mockExecuteAgentFlow.mock.calls[0][0]
        expect(call.incomingInput.form).toEqual({ team: 'engineering', metric: 'p95' })
        expect(call.incomingInput.question).toBeUndefined()
    })

    it('form mode: falls back to {} when defaultForm is missing', async () => {
        const record = makeRecord({ scheduleInputMode: 'form', defaultInput: '', defaultForm: undefined })
        mockFindOneBy.mockResolvedValueOnce(record).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1')

        const call = mockExecuteAgentFlow.mock.calls[0][0]
        expect(call.incomingInput.form).toEqual({})
    })

    it('form mode: falls back to {} when defaultForm is invalid JSON', async () => {
        const record = makeRecord({ scheduleInputMode: 'form', defaultInput: '', defaultForm: '{not valid json' })
        mockFindOneBy.mockResolvedValueOnce(record).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1')

        const call = mockExecuteAgentFlow.mock.calls[0][0]
        expect(call.incomingInput.form).toEqual({})
    })

    it('none mode: passes a single-space sentinel as question (not empty string) and no form, and does not auto-disable', async () => {
        // Important: form/none must not go through isScheduleInputValid at all.
        ;(scheduleService.isScheduleInputValid as jest.Mock).mockReturnValue(false)
        const onRecordExpiredOrInvalid = jest.fn()
        const record = makeRecord({ scheduleInputMode: 'none', defaultInput: '' })
        mockFindOneBy.mockResolvedValueOnce(record).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1', { onRecordExpiredOrInvalid })

        const call = mockExecuteAgentFlow.mock.calls[0][0]
        // Single-space sentinel — empty string would be filtered out by downstream Agent nodes.
        expect(call.incomingInput.question).toBe(' ')
        expect(call.incomingInput.form).toBeUndefined()
        expect(onRecordExpiredOrInvalid).not.toHaveBeenCalled()
    })

    it('form mode: bypasses isScheduleInputValid guard (save path already validated)', async () => {
        ;(scheduleService.isScheduleInputValid as jest.Mock).mockReturnValue(false)
        const onRecordExpiredOrInvalid = jest.fn()
        const record = makeRecord({
            scheduleInputMode: 'form',
            defaultInput: '',
            defaultForm: JSON.stringify({ a: 1 })
        })
        mockFindOneBy.mockResolvedValueOnce(record).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockResolvedValue({})

        await executeScheduleJob(mockCtx, 'rec-1', { onRecordExpiredOrInvalid })

        expect(mockExecuteAgentFlow).toHaveBeenCalled()
        expect(onRecordExpiredOrInvalid).not.toHaveBeenCalled()
    })
})

// ─── executeScheduleJob: ChatFlow not found ───────────────────────────────────

describe('executeScheduleJob — ChatFlow not found', () => {
    it('re-throws an error when the ChatFlow does not exist', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(null)

        await expect(executeScheduleJob(mockCtx, 'rec-1')).rejects.toThrow('ChatFlow flow-1 not found')
    })

    it('updates trigger log with FAILED status when ChatFlow is missing', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(null)

        await expect(executeScheduleJob(mockCtx, 'rec-1')).rejects.toThrow()

        expect(scheduleService.updateTriggerLog).toHaveBeenCalledWith(
            mockAppDataSource,
            'log-1',
            expect.objectContaining({
                status: ScheduleTriggerStatus.FAILED,
                error: expect.stringContaining('not found')
            })
        )
    })

    it('does not call updateScheduleAfterRun when ChatFlow is missing', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(null)

        await expect(executeScheduleJob(mockCtx, 'rec-1')).rejects.toThrow()

        expect(scheduleService.updateScheduleAfterRun).not.toHaveBeenCalled()
    })
})

// ─── executeScheduleJob: ChatFlow wrong type ──────────────────────────────────

describe('executeScheduleJob — ChatFlow wrong type', () => {
    it('re-throws an error when ChatFlow is not of type AGENTFLOW', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(makeChatFlow({ type: 'CHATFLOW' }))

        await expect(executeScheduleJob(mockCtx, 'rec-1')).rejects.toThrow('not of type AGENTFLOW')
    })

    it('updates trigger log with FAILED status', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(makeChatFlow({ type: 'CHATFLOW' }))

        await expect(executeScheduleJob(mockCtx, 'rec-1')).rejects.toThrow()

        expect(scheduleService.updateTriggerLog).toHaveBeenCalledWith(
            mockAppDataSource,
            'log-1',
            expect.objectContaining({ status: ScheduleTriggerStatus.FAILED })
        )
    })
})

// ─── executeScheduleJob: agentflow execution error ────────────────────────────

describe('executeScheduleJob — agentflow execution error', () => {
    it('re-throws the error from executeAgentFlow', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockRejectedValue(new Error('execution failed'))

        await expect(executeScheduleJob(mockCtx, 'rec-1')).rejects.toThrow('execution failed')
    })

    it('updates trigger log with FAILED, error message, and elapsedTimeMs', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockRejectedValue(new Error('execution failed'))

        await expect(executeScheduleJob(mockCtx, 'rec-1')).rejects.toThrow()

        expect(scheduleService.updateTriggerLog).toHaveBeenCalledWith(
            mockAppDataSource,
            'log-1',
            expect.objectContaining({
                status: ScheduleTriggerStatus.FAILED,
                error: 'execution failed',
                elapsedTimeMs: expect.any(Number)
            })
        )
    })

    it('handles non-Error thrown values (string)', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockRejectedValue('something went wrong')

        await expect(executeScheduleJob(mockCtx, 'rec-1')).rejects.toBe('something went wrong')

        expect(scheduleService.updateTriggerLog).toHaveBeenCalledWith(
            mockAppDataSource,
            'log-1',
            expect.objectContaining({ status: ScheduleTriggerStatus.FAILED, error: 'something went wrong' })
        )
    })

    it('does not call updateScheduleAfterRun on execution failure', async () => {
        mockFindOneBy.mockResolvedValueOnce(makeRecord()).mockResolvedValueOnce(makeChatFlow())
        mockExecuteAgentFlow.mockRejectedValue(new Error('fail'))

        await expect(executeScheduleJob(mockCtx, 'rec-1')).rejects.toThrow()

        expect(scheduleService.updateScheduleAfterRun).not.toHaveBeenCalled()
    })
})
