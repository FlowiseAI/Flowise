import { ReactNode } from 'react'
import { ReactFlowProvider } from 'reactflow'

import type { FlowData } from './core/types'
import { AgentflowStateProvider, ApiProvider, ConfigProvider } from './infrastructure/store'

interface AgentflowProviderProps {
    /** Flowise API server endpoint */
    apiBaseUrl: string
    /** Authentication token for API calls */
    token?: string
    /** Theme override */
    theme?: 'light' | 'dark' | 'system'
    /** Array of allowed node component names */
    components?: string[]
    /** Whether the canvas is read-only */
    readOnly?: boolean
    /** Initial flow data */
    initialFlow?: FlowData
    /** Children to render */
    children: ReactNode
}

/**
 * Provider component that wraps the entire Agentflow application.
 * Sets up all required contexts for API access, configuration, and state management.
 */
export function AgentflowProvider({
    apiBaseUrl,
    token,
    theme = 'system',
    components,
    readOnly = false,
    initialFlow,
    children
}: AgentflowProviderProps) {
    return (
        <ReactFlowProvider>
            <ApiProvider apiBaseUrl={apiBaseUrl} token={token}>
                <ConfigProvider theme={theme} components={components} readOnly={readOnly}>
                    <AgentflowStateProvider initialFlow={initialFlow}>{children}</AgentflowStateProvider>
                </ConfigProvider>
            </ApiProvider>
        </ReactFlowProvider>
    )
}

export default AgentflowProvider
