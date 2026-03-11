import { useCallback, useEffect, useRef, useState } from 'react'

import { useApiContext } from '../../store/ApiContext'
import type { ApiServices } from '../loadMethodRegistry'
import { getLoadMethod } from '../loadMethodRegistry'

export interface OptionItem {
    label: string
    name: string
    description?: string
}

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
    const { chatModelsApi, toolsApi, credentialsApi } = useApiContext()

    const [options, setOptions] = useState<OptionItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [fetchCounter, setFetchCounter] = useState(0)

    // Stable ref for params
    const paramsRef = useRef(params)
    paramsRef.current = params

    // Stable string key for credentialNames: a new array reference on every render
    // (e.g. inline `credentialNames={['openAIApi']}`) would otherwise cancel and
    // restart the effect on each render, preventing async ops from completing.
    const credentialNamesKey = credentialNames ? credentialNames.join('\0') : ''

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
                    const names = credentialNamesKey.split('\0')
                    const joined = names.length > 1 ? names.join('&credentialName=') : names[0]
                    const credentials = await credentialsApi.getCredentialsByName(joined)
                    // Credentials use id as the stored value, name as the display label
                    result = credentials.map((c) => ({ label: c.name, name: c.id }))
                } else if (loadMethod) {
                    const fn = getLoadMethod(loadMethod)
                    if (!fn) {
                        throw new Error(`Unknown loadMethod: "${loadMethod}"`)
                    }
                    const apis: ApiServices = { chatModelsApi, toolsApi, credentialsApi }
                    const raw = await fn(apis, paramsRef.current)
                    result = normalizeOptions(raw)
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
    }, [loadMethod, credentialNamesKey, fetchCounter, chatModelsApi, toolsApi, credentialsApi])

    return { options, loading, error, refetch }
}

/** Normalize raw API response into OptionItem[]. Handles objects with label/name, or plain strings. */
function normalizeOptions(raw: unknown): OptionItem[] {
    if (!Array.isArray(raw)) return []
    return raw
        .map((item) => {
            if (item && typeof item === 'object') {
                const obj = item as Record<string, unknown>
                const name = typeof obj.name === 'string' ? obj.name : ''
                const label = typeof obj.label === 'string' ? obj.label : name
                const description = typeof obj.description === 'string' ? obj.description : undefined
                return { label, name, description }
            }
            if (typeof item === 'string') {
                return { label: item, name: item }
            }
            return null
        })
        .filter((item): item is OptionItem => item !== null && item.name !== '')
}
