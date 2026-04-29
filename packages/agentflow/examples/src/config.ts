/**
 * Application configuration from environment variables
 */
// When VITE_INSTANCE_URL is set, use it directly (cross-origin with API key).
// Otherwise use the dev server origin so Vite's proxy routes /api/* to the backend (no CORS, cookies work).
export const apiBaseUrl = import.meta.env.VITE_INSTANCE_URL || window.location.origin
export const token = import.meta.env.VITE_API_TOKEN || undefined
export const agentflowId = import.meta.env.VITE_FLOW_ID || undefined
