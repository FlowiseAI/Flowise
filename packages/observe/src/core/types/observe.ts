// ============================================================================
// Component Props — Public API surface for @flowiseai/observe
// ============================================================================

import type { InternalAxiosRequestConfig } from 'axios'

import type { ExecutionFilters, HumanInputParams } from './execution'

/**
 * Callback to customize outgoing Axios requests.
 * Receives the full request config — modify only what you need and return it.
 * If the callback throws, the original unmodified config is used.
 */
export type RequestInterceptor = (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig

// ============================================================================
// Shared base props used by all observe components
// ============================================================================

export interface ObserveBaseProps {
    /** Flowise API server endpoint (e.g. "https://flowise-url.com") */
    apiBaseUrl: string
    /**
     * API key — injected as `Authorization: Bearer <token>`.
     * Optional when using requestInterceptor for session-based or proxy auth.
     */
    token?: string
    /**
     * Customize outgoing API requests (e.g. inject session cookies, proxy headers).
     * Runs after the Bearer token header is set, so it can override or extend it.
     * Use this instead of (or alongside) token when the host app owns auth routing.
     */
    requestInterceptor?: RequestInterceptor
    /** Whether to use dark mode (default: false) */
    isDarkMode?: boolean
}

// ============================================================================
// ExecutionsViewer props
// ============================================================================

export interface ExecutionsViewerProps {
    /**
     * When provided, scopes the list to a single agentflow (M1 / DevSite use case).
     * When omitted, shows the full cross-agent list (M2 / OSS use case).
     */
    agentflowId?: string
    /**
     * Whether to show a delete icon on each row (default: false).
     * The SDK handles the DELETE API call internally.
     */
    allowDelete?: boolean
    /**
     * Polling interval in ms while an execution is INPROGRESS (default: 3000).
     * Set to 0 to disable auto-poll and use manual refresh only.
     */
    pollInterval?: number
    /**
     * Pluggable HITL callback. When provided, Approve/Reject buttons are rendered
     * on INPROGRESS human input nodes. The SDK does NOT make the prediction call —
     * the consumer owns the routing (direct Flowise or via AgentForge proxy).
     */
    onHumanInput?: (agentflowId: string, params: HumanInputParams) => Promise<void>
    /** Initial filter state */
    initialFilters?: Partial<ExecutionFilters>
    /** See ExecutionDetailProps.onAgentflowClick — threaded through to the detail drawer */
    onAgentflowClick?: (agentflowId: string) => void
}

// ============================================================================
// ExecutionDetail props
// ============================================================================

export interface ExecutionDetailProps {
    /** Execution ID to fetch and display */
    executionId: string
    /** See ExecutionsViewerProps.pollInterval */
    pollInterval?: number
    /** See ExecutionsViewerProps.onHumanInput */
    onHumanInput?: (agentflowId: string, params: HumanInputParams) => Promise<void>
    /** Called when the drawer/panel is closed (if rendered in a dismissible context) */
    onClose?: () => void
    /**
     * When provided, the agentflow name in the detail header is rendered as a clickable chip.
     * The SDK does NOT navigate — the consumer owns routing.
     * When absent, the name is rendered as plain text (or omitted if no name is available).
     */
    onAgentflowClick?: (agentflowId: string) => void
}
