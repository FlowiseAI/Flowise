import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

// typeorm is not directly resolvable under pnpm strict hoisting; provide a
// virtual mock so entity decorators are no-ops in this test context.
jest.mock(
    'typeorm',
    () => {
        const noop = () => (_target: any, _key?: any) => {}
        return {
            Entity: () => noop(),
            Column: () => noop(),
            PrimaryGeneratedColumn: () => noop(),
            CreateDateColumn: () => noop(),
            UpdateDateColumn: () => noop(),
            ManyToOne: () => noop(),
            OneToMany: () => noop(),
            OneToOne: () => noop(),
            JoinColumn: () => noop(),
            Index: () => noop(),
            Unique: () => noop(),
            In: (vals: any) => ({ _type: 'in', _value: vals })
        }
    },
    { virtual: true }
)

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockSave = jest.fn()
const mockFindOneBy = jest.fn()
const mockMerge = jest.fn()
const mockFindOne = jest.fn()
const mockDelete = jest.fn()
const mockUpdate = jest.fn()
const mockGetManyAndCount = jest.fn()
const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: mockGetManyAndCount
}
const mockGetRepository = jest.fn().mockReturnValue({
    save: mockSave,
    findOneBy: mockFindOneBy,
    findOne: mockFindOne,
    merge: mockMerge,
    delete: mockDelete,
    update: mockUpdate,
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder)
})

jest.mock('../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn(() => ({
        AppDataSource: { getRepository: mockGetRepository }
    }))
}))

jest.mock('../../utils', () => ({
    _removeCredentialId: jest.fn((data: any) => data)
}))

// Import after the virtual mock and module mocks are registered
import executionsService from './index'

// ── Helpers ─────────────────────────────────────────────────────────────────

const ATTACKER_WS = '40b8ad7b-e687-4e23-8148-ade5bb4805a8'
const VICTIM_WS = '11111111-2222-3333-4444-555555555555'
const EXEC_ID = 'bbbbbbbb-cccc-dddd-eeee-333333333333'
const VICTIM_AGENTFLOW_ID = 'cccccccc-dddd-eeee-ffff-444444444444'
const ORIGINAL_AGENTFLOW_ID = 'aaaaaaaa-bbbb-cccc-dddd-111111111111'

const makeExecution = (overrides: Record<string, any> = {}) => ({
    id: EXEC_ID,
    executionData: '[{"nodeId":"llmAgent_0","data":{"output":{"content":"original transcript"}}}]',
    state: 'FINISHED',
    agentflowId: ORIGINAL_AGENTFLOW_ID,
    sessionId: 'sess-1',
    action: null,
    isPublic: false,
    createdDate: new Date('2026-01-01'),
    updatedDate: new Date('2026-01-01'),
    stoppedDate: new Date('2026-01-01'),
    workspaceId: ATTACKER_WS,
    ...overrides
})

