import { useState, useCallback, useEffect } from 'react'

export const useApi = <Args extends unknown[], T>(apiFunc: (...args: Args) => Promise<{ data: T }>) => {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<unknown>(null)

    const request = useCallback(
        async (...argsWithOptions: [...Args] | [...Args, { onSuccess?: (data?: T) => void }]) => {
            setLoading(true)
            try {
                const lastArg = argsWithOptions[argsWithOptions.length - 1]
                const isOptionsObject = typeof lastArg === 'object' && lastArg !== null && 'onSuccess' in lastArg
                const options = isOptionsObject ? (lastArg as { onSuccess?: (data: T) => void }) : undefined
                const args = isOptionsObject ? (argsWithOptions.slice(0, -1) as unknown as Args) : (argsWithOptions as unknown as Args)
                const result = await apiFunc(...args)
                setData(result.data)
                options?.onSuccess?.(result.data)
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
