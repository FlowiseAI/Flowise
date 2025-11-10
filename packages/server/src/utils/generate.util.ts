import { randomBytes } from 'crypto'

/**
 * Generates a cryptographically secure 32-byte random string, returned as a 64-character hex string.
 * @returns {string} A 64-character hexadecimal string.
 */
export function generateRandomString32(): string {
    return randomBytes(32).toString('hex')
}
