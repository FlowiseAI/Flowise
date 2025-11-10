import { randomBytes } from 'crypto'

export function generateRandomString32(): string {
    return randomBytes(32).toString('hex')
}
