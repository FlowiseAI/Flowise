import { Request, Response, NextFunction } from 'express'

jest.mock('../../services/executions', () => ({
    __esModule: true,
    default: {
        getAllExecutions: jest.fn(),
        getExecutionById: jest.fn(),
        getPublicExecutionById: jest.fn(),
        updateExecution: jest.fn(),
        deleteExecutions: jest.fn()
    }
}))

import executionsController from './index'
import executionsService from '../../services/executions'

const mockService = executionsService as jest.Mocked<typeof executionsService>

const makeReq = (query: Record<string, unknown> = {}, overrides: Partial<Request> = {}): Request =>
    ({
        params: {},
        query,
        user: { activeWorkspaceId: 'ws-1' },
        ...overrides
    } as unknown as Request)

const makeRes = (): Response => ({ json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response)

const makeNext = (): NextFunction => jest.fn()

const callAndCaptureFilters = async (query: Record<string, unknown>): Promise<Record<string, any>> => {
    mockService.getAllExecutions.mockResolvedValueOnce({ data: [], total: 0 })
    await executionsController.getAllExecutions(makeReq(query), makeRes(), makeNext())
    expect(mockService.getAllExecutions).toHaveBeenCalledTimes(1)
    const filters = mockService.getAllExecutions.mock.calls[0][0]
    if (!filters) throw new Error('expected service to receive a filters arg')
    return filters as Record<string, any>
}

describe('executionsController.getAllExecutions — agentflowId query parsing', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('omits agentflowIds when the query param is absent', async () => {
        const filters = await callAndCaptureFilters({})
        expect(filters).not.toHaveProperty('agentflowIds')
    })

    it('omits agentflowIds when the value is an empty string', async () => {
        const filters = await callAndCaptureFilters({ agentflowId: '' })
        expect(filters).not.toHaveProperty('agentflowIds')
    })

    it('parses a single id into a one-element array', async () => {
        const filters = await callAndCaptureFilters({ agentflowId: 'af-1' })
        expect(filters.agentflowIds).toEqual(['af-1'])
    })

    it('parses comma-separated ids', async () => {
        const filters = await callAndCaptureFilters({ agentflowId: 'af-1,af-2,af-3' })
        expect(filters.agentflowIds).toEqual(['af-1', 'af-2', 'af-3'])
    })

    it('parses repeated query keys (Express qs parses as string[])', async () => {
        const filters = await callAndCaptureFilters({ agentflowId: ['af-1', 'af-2'] })
        expect(filters.agentflowIds).toEqual(['af-1', 'af-2'])
    })

    it('parses a mix of repeated keys and comma-separated values', async () => {
        const filters = await callAndCaptureFilters({ agentflowId: ['af-1,af-2', 'af-3'] })
        expect(filters.agentflowIds).toEqual(['af-1', 'af-2', 'af-3'])
    })

    it('trims whitespace and drops empty entries', async () => {
        const filters = await callAndCaptureFilters({ agentflowId: ' af-1 , , af-2 ,' })
        expect(filters.agentflowIds).toEqual(['af-1', 'af-2'])
    })

    it('omits agentflowIds when only commas/whitespace are provided', async () => {
        const filters = await callAndCaptureFilters({ agentflowId: ' , , ' })
        expect(filters).not.toHaveProperty('agentflowIds')
    })

    it('drops nested-object entries (qs `?agentflowId[x]=y` form) rather than coercing to "[object Object]"', async () => {
        const filters = await callAndCaptureFilters({ agentflowId: { x: 'y' } })
        expect(filters).not.toHaveProperty('agentflowIds')
    })

    it('keeps string entries from a mixed array and drops object entries', async () => {
        const filters = await callAndCaptureFilters({ agentflowId: ['af-1', { x: 'y' }, 'af-2'] })
        expect(filters.agentflowIds).toEqual(['af-1', 'af-2'])
    })

    it('passes other filters through alongside agentflowIds', async () => {
        const filters = await callAndCaptureFilters({
            agentflowId: 'af-1,af-2',
            state: 'FINISHED',
            sessionId: 'sess-1',
            page: '2',
            limit: '25'
        })
        expect(filters).toMatchObject({
            agentflowIds: ['af-1', 'af-2'],
            state: 'FINISHED',
            sessionId: 'sess-1',
            page: 2,
            limit: 25,
            workspaceId: 'ws-1'
        })
    })
})
