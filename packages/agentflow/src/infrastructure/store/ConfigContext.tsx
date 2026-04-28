import { createContext, ReactNode, useContext, useMemo } from 'react'

import type { ConfigContextValue } from '@/core/types'

const ConfigContext = createContext<ConfigContextValue | null>(null)

interface ConfigProviderProps {
    isDarkMode?: boolean
    components?: string[]
    readOnly?: boolean
    children: ReactNode
}

export function ConfigProvider({ isDarkMode = false, components, readOnly = false, children }: ConfigProviderProps) {
    const value = useMemo<ConfigContextValue>(
        () => ({
            isDarkMode,
            components,
            readOnly
        }),
        [isDarkMode, components, readOnly]
    )

    return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfigContext(): ConfigContextValue {
    const context = useContext(ConfigContext)
    if (!context) {
        throw new Error('useConfigContext must be used within AgentflowProvider')
    }
    return context
}

export { ConfigContext }
