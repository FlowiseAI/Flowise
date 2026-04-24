import type { ExternalOAuthIntegration } from '../../database/entities/ExternalOAuthIntegration'

const DEFAULT_CLAIM = 'flowise_permissions'

/**
 * Collect OAuth scopes from typical Okta / OIDC access token claims.
 */
export function extractScopes(payload: Record<string, unknown>): string[] {
    const out = new Set<string>()
    const scp = payload['scp']
    if (Array.isArray(scp)) {
        scp.forEach((s) => typeof s === 'string' && out.add(s))
    } else if (typeof scp === 'string') {
        scp.split(' ').forEach((s) => s && out.add(s))
    }
    const scope = payload['scope']
    if (typeof scope === 'string') {
        scope.split(' ').forEach((s) => s && out.add(s))
    }
    return [...out]
}

/**
 * Map IdP scopes + optional JSON-array claim to Flowise permission strings.
 */
export function mapTokenToFlowisePermissions(payload: Record<string, unknown>, integration: ExternalOAuthIntegration): string[] {
    const granted = new Set<string>()
    const scopeMap = integration.permissionScopeMap || {}

    for (const scope of extractScopes(payload)) {
        const perms = scopeMap[scope]
        if (Array.isArray(perms)) {
            perms.forEach((p) => typeof p === 'string' && granted.add(p))
        }
    }

    const claimName = integration.customPermissionsClaimName || DEFAULT_CLAIM
    const rawClaim = payload[claimName]
    if (Array.isArray(rawClaim)) {
        rawClaim.forEach((p) => typeof p === 'string' && granted.add(p))
    } else if (typeof rawClaim === 'string') {
        try {
            const parsed = JSON.parse(rawClaim) as unknown
            if (Array.isArray(parsed)) {
                parsed.forEach((p) => typeof p === 'string' && granted.add(p))
            }
        } catch {
            rawClaim.split(/[,\s]+/).forEach((p) => p && granted.add(p))
        }
    }

    return [...granted]
}
