import { act, renderHook } from '@testing-library/react'

import { useObserveApi } from '@/infrastructure/store'

import { useExecutionPoll } from './useExecutionPoll'

const mockGetExecutionById = jest.fn()

jest.mock('@/infrastructure/store', () => ({
    useObserveApi: jest.fn()
}))

const makeExecution = (state: string) => ({
    id: 'exec-1',
    state,
    agentflowId: 'flow-1',
    sessionId: 'session-1',
    createdDate: '2024-01-01T00:00:00Z',
    nodeExecutions: null
})

beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    ;(useObserveApi as jest.Mock).mockReturnValue({ executions: { getExecutionById: mockGetExecutionById } })
})

afterEach(() => {
    jest.useRealTimers()
})

describe('useExecutionPoll', () => {
    it('fetches execution on mount', async () => {
        mockGetExecutionById.mockResolvedValueOnce(makeExecution('FINISHED'))

        const { result } = renderHook(() => useExecutionPoll({ executionId: 'exec-1' }))

        expect(result.current.isLoading).toBe(true)

        await act(async () => {})

        expect(mockGetExecutionById).toHaveBeenCalledTimes(1)
        expect(mockGetExecutionById).toHaveBeenCalledWith('exec-1')
        expect(result.current.execution).toMatchObject({ id: 'exec-1', state: 'FINISHED' })
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    it('polls repeatedly when pollInterval > 0 and state is non-terminal', async () => {
        mockGetExecutionById.mockResolvedValue(makeExecution('INPROGRESS'))

        renderHook(() => useExecutionPoll({ executionId: 'exec-1', pollInterval: 1000 }))

        await act(async () => {})
        expect(mockGetExecutionById).toHaveBeenCalledTimes(1)

        await act(async () => {
            jest.advanceTimersByTime(1000)
        })
        expect(mockGetExecutionById).toHaveBeenCalledTimes(2)

        await act(async () => {
            jest.advanceTimersByTime(1000)
        })
        expect(mockGetExecutionById).toHaveBeenCalledTimes(3)
    })

    it.each(['FINISHED', 'ERROR', 'TERMINATED', 'TIMEOUT', 'STOPPED'])(
        'stops polling when execution reaches terminal state: %s',
        async (terminalState) => {
            mockGetExecutionById.mockResolvedValueOnce(makeExecution('INPROGRESS')).mockResolvedValueOnce(makeExecution(terminalState))

            renderHook(() => useExecutionPoll({ executionId: 'exec-1', pollInterval: 1000 }))

            await act(async () => {})
            expect(mockGetExecutionById).toHaveBeenCalledTimes(1)

            await act(async () => {
                jest.advanceTimersByTime(1000)
            })
            expect(mockGetExecutionById).toHaveBeenCalledTimes(2)

            // interval should be cleared — no more calls
            await act(async () => {
                jest.advanceTimersByTime(5000)
            })
            expect(mockGetExecutionById).toHaveBeenCalledTimes(2)
        }
    )

    it('does not start polling when pollInterval is 0', async () => {
        mockGetExecutionById.mockResolvedValue(makeExecution('INPROGRESS'))

        renderHook(() => useExecutionPoll({ executionId: 'exec-1', pollInterval: 0 }))

        await act(async () => {})
        expect(mockGetExecutionById).toHaveBeenCalledTimes(1)

        await act(async () => {
            jest.advanceTimersByTime(10000)
        })
        expect(mockGetExecutionById).toHaveBeenCalledTimes(1)
    })

    it('refresh() triggers an additional fetch', async () => {
        mockGetExecutionById.mockResolvedValue(makeExecution('INPROGRESS'))

        const { result } = renderHook(() => useExecutionPoll({ executionId: 'exec-1', pollInterval: 0 }))

        await act(async () => {})
        expect(mockGetExecutionById).toHaveBeenCalledTimes(1)

        await act(async () => {
            result.current.refresh()
        })
        expect(mockGetExecutionById).toHaveBeenCalledTimes(2)
    })

    it('clears the interval on unmount', async () => {
        mockGetExecutionById.mockResolvedValue(makeExecution('INPROGRESS'))

        const { unmount } = renderHook(() => useExecutionPoll({ executionId: 'exec-1', pollInterval: 1000 }))

        await act(async () => {})
        expect(mockGetExecutionById).toHaveBeenCalledTimes(1)

        unmount()

        await act(async () => {
            jest.advanceTimersByTime(5000)
        })
        expect(mockGetExecutionById).toHaveBeenCalledTimes(1)
    })

    it('sets error state when API throws', async () => {
        mockGetExecutionById.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => useExecutionPoll({ executionId: 'exec-1', pollInterval: 0 }))

        await act(async () => {})

        expect(result.current.error).toBe('Network error')
        expect(result.current.execution).toBeNull()
        expect(result.current.isLoading).toBe(false)
    })

    it('uses "Failed to load execution" for non-Error rejections', async () => {
        mockGetExecutionById.mockRejectedValueOnce('something went wrong')

        const { result } = renderHook(() => useExecutionPoll({ executionId: 'exec-1', pollInterval: 0 }))

        await act(async () => {})

        expect(result.current.error).toBe('Failed to load execution')
    })
})
