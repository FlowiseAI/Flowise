/* eslint-disable no-console */
/**
 * Whether the environment is development.
 * Vite exposes env via import.meta.env
 */
const isDev = typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true

/** Hard-coded error messages. Use only these keys when calling error(). */
export const LOG_ERROR_MESSAGES = {
    AUTH_401: '[Agentflow] Authentication failed (401).',
    LOAD_CHAT_MODELS: '[Agentflow] Failed to load chat models.',
    LOAD_NODES: '[Agentflow] Failed to load nodes from API.',
    PARSE_DROPPED_NODE: '[Agentflow] Failed to parse dropped node data.',
    VALIDATION_ERRORS: '[Agentflow] Validation failed.'
} as const

export type LogErrorCode = keyof typeof LOG_ERROR_MESSAGES

function noop(_?: unknown, ..._rest: unknown[]) {}

/**
 * Logs only in development. No-op in production for security reasons.
 */
export const log = isDev ? console.log.bind(console) : noop
export const warn = isDev ? console.warn.bind(console) : noop
export const debug = isDev ? console.debug.bind(console) : noop
export const info = isDev ? console.info.bind(console) : noop

/**
 * Logs to console.error. In development, logs the hard-coded message and any payload
 * (e.g. the thrown error). In production, logs only the hard-coded message.
 */
export function error(code: LogErrorCode, payload?: unknown): void {
    if (isDev && payload !== undefined) {
        console.error(LOG_ERROR_MESSAGES[code], payload)
    } else {
        console.error(LOG_ERROR_MESSAGES[code])
    }
}
