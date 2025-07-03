'use client'
import { useState, useCallback } from 'react'
import { Sidekick } from '../SidekickSelect.types'

interface UseSidekickDetailsResult {
    loading: boolean
    error: Error | null
    fetchSidekickDetails: (sidekickId: string) => Promise<Sidekick | null>
}

const useSidekickDetails = (): UseSidekickDetailsResult => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const fetchSidekickDetails = useCallback(async (sidekickId: string): Promise<Sidekick | null> => {
        setLoading(true)
        setError(null)

        for (let attempt = 0; attempt < 2; attempt++) {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 10000)
            try {
                const response = await fetch(`/api/sidekicks/${sidekickId}`, { signal: controller.signal })
                if (!response.ok) {
                    throw new Error(`Failed to fetch sidekick details: ${response.statusText}`)
                }
                const data = await response.json()
                setLoading(false)
                return data
            } catch (err) {
                if (attempt === 1) {
                    setError(err instanceof Error ? err : new Error('Unknown error'))
                }
            } finally {
                clearTimeout(timeout)
            }
        }

        setLoading(false)
        return null
    }, [])

    return {
        loading,
        error,
        fetchSidekickDetails
    }
}

export default useSidekickDetails
