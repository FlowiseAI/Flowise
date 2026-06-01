import { useCallback, useEffect, useRef, useState } from 'react'

import type { Execution } from '@/core/types'
import { useObserveApi } from '@/infrastructure/store'

const TERMINAL_STATES = new Set(['FINISHED', 'ERROR', 'TERMINATED', 'TIMEOUT', 'STOPPED'])

interface UseExecutionPollOptions {
    executionId: string
    pollInterval?: number
}

interface UseExecutionPollResult {
    execution: Execution | null
    isLoading: boolean
    error: string | null
    refresh: () => void
}

/**
 * Fetches a single execution by ID and auto-polls while state is INPROGRESS.
 * Polling stops automatically when execution reaches a terminal state.
 *
 * @param executionId - The execution UUID to fetch
 * @param pollInterval - Polling interval in ms (default 3000). Set to 0 to disable auto-poll.
 */
export function useExecutionPoll({ executionId, pollInterval = 3000 }: UseExecutionPollOptions): UseExecutionPollResult {
    const { executions: api } = useObserveApi()
    const [execution, setExecution] = useState<Execution | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const fetchExecution = useCallback(async () => {
        try {
            const data = await api.getExecutionById(executionId)
            setExecution(data)
            setError(null)
            // Stop polling once terminal
            if (TERMINAL_STATES.has(data.state) && intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load execution'
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }, [api, executionId])

    useEffect(() => {
        setIsLoading(true)
        fetchExecution()

        if (pollInterval > 0) {
            intervalRef.current = setInterval(fetchExecution, pollInterval)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [executionId, pollInterval, fetchExecution])

    return { execution, isLoading, error, refresh: fetchExecution }
}