describe('executionsService.updateExecution', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Default: merge applies properties from second arg onto first arg (TypeORM semantics)
        mockMerge.mockImplementation((target: any, source: any) => {
            Object.assign(target, source)
            return target
        })
    })

    it('persists isPublic when toggled by an owning workspace user', async () => {
        const stored = makeExecution()
        mockFindOneBy.mockResolvedValue(stored)
        mockSave.mockImplementation(async (e: any) => e)

        const result: any = await executionsService.updateExecution(EXEC_ID, { isPublic: true } as any, ATTACKER_WS)

        expect(mockFindOneBy).toHaveBeenCalledWith({ id: EXEC_ID, workspaceId: ATTACKER_WS })
        expect(result.isPublic).toBe(true)
        expect(mockSave).toHaveBeenCalled()
    })

    // Regression — GHSA-v2cc-6h2j-w847
    //
    // The pre-patch service accepted the raw request body and ran
    // `Object.assign(new Execution(), req.body)` followed by
    // `merge + save`, with no allowlist. A workspace user could overwrite
    // any column on an execution they owned, including columns that gate
    // the unauthenticated `GET /api/v1/public-executions/:id` endpoint
    // (`isPublic`) and the cross-workspace ownership key (`workspaceId`).
    describe('mass assignment regression (GHSA-v2cc-6h2j-w847)', () => {
        it('ignores attacker-supplied workspaceId in the request body', async () => {
            const stored = makeExecution()
            mockFindOneBy.mockResolvedValue(stored)
            mockSave.mockImplementation(async (e: any) => e)

            const result: any = await executionsService.updateExecution(
                EXEC_ID,
                { isPublic: true, workspaceId: VICTIM_WS } as any,
                ATTACKER_WS
            )

            expect(result.workspaceId).toBe(ATTACKER_WS)
            // Confirm the merged entity that was saved did not pick up the victim workspace id
            const savedEntity = mockSave.mock.calls[0][0]
            expect(savedEntity.workspaceId).toBe(ATTACKER_WS)
            expect(savedEntity.workspaceId).not.toBe(VICTIM_WS)
        })

        it('ignores attacker-supplied agentflowId in the request body', async () => {
            const stored = makeExecution()
            mockFindOneBy.mockResolvedValue(stored)
            mockSave.mockImplementation(async (e: any) => e)

            const result: any = await executionsService.updateExecution(EXEC_ID, { agentflowId: VICTIM_AGENTFLOW_ID } as any, ATTACKER_WS)

            expect(result.agentflowId).toBe(ORIGINAL_AGENTFLOW_ID)
            expect(result.agentflowId).not.toBe(VICTIM_AGENTFLOW_ID)
        })

        it('ignores attacker-supplied state, action, executionData and stoppedDate', async () => {
            const stored = makeExecution()
            mockFindOneBy.mockResolvedValue(stored)
            mockSave.mockImplementation(async (e: any) => e)

            const result: any = await executionsService.updateExecution(
                EXEC_ID,
                {
                    state: 'ERROR',
                    action: 'rewritten-by-attacker',
                    executionData: '[{"nodeId":"noop","output":"sponsored-content-injected"}]',
                    stoppedDate: new Date('2099-01-01T00:00:00.000Z')
                } as any,
                ATTACKER_WS
            )

            expect(result.state).toBe('FINISHED')
            expect(result.action).toBeNull()
            expect(result.executionData).toBe('[{"nodeId":"llmAgent_0","data":{"output":{"content":"original transcript"}}}]')
            expect(result.stoppedDate).toEqual(new Date('2026-01-01'))
        })

        it('ignores attacker-supplied id in the request body', async () => {
            const stored = makeExecution()
            mockFindOneBy.mockResolvedValue(stored)
            mockSave.mockImplementation(async (e: any) => e)

            const result: any = await executionsService.updateExecution(
                EXEC_ID,
                { id: '99999999-9999-9999-9999-999999999999' } as any,
                ATTACKER_WS
            )

            expect(result.id).toBe(EXEC_ID)
        })

        it('still allows the legitimate isPublic toggle when mixed with malicious fields', async () => {
            const stored = makeExecution()
            mockFindOneBy.mockResolvedValue(stored)
            mockSave.mockImplementation(async (e: any) => e)

            const result: any = await executionsService.updateExecution(
                EXEC_ID,
                {
                    isPublic: true,
                    workspaceId: VICTIM_WS,
                    agentflowId: VICTIM_AGENTFLOW_ID,
                    state: 'ERROR'
                } as any,
                ATTACKER_WS
            )

            expect(result.isPublic).toBe(true)
            expect(result.workspaceId).toBe(ATTACKER_WS)
            expect(result.agentflowId).toBe(ORIGINAL_AGENTFLOW_ID)
            expect(result.state).toBe('FINISHED')
        })
    })

    it('throws NOT_FOUND when no execution matches the scoped query', async () => {
        mockFindOneBy.mockResolvedValue(null)

        await expect(executionsService.updateExecution(EXEC_ID, { isPublic: true } as any, ATTACKER_WS)).rejects.toThrow(
            InternalFlowiseError
        )
        await expect(executionsService.updateExecution(EXEC_ID, { isPublic: true } as any, ATTACKER_WS)).rejects.toMatchObject({
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        })
        expect(mockSave).not.toHaveBeenCalled()
    })

    it('scopes the lookup with workspaceId when one is supplied', async () => {
        mockFindOneBy.mockResolvedValue(makeExecution())
        mockSave.mockImplementation(async (e: any) => e)

        await executionsService.updateExecution(EXEC_ID, { isPublic: true } as any, ATTACKER_WS)

        expect(mockFindOneBy).toHaveBeenCalledWith({ id: EXEC_ID, workspaceId: ATTACKER_WS })
    })

    it('omits workspaceId from the lookup when none is supplied', async () => {
        mockFindOneBy.mockResolvedValue(makeExecution())
        mockSave.mockImplementation(async (e: any) => e)

        await executionsService.updateExecution(EXEC_ID, { isPublic: true } as any)

        expect(mockFindOneBy).toHaveBeenCalledWith({ id: EXEC_ID })
    })
})
