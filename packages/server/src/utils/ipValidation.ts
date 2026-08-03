// packages/server/src/utils/ipValidation.ts

import { isIP } from 'net'

/**
 * Validates if a string is a valid IPv4 or IPv6 address.
 *
 * Uses Node.js built-in `net.isIP()` for robust validation that handles
 * standard formats, IPv4-mapped IPv6 addresses, and compressed IPv6 notation.
 *
 * @param ip - The IP address string to validate
 * @returns `true` if the string is a valid IPv4 or IPv6 address, `false` otherwise
 */
export function isValidIPAddress(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false
    return isIP(ip) !== 0 // Returns 4 for IPv4, 6 for IPv6, 0 for invalid
}

/**
 * Checks if a string is a valid IPv4 address.
 *
 * Uses Node.js built-in `net.isIP()` to determine if the address
 * is specifically IPv4 format.
 *
 * @param ip - The IP address string to validate
 * @returns `true` if the string is a valid IPv4 address, `false` otherwise
 */
export function isIPv4(ip: string): boolean {
    return isIP(ip) === 4
}

/**
 * Checks if a string is a valid IPv6 address.
 *
 * Uses Node.js built-in `net.isIP()` to determine if the address
 * is specifically IPv6 format (including compressed notation and IPv4-mapped addresses).
 *
 * @param ip - The IP address string to validate
 * @returns `true` if the string is a valid IPv6 address, `false` otherwise
 */
export function isIPv6(ip: string): boolean {
    return isIP(ip) === 6
}
