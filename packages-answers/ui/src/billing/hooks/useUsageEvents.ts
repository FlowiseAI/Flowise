import useSWR from 'swr'
import billingApi from '@/api/billing'
import { useState, useCallback, useMemo } from 'react'

export interface UsageEvent {
    id: string
    timestamp: string
    chatflowName?: string
    chatflowId?: string
    totalCredits: number
    breakdown: {
        ai_tokens: number
        compute: number
        storage: number
    }
    syncStatus: 'processed' | 'pending' | 'error'
    error?: string
    metadata?: any
}

export interface UsageEventsResponse {
    events: UsageEvent[]
    pagination: {
        page: number
        limit: number
        totalItems: number
        totalPages: number
    }
}

interface UsageEventsParams {
    page: number
    limit: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filter?: Record<string, any>
}

export function useUsageEvents(initialParams: UsageEventsParams = { page: 1, limit: 10, sortBy: 'timestamp', sortOrder: 'desc' }) {
    const [params, setParams] = useState<UsageEventsParams>(initialParams)

    // Create a stable cache key that includes the pagination parameters
    const cacheKey = useMemo(() => {
        // This ensures the cache key changes when any parameter changes
        return `/api/billing/usage/events?${new URLSearchParams({
            page: params.page.toString(),
            limit: params.limit.toString(),
            sortBy: params.sortBy || 'timestamp',
            sortOrder: params.sortOrder || 'desc'
        }).toString()}`
    }, [params])

    const fetcher = useCallback(async () => {
        // console.log('Fetching with params:', params)
        const response = await billingApi.getUsageEvents(params)
        return response.data
    }, [params])

    const { data, error, isLoading, mutate } = useSWR<UsageEventsResponse>(cacheKey, fetcher, {
        refreshInterval: 60000, // Refresh every minute
        revalidateOnFocus: true
    })

    const setPage = useCallback((page: number) => {
        // console.log('Setting page to:', page)
        setParams((prev) => ({ ...prev, page }))
    }, [])

    const setLimit = useCallback((limit: number) => {
        // console.log('Setting limit to:', limit)
        setParams((prev) => ({ ...prev, limit }))
    }, [])

    const setSorting = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
        // console.log('Setting sorting to:', sortBy, sortOrder)
        setParams((prev) => ({ ...prev, sortBy, sortOrder }))
    }, [])

    const setFilter = useCallback((filter: Record<string, any>) => {
        // console.log('Setting filter to:', filter)
        setParams((prev) => ({ ...prev, filter }))
    }, [])

    return {
        events: data?.events || [],
        pagination: data?.pagination,
        isLoading,
        isError: error,
        refresh: mutate,
        setPage,
        setLimit,
        setSorting,
        setFilter,
        params
    }
}
