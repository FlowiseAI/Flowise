import { useCallback, useEffect, useState } from 'react'

import type { NodeOption } from '@/core/types'

import { useApiContext } from '../../store/ApiContext'
import type { ApiServices } from '../loadMethodRegistry'
import { getLoadMethod } from '../loadMethodRegistry'

export type OptionItem = NodeOption

interface UseAsyncOptionsParams {
    loadMethod?: string
    credentialNames?: string[]
    params?: Record<string, unknown>
}

interface UseAsyncOptionsResult {
    options: OptionItem[]
    loading: boolean
    error: string | null
    refetch: () => void
}

/**
 * Fetches async option lists from the API using the loadMethodRegistry.
 */
export function useAsyncOptions({ loadMethod, credentialNames, params }: UseAsyncOptionsParams): UseAsyncOptionsResult {
    const { chatModelsApi, toolsApi, credentialsApi, storesApi, embeddingsApi, runtimeStateApi, nodesApi, apiBaseUrl } = useApiContext()

    const [options, setOptions] = useState<OptionItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [fetchCounter, setFetchCounter] = useState(0)

    // Stable string key for credentialNames: a new array reference on every render
    // (e.g. inline `credentialNames={['openAIApi']}`) would otherwise cancel and
    // restart the effect on each render, preventing async ops from completing.
    const credentialNamesKey = credentialNames ? credentialNames.join('\0') : ''
    // Stable key for params object — same reasoning as above.
    const paramsKey = params ? JSON.stringify(params) : ''

    const refetch = useCallback(() => {
        setFetchCounter((c) => c + 1)
    }, [])

    useEffect(() => {
        let cancelled = false

        async function load() {
            setLoading(true)
            setError(null)

            try {
                let result: OptionItem[]

                if (credentialNamesKey) {
                    // Credential-based path: mirrors AsyncDropdown.jsx fetchCredentialList.
                    // credentialNamesKey is '\0'-joined; reconstruct original names for the API call.
                    // Pass as an array so axios serialises to ?credentialName=a&credentialName=b
                    // (passing a joined string would cause axios to URL-encode the '&').
                    const names = credentialNamesKey.split('\0')
                    const credentials = await credentialsApi.getCredentialsByName(names.length === 1 ? names[0] : names)
                    // Credentials use id as the stored value, name as the display label
                    result = credentials.map((c) => ({ label: c.name, name: c.id }))
                } else if (loadMethod) {
                    const fn = getLoadMethod(loadMethod)
                    const apis: ApiServices = {
                        chatModelsApi,
                        toolsApi,
                        credentialsApi,
                        storesApi,
                        embeddingsApi,
                        runtimeStateApi,
                        nodesApi
                    }
                    const stableParams = paramsKey ? (JSON.parse(paramsKey) as Record<string, unknown>) : undefined
                    const raw = await fn(apis, stableParams)
                    result = normalizeOptions(raw, apiBaseUrl)
                } else {
                    throw new Error('useAsyncOptions requires either loadMethod or credentialNames')
                }

                if (!cancelled) {
                    setOptions(result)
                    setLoading(false)
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : String(err))
                    setLoading(false)
                }
            }
        }

        load()

        return () => {
            cancelled = true
        }
    }, [
        loadMethod,
        credentialNamesKey,
        paramsKey,
        fetchCounter,
        chatModelsApi,
        toolsApi,
        credentialsApi,
        storesApi,
        embeddingsApi,
        runtimeStateApi,
        nodesApi,
        apiBaseUrl
    ])

    return { options, loading, error, refetch }
}

/** Normalize raw API response into OptionItem[]. Handles objects with label/name, or plain strings.
 *  If an item carries `imageSrc: true` (server flag), the resolved icon URL is constructed from apiBaseUrl. */
function normalizeOptions(raw: unknown, apiBaseUrl: string): OptionItem[] {
    if (!Array.isArray(raw)) return []
    return raw
        .map((item) => {
            if (item && typeof item === 'object') {
                const obj = item as Record<string, unknown>
                const name = typeof obj.name === 'string' ? obj.name : ''
                const label = typeof obj.label === 'string' ? obj.label : name
                const description = typeof obj.description === 'string' ? obj.description : undefined
                const imageSrc = obj.imageSrc ? `${apiBaseUrl}/api/v1/node-icon/${name}` : undefined
                return { label, name, description, imageSrc }
            }
            if (typeof item === 'string') {
                return { label: item, name: item }
            }
            return null
        })
        .filter((item): item is OptionItem => item !== null && item.name !== '')
}
