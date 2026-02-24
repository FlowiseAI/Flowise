import { getOrCreateStoredSecret } from '../../utils'

/**
 * Weak default values that were previously hardcoded when env vars were not set.
 * If the user has set a var to one of these, we treat it as "not set" and use file/AWS storage instead.
 */
const WEAK_DEFAULTS: Record<string, string> = {
    JWT_AUTH_TOKEN_SECRET: 'AABBCCDDAABBCCDDAABBCCDDAABBCCDDAABBCCDD',
    JWT_REFRESH_TOKEN_SECRET: 'AABBCCDDAABBCCDDAABBCCDDAABBCCDDAABBCCDD',
    EXPRESS_SESSION_SECRET: 'flowise',
    TOKEN_HASH_SECRET: 'popcorn'
}

let tokenHashSecret: string | undefined
let expressSessionSecret: string | undefined
let jwtAuthTokenSecret: string | undefined
let jwtRefreshTokenSecret: string | undefined
let jwtIssuer: string | undefined
let jwtAudience: string | undefined

const NOT_INITIALIZED = 'Auth secrets not initialized. Call initAuthSecrets() first.'

/**
 * Initialize auth secrets from env (backwards compat) → AWS Secrets Manager → filesystem.
 * Each secret is generated with crypto.randomBytes(32) when created (or 'flowise' for JWT_ISSUER/JWT_AUDIENCE).
 * Call once after getEncryptionKey() in initDatabase().
 */
export async function initAuthSecrets(): Promise<void> {
    tokenHashSecret = await getOrCreateStoredSecret({
        envKey: 'TOKEN_HASH_SECRET',
        fileName: 'token_hash_secret.key',
        awsSecretIdSuffix: 'TokenHashSecret',
        weakDefault: WEAK_DEFAULTS.TOKEN_HASH_SECRET
    })

    expressSessionSecret = await getOrCreateStoredSecret({
        envKey: 'EXPRESS_SESSION_SECRET',
        fileName: 'express_session_secret.key',
        awsSecretIdSuffix: 'ExpressSessionSecret',
        weakDefault: WEAK_DEFAULTS.EXPRESS_SESSION_SECRET
    })

    jwtAuthTokenSecret = await getOrCreateStoredSecret({
        envKey: 'JWT_AUTH_TOKEN_SECRET',
        fileName: 'jwt_auth_token_secret.key',
        awsSecretIdSuffix: 'JWTAuthTokenSecret',
        weakDefault: WEAK_DEFAULTS.JWT_AUTH_TOKEN_SECRET
    })

    jwtRefreshTokenSecret = await getOrCreateStoredSecret({
        envKey: 'JWT_REFRESH_TOKEN_SECRET',
        fileName: 'jwt_refresh_token_secret.key',
        awsSecretIdSuffix: 'JWTRefreshTokenSecret',
        weakDefault: WEAK_DEFAULTS.JWT_REFRESH_TOKEN_SECRET
    })

    jwtIssuer = await getOrCreateStoredSecret({
        envKey: 'JWT_ISSUER',
        fileName: 'jwt_issuer.key',
        awsSecretIdSuffix: 'JWTIssuer',
        defaultValueForNew: 'flowise'
    })

    jwtAudience = await getOrCreateStoredSecret({
        envKey: 'JWT_AUDIENCE',
        fileName: 'jwt_audience.key',
        awsSecretIdSuffix: 'JWTAudience',
        defaultValueForNew: 'flowise'
    })
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
