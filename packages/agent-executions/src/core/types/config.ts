export interface AgentExecutionsConfig {
    apiBaseUrl: string
    token?: string
    isDarkMode?: boolean
    permissions?: string[]
    onNotification?: (message: string, variant: 'success' | 'error') => void
    originUrl?: string
    agentCanvasUrlPattern?: string
    portalElement?: HTMLElement | null
}
