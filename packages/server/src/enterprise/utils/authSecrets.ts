import * as crypto from 'crypto'

/**
 * Weak default values that were previously hardcoded when env vars were not set.
 * If the user has set a var to one of these, we treat it as "not set" and auto-derive instead.
 */
const WEAK_DEFAULTS: Record<string, string> = {
    JWT_AUTH_TOKEN_SECRET: 'AABBCCDDAABBCCDDAABBCCDDAABBCCDDAABBCCDD',
    JWT_REFRESH_TOKEN_SECRET: 'AABBCCDDAABBCCDDAABBCCDDAABBCCDDAABBCCDD'
}

const DERIVATION_SALTS: Record<string, string> = {
    TOKEN_HASH_SECRET: 'token_hash_secret',
    EXPRESS_SESSION_SECRET: 'express_session_secret',
    JWT_AUTH_TOKEN_SECRET: 'jwt_auth_token_secret',
    JWT_REFRESH_TOKEN_SECRET: 'jwt_refresh_token_secret',
    JWT_ISSUER: 'jwt_issuer',
    JWT_AUDIENCE: 'jwt_audience'
}

let tokenHashSecret: string | undefined
let expressSessionSecret: string | undefined
let jwtAuthTokenSecret: string | undefined
let jwtRefreshTokenSecret: string | undefined
let jwtIssuer: string | undefined
let jwtAudience: string | undefined

const NOT_INITIALIZED = 'Auth secrets not initialized. Call initAuthSecrets() first.'

function deriveSecret(encryptionKey: string, salt: string): string {
    return crypto
        .createHash('sha256')
        .update(encryptionKey + salt)
        .digest('hex')
}

type AuthSecretName = keyof typeof DERIVATION_SALTS

/**
 * Initialize auth secrets from env or by deriving from the encryption key.
 * Call once after getEncryptionKey() in initDatabase().
 * - Vars with a weak default in WEAK_DEFAULTS (JWT secrets): use env only if set and not equal to that default; otherwise derive.
 * - Vars without a weak default (commented out in .env.example): use env if set and non-empty; otherwise derive.
 */
export function initAuthSecrets(encryptionKey: string): void {
    const resolve = (name: AuthSecretName): string => {
        const envVal = process.env[name]
        const weakDefault = WEAK_DEFAULTS[name]
        const useEnv = envVal && envVal.trim() !== '' && (weakDefault === undefined || envVal !== weakDefault)
        if (useEnv) {
            return envVal
        }
        if (name === 'JWT_ISSUER' || name === 'JWT_AUDIENCE') {
            return 'flowise'
        }
        return deriveSecret(encryptionKey, DERIVATION_SALTS[name])
    }

    tokenHashSecret = resolve('TOKEN_HASH_SECRET')
    expressSessionSecret = resolve('EXPRESS_SESSION_SECRET')
    jwtAuthTokenSecret = resolve('JWT_AUTH_TOKEN_SECRET')
    jwtRefreshTokenSecret = resolve('JWT_REFRESH_TOKEN_SECRET')
    jwtIssuer = resolve('JWT_ISSUER')
    jwtAudience = resolve('JWT_AUDIENCE')
}

export function getTokenHashSecret(): string {
    if (tokenHashSecret === undefined) throw new Error(NOT_INITIALIZED)
    return tokenHashSecret
}

export function getExpressSessionSecret(): string {
    if (expressSessionSecret === undefined) throw new Error(NOT_INITIALIZED)
    return expressSessionSecret
}

export function getJWTAuthTokenSecret(): string {
    if (jwtAuthTokenSecret === undefined) throw new Error(NOT_INITIALIZED)
    return jwtAuthTokenSecret
}

export function getJWTRefreshTokenSecret(): string {
    if (jwtRefreshTokenSecret === undefined) throw new Error(NOT_INITIALIZED)
    return jwtRefreshTokenSecret
}

export function getJWTIssuer(): string {
    if (jwtIssuer === undefined) throw new Error(NOT_INITIALIZED)
    return jwtIssuer
}

export function getJWTAudience(): string {
    if (jwtAudience === undefined) throw new Error(NOT_INITIALIZED)
    return jwtAudience
}
