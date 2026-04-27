/**
 * Detect a compact JWS (JWT) shape without verifying — used to route Bearer tokens
 * to external IdP validation vs Flowise API key lookup.
 */
export function isLikelyJwtCompact(bearerSecret: string): boolean {
    const parts = bearerSecret.split('.')
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return false
    try {
        const headerJson = Buffer.from(parts[0], 'base64url').toString('utf8')
        const header = JSON.parse(headerJson) as { alg?: string; typ?: string }
        return typeof header.alg === 'string'
    } catch {
        return false
    }
}
