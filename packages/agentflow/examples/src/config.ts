/**
 * Application configuration from environment variables
 */
export const apiBaseUrl = import.meta.env.VITE_INSTANCE_URL || 'http://localhost:3000'
export const token = import.meta.env.VITE_API_TOKEN || undefined
