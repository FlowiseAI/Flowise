import { createContext, useContext, type ReactNode } from 'react'
import type { AgentExecutionsConfig } from '../../types'

const ConfigContext = createContext<AgentExecutionsConfig | null>(null)

export const useConfigContext = (): AgentExecutionsConfig => {
    const context = useContext(ConfigContext)
    if (!context) {
        throw new Error('useConfigContext must be used within an AgentExecutionsProvider')
    }
    return context
}

interface ConfigProviderProps {
    config: AgentExecutionsConfig
    children: ReactNode
}

export const ConfigProvider = ({ config, children }: ConfigProviderProps) => {
    return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}
