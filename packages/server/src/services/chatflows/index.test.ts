/**
 * Unit tests for chatflowsService.saveChatflow and chatflowsService.updateChatflow.
 * All infrastructure (TypeORM, ScheduleService, ScheduleBeat, telemetry, etc.)
 * is mocked — no DB or Express app required.
 */

// ─── Shared repo mock ─────────────────────────────────────────────────────────

const mockRepo = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    merge: jest.fn(),
    countBy: jest.fn(),
    createQueryBuilder: jest.fn()
}

const mockAppServer = {
    AppDataSource: {
        getRepository: jest.fn().mockReturnValue(mockRepo)
    },
    telemetry: {
        sendTelemetry: jest.fn().mockResolvedValue(undefined)
    },
    identityManager: {
        getProductIdFromSubscription: jest.fn().mockResolvedValue('prod-1')
    },
    metricsProvider: {
        incrementCounter: jest.fn()
    },
    usageCacheManager: {}
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn().mockReturnValue(mockAppServer)
}))
jest.mock('../../database/entities/ChatFlow', () => ({
    ChatFlow: class ChatFlow {},
    EnumChatflowType: { AGENTFLOW: 'AGENTFLOW', CHATFLOW: 'CHATFLOW', MULTIAGENT: 'MULTIAGENT' }
}))
jest.mock('../../database/entities/ChatMessage', () => ({ ChatMessage: class ChatMessage {} }))
jest.mock('../../database/entities/ChatMessageFeedback', () => ({ ChatMessageFeedback: class ChatMessageFeedback {} }))
jest.mock('../../database/entities/UpsertHistory', () => ({ UpsertHistory: class UpsertHistory {} }))
jest.mock('../../database/entities/ScheduleRecord', () => ({
    ScheduleRecord: class ScheduleRecord {},
    ScheduleTriggerType: { AGENTFLOW: 'AGENTFLOW' }
}))
jest.mock('../../enterprise/database/entities/workspace.entity', () => ({ Workspace: class Workspace {} }))
jest.mock('../../enterprise/utils/ControllerServiceUtils', () => ({ getWorkspaceSearchOptions: jest.fn().mockReturnValue({}) }))
jest.mock('../../errors/internalFlowiseError', () => ({
    InternalFlowiseError: class InternalFlowiseError extends Error {
        constructor(public statusCode: number, message: string) {
            super(message)
            this.name = 'InternalFlowiseError'
        }
    }
}))
jest.mock('../../errors/utils', () => ({ getErrorMessage: (e: unknown) => String(e) }))
jest.mock('../../services/documentstore', () => ({
    __esModule: true,
    default: { updateDocumentStoreUsage: jest.fn().mockResolvedValue(undefined) }
}))
jest.mock('../../utils', () => ({
    constructGraphs: jest.fn().mockReturnValue({ graph: {}, nodeDependencies: {} }),
    getAppVersion: jest.fn().mockResolvedValue('1.0.0'),
    getEndingNodes: jest.fn().mockReturnValue([]),
    getTelemetryFlowObj: jest.fn().mockReturnValue({}),
    isFlowValidForStream: jest.fn().mockReturnValue(false)
}))
jest.mock('../../utils/fileValidation', () => ({
    sanitizeAllowedUploadMimeTypesFromConfig: jest.fn((x: string) => x)
}))
jest.mock('../../utils/fileRepository', () => ({
    containsBase64File: jest.fn().mockReturnValue(false),
    updateFlowDataWithFilePaths: jest.fn().mockImplementation(async (_id: string, fd: string) => fd)
}))
jest.mock('../../utils/sanitizeFlowData', () => ({
    sanitizeFlowDataForPublicEndpoint: jest.fn().mockReturnValue('{}')
}))
jest.mock('../../utils/getUploadsConfig', () => ({ utilGetUploadsConfig: jest.fn().mockResolvedValue(null) }))
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}))
jest.mock('../../utils/quotaUsage', () => ({ updateStorageUsage: jest.fn().mockResolvedValue(undefined) }))
jest.mock('../../services/schedule', () => ({
    __esModule: true,
    default: {
        resolveScheduleCron: jest.fn().mockReturnValue({ valid: true, cronExpression: '* * * * *' }),
        canScheduleEnable: jest.fn().mockReturnValue(true),
        createOrUpdateSchedule: jest.fn().mockResolvedValue({ id: 'sched-1', enabled: true }),
        deleteScheduleForTarget: jest.fn().mockResolvedValue(undefined)
    }
}))
jest.mock('../../schedule/ScheduleBeat', () => ({
    ScheduleBeat: {
        getInstance: jest.fn().mockReturnValue({
            onScheduleChanged: jest.fn().mockResolvedValue(undefined)
        })
    }
}))
jest.mock('flowise-components', () => ({ removeFolderFromStorage: jest.fn().mockResolvedValue({ totalSize: 0 }) }), { virtual: true })
jest.mock('uuid', () => ({ validate: jest.fn().mockReturnValue(true) }))
jest.mock('http-status-codes', () => ({
    StatusCodes: { OK: 200, BAD_REQUEST: 400, NOT_FOUND: 404, INTERNAL_SERVER_ERROR: 500 }
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import chatflowsService from './index'
import scheduleService from '../../services/schedule'
import { ScheduleBeat } from '../../schedule/ScheduleBeat'
import { containsBase64File } from '../../utils/fileRepository'
import { EnumChatflowType } from '../../database/entities/ChatFlow'
import { ScheduleTriggerType } from '../../database/entities/ScheduleRecord'

const mockContainsBase64File = containsBase64File as jest.Mock
const mockCreateOrUpdateSchedule = scheduleService.createOrUpdateSchedule as jest.Mock
const mockDeleteScheduleForTarget = scheduleService.deleteScheduleForTarget as jest.Mock
const mockResolveScheduleCron = scheduleService.resolveScheduleCron as jest.Mock
const mockCanScheduleEnable = scheduleService.canScheduleEnable as jest.Mock

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal scheduleInput AGENTFLOW flowData JSON */
const makeScheduleFlowData = (inputs: Record<string, unknown> = {}) =>
    JSON.stringify({
        nodes: [
            {
                id: 'start-0',
                data: {
                    name: 'startAgentflow',
                    inputs: {
                        startInputType: 'scheduleInput',
                        scheduleCronExpression: '* * * * *',
                        scheduleTimezone: 'UTC',
                        scheduleInputMode: 'text',
                        scheduleDefaultInput: 'hello',
                        ...inputs
                    }
                }
            }
        ],
        edges: []
    })

/** Build a non-schedule AGENTFLOW flowData JSON (chatInput start) */
const makeChatInputFlowData = () =>
    JSON.stringify({
        nodes: [{ id: 'start-0', data: { name: 'startAgentflow', inputs: { startInputType: 'chatInput' } } }],
        edges: []
    })

/** Build a plain (non-agentflow) flowData JSON */
const makePlainFlowData = () => JSON.stringify({ nodes: [], edges: [] })

const makeChatflow = (overrides: Record<string, unknown> = {}) => ({
    id: 'flow-1',
    type: EnumChatflowType.AGENTFLOW,
    flowData: makeScheduleFlowData(),
    workspaceId: 'ws-1',
    chatbotConfig: undefined,
    ...overrides
})

const SAVE_ARGS = {
    orgId: 'org-1',
    workspaceId: 'ws-1',
    subscriptionId: 'sub-1',
    usageCacheManager: {} as any
}

beforeEach(() => {
    jest.clearAllMocks()
    mockAppServer.AppDataSource.getRepository.mockReturnValue(mockRepo)
    mockRepo.create.mockImplementation((x: unknown) => x)
    mockRepo.save.mockResolvedValue(makeChatflow())
    mockRepo.merge.mockImplementation((_existing: any, updates: any) => ({ ...makeChatflow(), ...updates }))
    mockContainsBase64File.mockReturnValue(false)
    mockCreateOrUpdateSchedule.mockResolvedValue({ id: 'sched-1', enabled: true })
    mockDeleteScheduleForTarget.mockResolvedValue(undefined)
    mockResolveScheduleCron.mockReturnValue({ valid: true, cronExpression: '* * * * *' })
    mockCanScheduleEnable.mockReturnValue(true)
    ;(ScheduleBeat.getInstance as jest.Mock).mockReturnValue({
        onScheduleChanged: jest.fn().mockResolvedValue(undefined)
    })
})

// ─── saveChatflow ─────────────────────────────────────────────────────────────

describe('saveChatflow', () => {
    it('saves and returns the chatflow', async () => {
        const newFlow = makeChatflow({ type: EnumChatflowType.AGENTFLOW })
        const saved = makeChatflow()
        mockRepo.save.mockResolvedValue(saved)

        const result = await chatflowsService.saveChatflow(
            newFlow as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        expect(mockRepo.save).toHaveBeenCalled()
        expect(result).toBe(saved)
    })

    it('throws BAD_REQUEST for an invalid chatflow type', async () => {
        const badFlow = makeChatflow({ type: 'INVALID_TYPE' })

        await expect(
            chatflowsService.saveChatflow(
                badFlow as any,
                SAVE_ARGS.orgId,
                SAVE_ARGS.workspaceId,
                SAVE_ARGS.subscriptionId,
                SAVE_ARGS.usageCacheManager
            )
        ).rejects.toMatchObject({ statusCode: 400 })
    })

    // ── schedule sync (AGENTFLOW + scheduleInput) ────────────────────────────

    it('creates or updates the schedule when the start node is scheduleInput', async () => {
        const newFlow = makeChatflow()
        mockRepo.save.mockResolvedValue(makeChatflow({ flowData: makeScheduleFlowData() }))

        await chatflowsService.saveChatflow(
            newFlow as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        expect(mockCreateOrUpdateSchedule).toHaveBeenCalledWith(
            expect.objectContaining({
                triggerType: ScheduleTriggerType.AGENTFLOW,
                targetId: 'flow-1',
                workspaceId: 'ws-1'
            })
        )
    })

    it('calls onScheduleChanged upsert when the schedule is enabled', async () => {
        mockRepo.save.mockResolvedValue(makeChatflow({ flowData: makeScheduleFlowData() }))
        mockCreateOrUpdateSchedule.mockResolvedValue({ id: 'sched-1', enabled: true })
        mockCanScheduleEnable.mockReturnValue(true)

        await chatflowsService.saveChatflow(
            makeChatflow() as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        const beat = ScheduleBeat.getInstance()
        expect(beat.onScheduleChanged).toHaveBeenCalledWith('sched-1', 'upsert')
    })

    it('does NOT call onScheduleChanged when the schedule is disabled', async () => {
        mockRepo.save.mockResolvedValue(makeChatflow({ flowData: makeScheduleFlowData() }))
        mockCreateOrUpdateSchedule.mockResolvedValue({ id: 'sched-1', enabled: false })
        mockCanScheduleEnable.mockReturnValue(false)

        await chatflowsService.saveChatflow(
            makeChatflow() as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        const beat = ScheduleBeat.getInstance()
        expect(beat.onScheduleChanged).not.toHaveBeenCalled()
    })

    it('passes scheduleEndDate as a Date when set in flowData', async () => {
        const futureDate = new Date(Date.now() + 86_400_000).toISOString()
        mockRepo.save.mockResolvedValue(makeChatflow({ flowData: makeScheduleFlowData({ scheduleEndDate: futureDate }) }))

        await chatflowsService.saveChatflow(
            makeChatflow() as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        expect(mockCreateOrUpdateSchedule).toHaveBeenCalledWith(expect.objectContaining({ endDate: expect.any(Date) }))
    })

    it('passes undefined endDate when scheduleEndDate is not set', async () => {
        mockRepo.save.mockResolvedValue(makeChatflow({ flowData: makeScheduleFlowData() }))

        await chatflowsService.saveChatflow(
            makeChatflow() as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        expect(mockCreateOrUpdateSchedule).toHaveBeenCalledWith(expect.objectContaining({ endDate: undefined }))
    })

    // ── schedule input mode ───────────────────────────────────────────────────

    it("defaults scheduleInputMode to 'text' and passes defaultInput when mode is not set", async () => {
        mockRepo.save.mockResolvedValue(makeChatflow({ flowData: makeScheduleFlowData() }))

        await chatflowsService.saveChatflow(
            makeChatflow() as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        expect(mockCreateOrUpdateSchedule).toHaveBeenCalledWith(
            expect.objectContaining({ scheduleInputMode: 'text', defaultInput: 'hello', defaultForm: undefined })
        )
    })

    it("passes defaultForm (stringified) when scheduleInputMode is 'form'", async () => {
        mockRepo.save.mockResolvedValue(
            makeChatflow({
                flowData: makeScheduleFlowData({
                    scheduleInputMode: 'form',
                    scheduleFormDefaults: { team: 'eng', metric: 'p95' },
                    scheduleDefaultInput: ''
                })
            })
        )

        await chatflowsService.saveChatflow(
            makeChatflow() as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        const call = mockCreateOrUpdateSchedule.mock.calls[0][0]
        expect(call.scheduleInputMode).toBe('form')
        expect(call.defaultInput).toBe('') // cleared in form mode
        expect(JSON.parse(call.defaultForm)).toEqual({ team: 'eng', metric: 'p95' })
    })

    it("passes empty defaultInput and no defaultForm when scheduleInputMode is 'none'", async () => {
        mockRepo.save.mockResolvedValue(
            makeChatflow({ flowData: makeScheduleFlowData({ scheduleInputMode: 'none', scheduleDefaultInput: 'ignored' }) })
        )

        await chatflowsService.saveChatflow(
            makeChatflow() as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        expect(mockCreateOrUpdateSchedule).toHaveBeenCalledWith(
            expect.objectContaining({ scheduleInputMode: 'none', defaultInput: '', defaultForm: undefined })
        )
    })

    it('does not create a schedule when the start node type is chatInput', async () => {
        mockRepo.save.mockResolvedValue(makeChatflow({ flowData: makeChatInputFlowData() }))

        await chatflowsService.saveChatflow(
            makeChatflow({ flowData: makeChatInputFlowData() }) as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        expect(mockCreateOrUpdateSchedule).not.toHaveBeenCalled()
    })

    it('does not create a schedule for a non-AGENTFLOW type', async () => {
        const chatflow = makeChatflow({ type: EnumChatflowType.CHATFLOW, flowData: makePlainFlowData() })
        mockRepo.save.mockResolvedValue(chatflow)

        await chatflowsService.saveChatflow(
            chatflow as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        expect(mockCreateOrUpdateSchedule).not.toHaveBeenCalled()
    })

    // ── telemetry ─────────────────────────────────────────────────────────────

    it('sends chatflow_created telemetry after saving', async () => {
        mockRepo.save.mockResolvedValue(makeChatflow({ flowData: makePlainFlowData() }))

        await chatflowsService.saveChatflow(
            makeChatflow({ type: EnumChatflowType.CHATFLOW, flowData: makePlainFlowData() }) as any,
            SAVE_ARGS.orgId,
            SAVE_ARGS.workspaceId,
            SAVE_ARGS.subscriptionId,
            SAVE_ARGS.usageCacheManager
        )

        expect(mockAppServer.telemetry.sendTelemetry).toHaveBeenCalledWith('chatflow_created', expect.any(Object), SAVE_ARGS.orgId)
    })
})

// ─── updateChatflow ───────────────────────────────────────────────────────────

describe('updateChatflow', () => {
    const existingFlow = makeChatflow()

    it('saves and returns the merged chatflow', async () => {
        const updates = makeChatflow({ flowData: makeScheduleFlowData() })
        const merged = { ...existingFlow, ...updates }
        mockRepo.merge.mockReturnValue(merged)
        mockRepo.save.mockResolvedValue(merged)

        const result = await chatflowsService.updateChatflow(existingFlow as any, updates as any, 'org-1', 'ws-1', 'sub-1')

        expect(mockRepo.merge).toHaveBeenCalled()
        expect(mockRepo.save).toHaveBeenCalled()
        expect(result).toBe(merged)
    })

    it('throws BAD_REQUEST when updateChatFlow.type is invalid', async () => {
        const updates = makeChatflow({ type: 'BAD_TYPE' })

        await expect(chatflowsService.updateChatflow(existingFlow as any, updates as any, 'org-1', 'ws-1', 'sub-1')).rejects.toMatchObject({
            statusCode: 400
        })
    })

    it('preserves existing type when updateChatFlow.type is not provided', async () => {
        const updates = { flowData: makeScheduleFlowData() } // no type field
        const merged = { ...existingFlow, flowData: makeScheduleFlowData() }
        mockRepo.merge.mockReturnValue(merged)
        mockRepo.save.mockResolvedValue(merged)

        await chatflowsService.updateChatflow(existingFlow as any, updates as any, 'org-1', 'ws-1', 'sub-1')

        // Type should have been copied from existing flow
        expect(updates).toMatchObject({ type: existingFlow.type })
    })

    it('throws BAD_REQUEST when chatbotConfig is invalid JSON', async () => {
        const updates = makeChatflow({ chatbotConfig: 'not-json' })

        await expect(chatflowsService.updateChatflow(existingFlow as any, updates as any, 'org-1', 'ws-1', 'sub-1')).rejects.toMatchObject({
            statusCode: 400
        })
    })

    // ── schedule sync — scheduleInput branch ─────────────────────────────────

    it('creates or updates the schedule when start node is scheduleInput', async () => {
        const updates = makeChatflow({ flowData: makeScheduleFlowData() })
        const merged = { ...existingFlow, flowData: makeScheduleFlowData(), type: EnumChatflowType.AGENTFLOW }
        mockRepo.merge.mockReturnValue(merged)
        mockRepo.save.mockResolvedValue(merged)

        await chatflowsService.updateChatflow(existingFlow as any, updates as any, 'org-1', 'ws-1', 'sub-1')

        expect(mockCreateOrUpdateSchedule).toHaveBeenCalledWith(
            expect.objectContaining({ triggerType: ScheduleTriggerType.AGENTFLOW, targetId: 'flow-1', workspaceId: 'ws-1' })
        )
    })

    it('calls onScheduleChanged upsert when the updated schedule is enabled', async () => {
        const merged = makeChatflow({ flowData: makeScheduleFlowData() })
        mockRepo.merge.mockReturnValue(merged)
        mockRepo.save.mockResolvedValue(merged)
        mockCreateOrUpdateSchedule.mockResolvedValue({ id: 'sched-1', enabled: true })

        await chatflowsService.updateChatflow(existingFlow as any, makeChatflow() as any, 'org-1', 'ws-1', 'sub-1')

        const beat = ScheduleBeat.getInstance()
        expect(beat.onScheduleChanged).toHaveBeenCalledWith('sched-1', 'upsert')
    })

    it('calls onScheduleChanged delete when the updated schedule is disabled', async () => {
        const merged = makeChatflow({ flowData: makeScheduleFlowData() })
        mockRepo.merge.mockReturnValue(merged)
        mockRepo.save.mockResolvedValue(merged)
        mockCreateOrUpdateSchedule.mockResolvedValue({ id: 'sched-1', enabled: false })
        mockCanScheduleEnable.mockReturnValue(false)

        await chatflowsService.updateChatflow(existingFlow as any, makeChatflow() as any, 'org-1', 'ws-1', 'sub-1')

        const beat = ScheduleBeat.getInstance()
        expect(beat.onScheduleChanged).toHaveBeenCalledWith('sched-1', 'delete')
    })

    it('sets enabled=false in createOrUpdateSchedule when canScheduleEnable returns false', async () => {
        const merged = makeChatflow({ flowData: makeScheduleFlowData() })
        mockRepo.merge.mockReturnValue(merged)
        mockRepo.save.mockResolvedValue(merged)
        mockCanScheduleEnable.mockReturnValue(false)
        mockCreateOrUpdateSchedule.mockResolvedValue({ id: 'sched-1', enabled: false })

        await chatflowsService.updateChatflow(existingFlow as any, makeChatflow() as any, 'org-1', 'ws-1', 'sub-1')

        expect(mockCreateOrUpdateSchedule).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
    })

    it('passes undefined enabled in createOrUpdateSchedule when canScheduleEnable returns true (preserve existing)', async () => {
        const merged = makeChatflow({ flowData: makeScheduleFlowData() })
        mockRepo.merge.mockReturnValue(merged)
        mockRepo.save.mockResolvedValue(merged)
        mockCanScheduleEnable.mockReturnValue(true)
        mockCreateOrUpdateSchedule.mockResolvedValue({ id: 'sched-1', enabled: true })

        await chatflowsService.updateChatflow(existingFlow as any, makeChatflow() as any, 'org-1', 'ws-1', 'sub-1')

        expect(mockCreateOrUpdateSchedule).toHaveBeenCalledWith(expect.objectContaining({ enabled: undefined }))
    })

    // ── schedule sync — non-scheduleInput branch ──────────────────────────────

    it('deletes existing schedule when start node switches away from scheduleInput', async () => {
        const merged = makeChatflow({ flowData: makeChatInputFlowData() })
        mockRepo.merge.mockReturnValue(merged)
        mockRepo.save.mockResolvedValue(merged)

        await chatflowsService.updateChatflow(
            existingFlow as any,
            makeChatflow({ flowData: makeChatInputFlowData() }) as any,
            'org-1',
            'ws-1',
            'sub-1'
        )

        expect(mockDeleteScheduleForTarget).toHaveBeenCalledWith('flow-1', ScheduleTriggerType.AGENTFLOW, 'ws-1')
    })

    it('calls onScheduleChanged delete after deleting the existing schedule record', async () => {
        const merged = makeChatflow({ flowData: makeChatInputFlowData() })
        mockRepo.merge.mockReturnValue(merged)
        mockRepo.save.mockResolvedValue(merged)
        mockDeleteScheduleForTarget.mockResolvedValue({ id: 'sched-old' })

        await chatflowsService.updateChatflow(
            existingFlow as any,
            makeChatflow({ flowData: makeChatInputFlowData() }) as any,
            'org-1',
            'ws-1',
            'sub-1'
        )

        const beat = ScheduleBeat.getInstance()
        expect(beat.onScheduleChanged).toHaveBeenCalledWith('sched-old', 'delete')
    })

    it('does not call onScheduleChanged when no existing schedule was found', async () => {
        const merged = makeChatflow({ flowData: makeChatInputFlowData() })
        mockRepo.merge.mockReturnValue(merged)
        mockRepo.save.mockResolvedValue(merged)
        mockDeleteScheduleForTarget.mockResolvedValue(undefined)

        await chatflowsService.updateChatflow(
            existingFlow as any,
            makeChatflow({ flowData: makeChatInputFlowData() }) as any,
            'org-1',
            'ws-1',
            'sub-1'
        )

        const beat = ScheduleBeat.getInstance()
        expect(beat.onScheduleChanged).not.toHaveBeenCalled()
    })

    it('does not touch schedules for a non-AGENTFLOW type', async () => {
        const nonAgentFlow = makeChatflow({ type: EnumChatflowType.CHATFLOW, flowData: makePlainFlowData() })
        mockRepo.merge.mockReturnValue(nonAgentFlow)
        mockRepo.save.mockResolvedValue(nonAgentFlow)

        await chatflowsService.updateChatflow(existingFlow as any, nonAgentFlow as any, 'org-1', 'ws-1', 'sub-1')

        expect(mockCreateOrUpdateSchedule).not.toHaveBeenCalled()
        expect(mockDeleteScheduleForTarget).not.toHaveBeenCalled()
    })
})
