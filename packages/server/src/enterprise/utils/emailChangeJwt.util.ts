import jwt, { JwtPayload } from 'jsonwebtoken'
import { getJWTAuthTokenSecret } from './authSecrets'

export const EMAIL_CHANGE_JWT_TYP = 'email_change'

export function signEmailChangeJwt(userId: string, newEmail: string, expiryHours: number): { token: string; tokenExpiry: Date } {
    const secret = getJWTAuthTokenSecret()
    const token = jwt.sign({ typ: EMAIL_CHANGE_JWT_TYP, sub: userId, newEmail }, secret, {
        expiresIn: `${expiryHours}h`
    })
    const decoded = jwt.decode(token) as JwtPayload
    if (!decoded?.exp) throw new Error('Failed to decode email change token')
    const tokenExpiry = new Date(decoded.exp * 1000)
    return { token, tokenExpiry }
}

export function verifyEmailChangeJwt(token: string): { userId: string; newEmail: string } {
    const secret = getJWTAuthTokenSecret()
    const payload = jwt.verify(token, secret) as JwtPayload
    if (payload.typ !== EMAIL_CHANGE_JWT_TYP || typeof payload.newEmail !== 'string' || typeof payload.sub !== 'string') {
        throw new jwt.JsonWebTokenError('Invalid email change token payload')
    }
    return { userId: payload.sub, newEmail: payload.newEmail }
}

export function isEmailChangeJwtShape(token: string | undefined | null): token is string {
    return Boolean(token && token.split('.').length === 3)
}
