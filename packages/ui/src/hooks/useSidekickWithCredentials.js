import { useCallback } from 'react'
import useSWR, { mutate as swrMutate } from 'swr'
import chatflowsApi from '@/api/chatflows'

const fetcher = async (url) => {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
    }
    return response.json()
}

export const useSidekickWithCredentials = (sidekickId, forceQuickSetup = false) => {
    const apiUrl = sidekickId ? `/api/sidekicks/${sidekickId}` : null

    const {
        data: sidekick,
        error,
        mutate,
        isLoading
    } = useSWR(apiUrl, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 10000
    })

    const updateSidekick = useCallback(
        async (updateData) => {
            if (!sidekickId) return

            try {
                const updatedSidekick = await chatflowsApi.updateChatflow(sidekickId, updateData)
                await mutate()
                await swrMutate('/api/sidekicks')
                return updatedSidekick
            } catch (error) {
                console.error('Failed to update sidekick:', error)
                throw error
            }
        },
        [sidekickId, mutate]
    )

    return {
        sidekick,
        isLoading,
        error,
        updateSidekick,
        needsSetup: sidekick?.needsSetup,
        credentialsToShow: sidekick?.credentialsToShow || []
    }
}
