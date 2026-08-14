export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
export const token = import.meta.env.VITE_API_TOKEN || undefined
// Accepts a single UUID or a comma-separated list. Always normalizes to a
// string[] (or undefined when unset/empty) so the demo can pass it straight to
// `agentflowIds`.
export const flowIds: string[] | undefined = (() => {
    const raw = import.meta.env.VITE_FLOW_IDS as string | undefined
    if (!raw) return undefined
    const ids = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    return ids.length > 0 ? ids : undefined
})()
export const executionId = import.meta.env.VITE_EXECUTION_ID || undefined

// Base URL of the agentflow canvas (optional). Independent of `apiBaseUrl`
// because the canvas can live on a different host than the Flowise API.
// Demos that consume this append `/<agentflowId>` to navigate.
export const agentflowCanvasUrl = import.meta.env.VITE_AGENTFLOW_CANVAS_URL || undefined
