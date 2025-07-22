'use client'
import useSWR, { mutate, useSWRConfig } from 'swr'
import { Sidekick } from '../SidekickSelect.types'
import axios from 'axios'

const fetcher = async (url: string): Promise<Sidekick> => axios.get(url).then((res) => res.data)
const swrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    retry: 2,
    retryDelay: 1000,
    dedupingInterval: 2000
}

// Pure SWR hook for declarative usage
export const useSidekickDetails = (sidekickId: string | null) => {
    const { data, error, mutate, isLoading } = useSWR<Sidekick>(sidekickId ? `/api/sidekicks/${sidekickId}` : null, fetcher, swrConfig)

    return {
        data,
        loading: isLoading,
        error,
        mutate
    }
}

// Imperative wrapper for action-based fetching
export const useSidekickFetcher = () => {
    const { cache } = useSWRConfig()

    const fetchDetails = async (sidekickId: string): Promise<Sidekick | null> => {
        const cacheKey = `/api/sidekicks/${sidekickId}`

        try {
            // Check SWR cache first
            const cached = cache.get(cacheKey)
            if (cached) {
                return cached as Sidekick
            }

            // Fetch if not cached
            const data = await fetcher(cacheKey)
            // Update SWR cache
            await mutate(cacheKey, data, false)
            return data
        } catch (error) {
            console.error('Failed to fetch sidekick details:', error)
            return null
        }
    }

    return { fetchDetails }
}

// Default export for backward compatibility
export default useSidekickFetcher
