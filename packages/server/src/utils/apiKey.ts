import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

/**
 * Generate the api key
 * @returns {string}
 */
export const generateAPIKey = (): string => {
    const buffer = randomBytes(32)
    return buffer.toString('base64url')
}

/**
 * Generate the secret key
 * @param {string} apiKey
 * @returns {string}
 */
export const generateSecretHash = (apiKey: string): string => {
    const salt = randomBytes(8).toString('hex')
    const buffer = scryptSync(apiKey, salt, 64) as Buffer
    return `${buffer.toString('hex')}.${salt}`
}

/**
 * Verify valid keys
 * @param {string} storedKey
 * @param {string} suppliedKey
 * @returns {boolean}
 */
export const compareKeys = (storedKey: string, suppliedKey: string): boolean => {
    const [hashedPassword, salt] = storedKey.split('.')
    const buffer = scryptSync(suppliedKey, salt, 64) as Buffer
    return timingSafeEqual(Buffer.from(hashedPassword, 'hex'), buffer)
}
