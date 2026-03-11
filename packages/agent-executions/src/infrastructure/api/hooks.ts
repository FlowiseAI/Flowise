import { useState, useCallback } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useApi = <T = any>(apiFunc: (...args: any[]) => Promise<{ data: T }>) => {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<unknown>(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const request = useCallback(
        async (...args: any[]) => {
            setLoading(true)
            try {
                const result = await apiFunc(...args)
                setData(result.data)
                setError(null)
                return result
            } catch (err) {
                setError(err || 'Unexpected Error!')
                throw err
            } finally {
                setLoading(false)
            }
        },
        [apiFunc]
    )

    return { data, loading, error, request }
}
