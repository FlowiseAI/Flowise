import { decodeJwt, jwtVerify } from 'jose'
import type { ExternalOAuthIntegration } from '../../database/entities/ExternalOAuthIntegration'
import { getJwksVerifyKey } from './jwks'
import { discoverOidcMetadata } from './oidcDiscovery'

export type VerifiedExternalToken = {
    issuer: string
    payload: Record<string, unknown>
}

function clientAllowed(payload: Record<string, unknown>, allowedClientIds: string[] | null): boolean {
    if (!allowedClientIds?.length) return true
    const azp = payload['azp'] ?? payload['cid'] ?? payload['client_id']
    return typeof azp === 'string' && allowedClientIds.includes(azp)
}

/**
 * Validates JWT access token signature and claims against integration configuration.
 */
export async function verifyExternalAccessToken(token: string, integration: ExternalOAuthIntegration): Promise<VerifiedExternalToken> {
    const meta = await discoverOidcMetadata(integration.issuerUrl)
    const expectedIssuer = meta.issuer
    const key = await getJwksVerifyKey(integration.issuerUrl)

    if (!integration.audiences?.length) {
        throw new Error('External OAuth integration has no audiences configured')
    }

    const { payload } = await jwtVerify(token, key, {
        issuer: expectedIssuer,
        audience: integration.audiences,
        clockTolerance: 30
    })

    const p = payload as Record<string, unknown>

    if (!clientAllowed(p, integration.allowedClientIds)) {
        throw new Error('OAuth client is not allowed for this integration')
    }

    return { issuer: expectedIssuer, payload: p }
}

/**
 * Decode JWT without verification — used only to read `iss` before DB lookup.
 */
export function unsafeDecodeIss(token: string): string | undefined {
    try {
        const p = decodeJwt(token)
        return typeof p.iss === 'string' ? p.iss : undefined
    } catch {
        return undefined
    }
}
