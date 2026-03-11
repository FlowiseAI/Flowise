import type { ReactNode } from 'react'
import { ConfigProvider } from './infrastructure/store/ConfigContext'
import { ApiProvider } from './infrastructure/store/ApiContext'
import type { AgentExecutionsConfig } from './types'

export interface AgentExecutionsProviderProps extends AgentExecutionsConfig {
    children: ReactNode
}

export const AgentExecutionsProvider = ({ children, ...config }: AgentExecutionsProviderProps) => {
    return (
        <ConfigProvider config={config}>
            <ApiProvider apiBaseUrl={config.apiBaseUrl} token={config.token}>
                {children}
            </ApiProvider>
        </ConfigProvider>
    )
}
