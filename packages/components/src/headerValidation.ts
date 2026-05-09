const RFC7230_TOKEN = /^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/

const DENIED_HEADER_NAMES = new Set([
    'host',
    'content-length',
    'transfer-encoding',
    'connection',
    'upgrade',
    'cookie',
    'set-cookie',
    'proxy-authorization',
    'proxy-connection'
])

const DENIED_HEADER_PREFIXES = ['proxy-', 'x-forwarded-', 'sec-']

const SENSITIVE_HEADER_NAMES = new Set([
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'x-amz-security-token'
])

const REDACTED_PLACEHOLDER = '[REDACTED]'

const MAX_HEADERS = 25
const MAX_KEY_LENGTH = 128
const MAX_VALUE_LENGTH = 2048

/**
 * Validates a set of user-supplied HTTP headers intended for outbound requests.
 * Rejects malformed keys, CRLF/control-char injection in values, hop-by-hop and
 * sensitive header names, and oversized payloads. Throws a plain Error; callers
 * are responsible for mapping to their own error types.
 */
export function validateCustomHeaders(headers: Record<string, string>): void {
    if (!headers || typeof headers !== 'object') {
        throw new Error('Invalid headers: expected an object')
    }

    const entries = Object.entries(headers)
    if (entries.length > MAX_HEADERS) {
        throw new Error(`Invalid headers: too many entries (max ${MAX_HEADERS})`)
    }

    for (const [key, value] of entries) {
        if (typeof key !== 'string' || key.length === 0) {
            throw new Error('Invalid header: key must be a non-empty string')
        }
        if (key.length > MAX_KEY_LENGTH) {
            throw new Error(`Invalid header "${key}": key exceeds ${MAX_KEY_LENGTH} chars`)
        }
        if (!RFC7230_TOKEN.test(key)) {
            throw new Error(`Invalid header "${key}": key contains illegal characters`)
        }

        const lower = key.toLowerCase()
        if (DENIED_HEADER_NAMES.has(lower) || DENIED_HEADER_PREFIXES.some((p) => lower.startsWith(p))) {
            throw new Error(`Invalid header "${key}": this header name is not allowed`)
        }

        if (typeof value !== 'string') {
            throw new Error(`Invalid header "${key}": value must be a string`)
        }
        if (value.length > MAX_VALUE_LENGTH) {
            throw new Error(`Invalid header "${key}": value exceeds ${MAX_VALUE_LENGTH} chars`)
        }
        for (let i = 0; i < value.length; i++) {
            const code = value.charCodeAt(i)
            if (code === 0x0d || code === 0x0a || (code < 0x20 && code !== 0x09)) {
                throw new Error(`Invalid header "${key}": value contains illegal control characters`)
            }
        }
    }
}

/**
 * Returns a copy of `headers` with credential-bearing entries (Authorization, Cookie, X-Api-Key, …)
 * replaced by a placeholder string. Used at trust boundaries before a header bag is exposed to flow
 * templates, observers, or logs. Comparison is case-insensitive; non-sensitive headers pass through.
 */
export function redactSensitiveHeaders(headers: Record<string, any> | undefined | null): Record<string, any> {
    if (!headers) return {}
    const out: Record<string, any> = {}
    for (const [key, value] of Object.entries(headers)) {
        out[key] = SENSITIVE_HEADER_NAMES.has(key.toLowerCase()) ? REDACTED_PLACEHOLDER : value
    }
    return out
}
