import type { AxiosInstance } from 'axios'

import { createExecutionsApi } from './executions'

const mockGet = jest.fn()
const mockDelete = jest.fn()
const mockPut = jest.fn()

const mockClient = {
    get: mockGet,
    delete: mockDelete,
    put: mockPut
} as unknown as AxiosInstance

describe('createExecutionsApi', () => {
    let api: ReturnType<typeof createExecutionsApi>

    beforeEach(() => {
        jest.clearAllMocks()
        api = createExecutionsApi(mockClient)
    })

    describe('getAllExecutions', () => {
        it('always sends page and limit', async () => {
            mockGet.mockResolvedValueOnce({ data: { data: [], total: 0 } })
            await api.getAllExecutions({ page: 1, limit: 10 })
            expect(mockGet).toHaveBeenCalledWith('/executions', { params: { page: 1, limit: 10 } })
        })

        it('includes optional params when provided', async () => {
            mockGet.mockResolvedValueOnce({ data: { data: [], total: 0 } })
            await api.getAllExecutions({
                page: 2,
                limit: 25,
                state: 'FINISHED',
                agentflowId: 'af-123',
                agentflowName: 'My Flow',
                sessionId: 'sess-abc'
            })
            expect(mockGet).toHaveBeenCalledWith('/executions', {
                params: expect.objectContaining({
                    state: 'FINISHED',
                    agentflowId: 'af-123',
                    agentflowName: 'My Flow',
                    sessionId: 'sess-abc'
                })
            })
        })

        it('omits undefined optional params', async () => {
            mockGet.mockResolvedValueOnce({ data: { data: [], total: 0 } })
            await api.getAllExecutions({ page: 1, limit: 10 })
            const { params } = mockGet.mock.calls[0][1]
            expect(params).not.toHaveProperty('state')
            expect(params).not.toHaveProperty('agentflowId')
            expect(params).not.toHaveProperty('agentflowName')
            expect(params).not.toHaveProperty('sessionId')
            expect(params).not.toHaveProperty('startDate')
            expect(params).not.toHaveProperty('endDate')
        })

        it('serialises startDate and endDate to ISO strings', async () => {
            mockGet.mockResolvedValueOnce({ data: { data: [], total: 0 } })
            const startDate = new Date('2024-01-01T00:00:00.000Z')
            const endDate = new Date('2024-01-31T23:59:59.000Z')
            await api.getAllExecutions({ page: 1, limit: 10, startDate, endDate })
            const { params } = mockGet.mock.calls[0][1]
            expect(params.startDate).toBe('2024-01-01T00:00:00.000Z')
            expect(params.endDate).toBe('2024-01-31T23:59:59.000Z')
        })

        it('returns response.data', async () => {
            const expected = { data: [{ id: 'exec-1' }], total: 1 }
            mockGet.mockResolvedValueOnce({ data: expected })
            const result = await api.getAllExecutions({ page: 1, limit: 10 })
            expect(result).toBe(expected)
        })
    })

    describe('getExecutionById', () => {
        it('calls GET /executions/:id', async () => {
            mockGet.mockResolvedValueOnce({ data: { id: 'exec-1' } })
            await api.getExecutionById('exec-1')
            expect(mockGet).toHaveBeenCalledWith('/executions/exec-1')
        })

        it('returns response.data', async () => {
            const expected = { id: 'exec-1', state: 'FINISHED' }
            mockGet.mockResolvedValueOnce({ data: expected })
            const result = await api.getExecutionById('exec-1')
            expect(result).toBe(expected)
        })
    })

    describe('deleteExecutions', () => {
        it('calls DELETE /executions with executionIds in request body', async () => {
            mockDelete.mockResolvedValueOnce({})
            await api.deleteExecutions(['id-1', 'id-2'])
            expect(mockDelete).toHaveBeenCalledWith('/executions', { data: { executionIds: ['id-1', 'id-2'] } })
        })

        it('works with a single id', async () => {
            mockDelete.mockResolvedValueOnce({})
            await api.deleteExecutions(['id-1'])
            expect(mockDelete).toHaveBeenCalledWith('/executions', { data: { executionIds: ['id-1'] } })
        })
    })

    describe('updateExecution', () => {
        it('calls PUT /executions/:id with payload', async () => {
            mockPut.mockResolvedValueOnce({ data: { id: 'exec-1', isPublic: true } })
            await api.updateExecution('exec-1', { isPublic: true })
            expect(mockPut).toHaveBeenCalledWith('/executions/exec-1', { isPublic: true })
        })

        it('returns response.data', async () => {
            const expected = { id: 'exec-1', isPublic: false }
            mockPut.mockResolvedValueOnce({ data: expected })
            const result = await api.updateExecution('exec-1', { isPublic: false })
            expect(result).toBe(expected)
        })
    })
})
