import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

import type { ConfigContextValue } from '../../core/types'

const ConfigContext = createContext<ConfigContextValue | null>(null)

interface ConfigProviderProps {
    theme?: 'light' | 'dark' | 'system'
    components?: string[]
    readOnly?: boolean
    children: ReactNode
}

export function ConfigProvider({ theme = 'system', components, readOnly = false, children }: ConfigProviderProps) {
    const [isDarkMode, setIsDarkMode] = useState(false)

    // Determine dark mode based on theme setting
    useEffect(() => {
        if (theme === 'dark') {
            setIsDarkMode(true)
        } else if (theme === 'light') {
            setIsDarkMode(false)
        } else {
            // system preference
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            setIsDarkMode(mediaQuery.matches)

            const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
            mediaQuery.addEventListener('change', handler)
            return () => mediaQuery.removeEventListener('change', handler)
        }
    }, [theme])

    const value = useMemo<ConfigContextValue>(
        () => ({
            theme,
            components,
            readOnly,
            isDarkMode
        }),
        [theme, components, readOnly, isDarkMode]
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
