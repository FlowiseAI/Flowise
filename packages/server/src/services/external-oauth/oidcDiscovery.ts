import axios from 'axios'
import logger from '../../utils/logger'

export type OidcMetadata = {
    issuer: string
    jwks_uri: string
}

const discoveryCache = new Map<string, { metadata: OidcMetadata; expiresAt: number }>()
const CACHE_TTL_MS = 15 * 60 * 1000

function wellKnownUrl(issuer: string): string {
    const base = issuer.endsWith('/') ? issuer.slice(0, -1) : issuer
    return `${base}/.well-known/openid-configuration`
}

/**
 * Fetches OIDC discovery document (cached) to obtain JWKS URI for token verification.
 */
export async function discoverOidcMetadata(issuerUrl: string): Promise<OidcMetadata> {
    const now = Date.now()
    const cached = discoveryCache.get(issuerUrl)
    if (cached && cached.expiresAt > now) {
        return cached.metadata
    }

    const url = wellKnownUrl(issuerUrl)
    try {
        const { data } = await axios.get<OidcMetadata>(url, { timeout: 3000 })
        if (!data?.jwks_uri || !data?.issuer) {
            throw new Error('Invalid OIDC discovery document')
        }
        discoveryCache.set(issuerUrl, {
            metadata: { issuer: data.issuer, jwks_uri: data.jwks_uri },
            expiresAt: now + CACHE_TTL_MS
        })
        return { issuer: data.issuer, jwks_uri: data.jwks_uri }
    } catch (e) {
        logger.warn(`[external-oauth]: OIDC discovery failed for ${url}: ${e instanceof Error ? e.message : e}`)
        throw e
    }
}
