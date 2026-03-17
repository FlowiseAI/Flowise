import { User } from '../enterprise/database/entities/user.entity'
import { isValidIPAddress } from './ipValidation'

export function sanitizeNullBytes(obj: any): any {
    const stack = [obj]

    while (stack.length) {
        const current = stack.pop()

        if (Array.isArray(current)) {
            for (let i = 0; i < current.length; i++) {
                const val = current[i]
                if (typeof val === 'string') {
                    // eslint-disable-next-line no-control-regex
                    current[i] = val.replace(/\u0000/g, '')
                } else if (val && typeof val === 'object') {
                    stack.push(val)
                }
            }
        } else if (current && typeof current === 'object') {
            for (const key in current) {
                if (!Object.hasOwnProperty.call(current, key)) continue
                const val = current[key]
                if (typeof val === 'string') {
                    // eslint-disable-next-line no-control-regex
                    current[key] = val.replace(/\u0000/g, '')
                } else if (val && typeof val === 'object') {
                    stack.push(val)
                }
            }
        }
    }

    return obj
}

export function sanitizeUser(user: Partial<User>) {
    delete user.credential
    delete user.tempToken
    delete user.tokenExpiry

    return user
}

/**
 * Masks the last octet of an IP address for privacy (GDPR compliance).
 *
 * This function sanitizes IP addresses by masking identifying information while
 * preserving network information. For IPv4, the last octet is masked. For IPv6,
 * the last 64 bits (interface identifier) are masked.
 *
 * @param ip - The IP address string to sanitize (IPv4 or IPv6 format)
 * @returns The sanitized IP address with masked octets/bits, or 'unknown' if invalid
 */
export function sanitizeIPAddress(ip: string): string {
    // Validate first
    if (!isValidIPAddress(ip)) {
        return 'unknown'
    }

    // Handle IPv4
    const ipv4Parts = ip.split('.')
    if (ipv4Parts.length === 4) {
        ipv4Parts[3] = 'xxx'
        return ipv4Parts.join('.')
    }

    // Handle IPv6 - mask last 64 bits
    if (ip.includes(':')) {
        const parts = ip.split(':')
        const masked = parts.slice(0, Math.ceil(parts.length / 2)).join(':')
        return `${masked}:xxxx:xxxx:xxxx:xxxx`
    }

    return 'xxx.xxx.xxx.xxx'
}

/**
 * Sanitizes audit-event metadata by redacting sensitive fields and removing null bytes.
 *
 * - Redacts values for keys whose names look sensitive (case-insensitive substring match),
 *   e.g. "password", "token", "secret", "authorization", etc.
 * - Runs `sanitizeNullBytes()` to remove any `\u0000` characters from string values.
 *
 * Note: `sanitizeNullBytes()` mutates nested objects/arrays. Since this function only
 * shallow-clones the input, nested objects may still be shared with the caller.
 *
 * @param metadata - Arbitrary event metadata (key/value pairs)
 * @returns A sanitized metadata object safe for audit logging
 */
export function sanitizeAuditMetadata(metadata: Record<string, any> | undefined | null): Record<string, any> {
    if (!metadata) return {}

    const sensitiveFields = [
        'password',
        'pwd',
        'pass',
        'secret',
        'token',
        'apikey',
        'api_key',
        'accesstoken',
        'access_token',
        'refreshtoken',
        'refresh_token',
        'clientsecret',
        'client_secret',
        'privatekey',
        'private_key',
        'secretkey',
        'secret_key',
        'auth',
        'authorization',
        'credential',
        'credentials',
        'ssn',
        'socialsecurity',
        'creditcard',
        'cvv'
    ]

    const sanitized: Record<string, any> = { ...metadata }

    for (const key of Object.keys(sanitized)) {
        const lowerKey = key.toLowerCase()
        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
            sanitized[key] = '********'
        }
    }

    return sanitizeNullBytes(sanitized)
}
