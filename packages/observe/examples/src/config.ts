export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
export const token = import.meta.env.VITE_API_TOKEN || undefined
export const flowId = import.meta.env.VITE_FLOW_ID || undefined
export const executionId = import.meta.env.VITE_EXECUTION_ID || undefined

// Base URL of the agentflow canvas (optional). Independent of `apiBaseUrl`
// because the canvas can live on a different host than the Flowise API.
// Demos that consume this append `/<agentflowId>` to navigate.
export const agentflowCanvasUrl = import.meta.env.VITE_AGENTFLOW_CANVAS_URL || undefined
