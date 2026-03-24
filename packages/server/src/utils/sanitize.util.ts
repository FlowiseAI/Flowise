import { User } from '../enterprise/database/entities/user.entity'
import { isIPv4, isIPv6, isValidIPAddress } from './ipValidation'

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
 * Expands an IPv6 string to exactly 8 groups of 16-bit hex, handling :: and IPv4-mapped form.
 */
function expandIPv6ToGroups(ip: string): string[] {
    let parts = ip.split(':')

    // IPv4-mapped: last segment can be dotted decimal (e.g. 192.168.1.1)
    const last = parts[parts.length - 1]
    if (last?.includes('.')) {
        const octets = last.split('.').map(Number)
        if (octets.length === 4 && octets.every((n) => n >= 0 && n <= 255)) {
            const high = (octets[0] << 8) | octets[1]
            const low = (octets[2] << 8) | octets[3]
            parts = [...parts.slice(0, -1), high.toString(16), low.toString(16)]
        }
    }

    if (parts.includes('')) {
        const emptyIdx = parts.indexOf('')
        const zeroCount = 8 - (parts.length - 1)
        const zeros = Array(zeroCount).fill('0000')
        parts = [...parts.slice(0, emptyIdx), ...zeros, ...parts.slice(emptyIdx + 1)]
    }

    return parts.map((p) => p.padStart(4, '0').toLowerCase())
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
    if (!isValidIPAddress(ip)) {
        return 'unknown'
    }

    if (isIPv4(ip)) {
        const parts = ip.split('.')
        parts[3] = 'xxx'
        return parts.join('.')
    }

    if (isIPv6(ip)) {
        const groups = expandIPv6ToGroups(ip)
        if (groups.length !== 8) return 'unknown'
        const prefix = groups.slice(0, 4).join(':')
        return `${prefix}:xxxx:xxxx:xxxx:xxxx`
    }

    return 'unknown'
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

    function sanitizeValue(value: any, key: string): any {
        const lowerKey = key.toLowerCase()
        const isSensitive = sensitiveFields.some((field) => lowerKey.includes(field))

        if (isSensitive) {
            return '********'
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return sanitizeObject(value)
        }

        if (Array.isArray(value)) {
            return value.map((item, index) => sanitizeValue(item, `${key}[${index}]`))
        }

        return value
    }

    function sanitizeObject(obj: Record<string, any>): Record<string, any> {
        const result: Record<string, any> = {}
        for (const key of Object.keys(obj)) {
            result[key] = sanitizeValue(obj[key], key)
        }
        return result
    }

    return sanitizeNullBytes(sanitizeObject(metadata))
}
