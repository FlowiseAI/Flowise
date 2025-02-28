import { Langfuse } from 'langfuse'
import type { LangfuseClient } from './types'

// Initialize Langfuse client
export const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
    secretKey: process.env.LANGFUSE_SECRET_KEY!,
    baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'
}) as unknown as LangfuseClient

// Logger setup
export const log = {
    error: (message: string, meta?: Record<string, any>) => console.error(`[billing:error] ${message}`, meta || ''),
    warn: (message: string, meta?: Record<string, any>) => console.warn(`[billing:warn] ${message}`, meta || ''),
    info: (message: string, meta?: Record<string, any>) => console.info(`[billing:info] ${message}`, meta || ''),
    debug: (message: string, meta?: Record<string, any>) => console.debug(`[billing:debug] ${message}`, meta || '')
}
