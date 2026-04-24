import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose'
import { discoverOidcMetadata } from './oidcDiscovery'

const jwksByIssuer = new Map<string, JWTVerifyGetKey>()

export async function getJwksVerifyKey(issuerUrl: string): Promise<JWTVerifyGetKey> {
    const normalized = issuerUrl.endsWith('/') ? issuerUrl.slice(0, -1) : issuerUrl
    let key = jwksByIssuer.get(normalized)
    if (key) return key

    const meta = await discoverOidcMetadata(normalized)
    key = createRemoteJWKSet(new URL(meta.jwks_uri))
    jwksByIssuer.set(normalized, key)
    return key
}
