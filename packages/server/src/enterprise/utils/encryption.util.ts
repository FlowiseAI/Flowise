import bcrypt from 'bcryptjs'
import { AES, enc } from 'crypto-js'
import { getEncryptionKey } from '../../utils'

export function getPasswordSaltRounds(): number {
    return parseInt(process.env.PASSWORD_SALT_HASH_ROUNDS || '10', 10)
}

/**
 * Extracts the cost factor (salt rounds) from a bcrypt hash using bcrypt.getRounds().
 * @returns The number of rounds used, or null if the string is not a valid bcrypt hash.
 */
export function getBcryptRoundsFromHash(hash: string): number | null {
    try {
        return bcrypt.getRounds(hash)
    } catch {
        return null
    }
}

/**
 * Checks if a stored bcrypt hash was created with fewer rounds than the current minimum,
 * and should be rehashed for stronger security.
 * @param storedHash The bcrypt hash stored in the database.
 * @param minRounds The minimum acceptable number of salt rounds (e.g. 10).
 */
export function hashNeedsUpgrade(storedHash: string, minRounds: number): boolean {
    const rounds = getBcryptRoundsFromHash(storedHash)
    return rounds !== null && rounds < minRounds
}

export function getHash(value: string) {
    const salt = bcrypt.genSaltSync(getPasswordSaltRounds())
    return bcrypt.hashSync(value, salt)
}

export function compareHash(value1: string, value2: string) {
    return bcrypt.compareSync(value1, value2)
}

export async function encrypt(value: string) {
    const encryptionKey = await getEncryptionKey()
    return AES.encrypt(value, encryptionKey).toString()
}

export async function decrypt(value: string) {
    const encryptionKey = await getEncryptionKey()
    return AES.decrypt(value, encryptionKey).toString(enc.Utf8)
}
