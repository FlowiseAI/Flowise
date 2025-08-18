import useSWR from 'swr'

export function useApi<T = any>(key: string, apiFunc: () => Promise<{ data: T }>) {
    const fetcher = async () => {
        const response = await apiFunc()
        return response.data
    }

    const { data, error, isLoading, mutate } = useSWR<T>(key, fetcher, {
        revalidateOnFocus: true,
        dedupingInterval: 5000
    })

    return {
        data,
        isLoading,
        isError: error,
        refresh: mutate
    }
}

export default useApi
