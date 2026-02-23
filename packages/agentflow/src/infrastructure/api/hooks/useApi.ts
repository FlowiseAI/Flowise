import { useCallback, useState } from 'react'

interface UseApiState<T> {
    data: T | null
    loading: boolean
    error: Error | null
}

interface UseApiReturn<T> extends UseApiState<T> {
    execute: () => Promise<T | null>
    reset: () => void
}

// TODO: Review if still necessary — package uses ApiContext + dedicated hooks (useNodesApi, useChatflowsApi) instead
/**
 * Hook for managing API call state
 * @param apiFunc - The API function to call
 */
export function useApi<T>(apiFunc: () => Promise<T>): UseApiReturn<T> {
    const [state, setState] = useState<UseApiState<T>>({
        data: null,
        loading: false,
        error: null
    })

    const execute = useCallback(async (): Promise<T | null> => {
        setState((prev) => ({ ...prev, loading: true, error: null }))

        try {
            const data = await apiFunc()
            setState({ data, loading: false, error: null })
            return data
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error))
            setState({ data: null, loading: false, error: err })
            return null
        }
    }, [apiFunc])

    const reset = useCallback(() => {
        setState({ data: null, loading: false, error: null })
    }, [])

    return {
        ...state,
        execute,
        reset
    }
}

export default useApi
