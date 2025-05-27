import { LoggedInUser } from '../Interface.Enterprise'
import * as crypto from 'crypto'
import moment from 'moment'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 64)

// Generate a copy of the users without their passwords.
export const generateSafeCopy = (user: Partial<LoggedInUser>, deleteEmail?: boolean): any => {
    let _user: any = { ...user }
    delete _user.credential
    delete _user.tempToken
    delete _user.tokenExpiry
    if (deleteEmail) {
        delete _user.email
    }
    delete _user.workspaceIds
    delete _user.ssoToken
    delete _user.ssoRefreshToken
    return _user
}

export const generateTempToken = () => {
    // generate a token with nanoid and return it
    const token = nanoid()
    return token
}

// Encrypt token with password using crypto.Cipheriv
export const encryptToken = (stringToEncrypt: string) => {
    const key = crypto
        .createHash('sha256')
        .update(process.env.TOKEN_HASH_SECRET || 'Secre$t')
        .digest()

    const IV_LENGTH = 16
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    const encrypted = cipher.update(stringToEncrypt)

    const result = Buffer.concat([encrypted, cipher.final()])

    // formatted string [iv]:[token]
    return iv.toString('hex') + ':' + result.toString('hex')
}

// Decrypt token using the inverse of encryption crypto algorithm
export const decryptToken = (stringToDecrypt: string): string | undefined => {
    try {
        const key = crypto
            .createHash('sha256')
            .update(process.env.TOKEN_HASH_SECRET || 'Secre$t')
            .digest()

        let textParts = stringToDecrypt.split(':')
        let iv = Buffer.from(textParts.shift() as string, 'hex')
        let encryptedText = Buffer.from(textParts.join(':'), 'hex')
        let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
        let decrypted = decipher.update(encryptedText)

        const result = Buffer.concat([decrypted, decipher.final()])

        return result.toString()
    } catch (error) {
        return undefined
    }
}

// Extract userUUID from decrypted token string
export const getUserUUIDFromToken = (token: string): string | undefined => {
    try {
        const userUUIDHash = token.split('-')[2]
        return Buffer.from(userUUIDHash, 'base64').toString('ascii')
    } catch (error) {
        return undefined
    }
}

export const isTokenValid = (tokenExpiry: Date, tokenType: TokenType): boolean => {
    // Using moment.diff method for retrieve dates difference in hours
    const tokenTimestampDate = moment(tokenExpiry)
    const now = moment()

    if (tokenType === TokenType.INVITE) {
        const expiryInHours = process.env.INVITE_TOKEN_EXPIRY_IN_HOURS ? parseInt(process.env.INVITE_TOKEN_EXPIRY_IN_HOURS) : 24
        // Fail if more than 24 hours
        const diff = now.diff(tokenTimestampDate, 'hours')
        if (Math.abs(diff) > expiryInHours) return false
    } else if (tokenType === TokenType.PASSWORD_RESET) {
        const expiryInMins = process.env.PASSWORD_RESET_TOKEN_EXPIRY_IN_MINUTES
            ? parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_IN_MINUTES)
            : 15
        const diff = now.diff(tokenTimestampDate, 'minutes')
        if (Math.abs(diff) > expiryInMins) return false
    }
    return true
}

export enum TokenType {
    INVITE = 'INVITE',
    PASSWORD_RESET = 'PASSWORD_RESET'
}
