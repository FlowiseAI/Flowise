import { ReactNode, useEffect, useMemo } from 'react'
import { ReactFlowProvider } from 'reactflow'

import { ThemeProvider } from '@mui/material/styles'

import { createAgentflowTheme, generateCSSVariables } from './core/theme'
import type { FlowData } from './core/types'
import { AgentflowStateProvider, ApiProvider, ConfigProvider } from './infrastructure/store'

interface AgentflowProviderProps {
    /** Flowise API server endpoint */
    apiBaseUrl: string
    /** Authentication token for API calls */
    token?: string
    /** Whether to use dark mode (default: false) */
    isDarkMode?: boolean
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
    isDarkMode = false,
    components,
    readOnly = false,
    initialFlow,
    children
}: AgentflowProviderProps) {
    // Create MUI theme based on dark mode
    const theme = useMemo(() => createAgentflowTheme(isDarkMode), [isDarkMode])

    // Inject CSS variables into DOM for use in CSS files.
    // Split into two effects: one for updates (runs on isDarkMode change)
    // and one for cleanup (runs only on unmount) to avoid a flash of
    // missing variables when toggling dark mode.
    const styleId = 'agentflow-css-variables'

    useEffect(() => {
        let style = document.getElementById(styleId) as HTMLStyleElement

        if (!style) {
            style = document.createElement('style')
            style.id = styleId
            document.head.appendChild(style)
        }

        style.textContent = `:root { ${generateCSSVariables(isDarkMode)} }`
    }, [isDarkMode])

    useEffect(() => {
        return () => {
            const existingStyle = document.getElementById(styleId)
            if (existingStyle) {
                document.head.removeChild(existingStyle)
            }
        }
    }, [])

    return (
        <ReactFlowProvider>
            <ThemeProvider theme={theme}>
                <ApiProvider apiBaseUrl={apiBaseUrl} token={token}>
                    <ConfigProvider isDarkMode={isDarkMode} components={components} readOnly={readOnly}>
                        <AgentflowStateProvider initialFlow={initialFlow}>{children}</AgentflowStateProvider>
                    </ConfigProvider>
                </ApiProvider>
            </ThemeProvider>
        </ReactFlowProvider>
    )
}

export default AgentflowProvider
