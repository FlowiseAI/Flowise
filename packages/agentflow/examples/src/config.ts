/**
 * Application configuration from environment variables
 */
export const apiBaseUrl = import.meta.env.VITE_INSTANCE_URL || ''
export const token = import.meta.env.VITE_API_TOKEN || undefined
