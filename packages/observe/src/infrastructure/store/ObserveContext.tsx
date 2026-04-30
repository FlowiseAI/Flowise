import { createContext, type ReactNode, useContext, useMemo } from 'react'

import { ThemeProvider } from '@mui/material/styles'

import { createObserveTheme } from '@/core/theme'
import type { RequestInterceptor } from '@/core/types'
import { bindApiClient, createExecutionsApi, type ExecutionsApi } from '@/infrastructure/api'

// ============================================================================
// API Context — provides initialized API modules to all observe components
// ============================================================================

interface ObserveApiContextValue {
    executions: ExecutionsApi
}

const ObserveApiContext = createContext<ObserveApiContextValue | null>(null)

export function useObserveApi(): ObserveApiContextValue {
    const ctx = useContext(ObserveApiContext)
    if (!ctx) throw new Error('useObserveApi must be used inside ObserveProvider')
    return ctx
}

// ============================================================================
// Config Context — provides shared config (dark mode, etc.)
// ============================================================================

interface ObserveConfigContextValue {
    isDarkMode: boolean
    apiBaseUrl: string
}

const ObserveConfigContext = createContext<ObserveConfigContextValue>({ isDarkMode: false, apiBaseUrl: '' })

export function useObserveConfig(): ObserveConfigContextValue {
    return useContext(ObserveConfigContext)
}

// ============================================================================
// ObserveProvider — root provider for all observe components
// ============================================================================

interface ObserveProviderProps {
    apiBaseUrl: string
    token?: string
    requestInterceptor?: RequestInterceptor
    isDarkMode?: boolean
    children: ReactNode
}

export function ObserveProvider({ apiBaseUrl, token, requestInterceptor, isDarkMode = false, children }: ObserveProviderProps) {
    const theme = useMemo(() => createObserveTheme(isDarkMode), [isDarkMode])

    const api = useMemo(() => {
        const client = bindApiClient(apiBaseUrl, token, requestInterceptor)
        return { executions: createExecutionsApi(client) }
    }, [apiBaseUrl, token, requestInterceptor])

    const config = useMemo(() => ({ isDarkMode, apiBaseUrl }), [isDarkMode, apiBaseUrl])

    return (
        <ThemeProvider theme={theme}>
            <ObserveApiContext.Provider value={api}>
                <ObserveConfigContext.Provider value={config}>{children}</ObserveConfigContext.Provider>
            </ObserveApiContext.Provider>
        </ThemeProvider>
    )
}
