import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies that `providedHex` is the HMAC of `rawBody` keyed with `secret`.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * Automatically detects the algorithm from a leading "<algo>=" prefix:
 *   - "sha256=<hex>" → HMAC-SHA256 (GitHub X-Hub-Signature-256, Slack, Bitbucket)
 *   - "sha1=<hex>"   → HMAC-SHA1   (GitHub X-Hub-Signature legacy)
 *   - no prefix      → HMAC-SHA256 (default)
 *
 * @param secret      The webhook secret stored on the chatflow
 * @param rawBody     The raw request body bytes
 * @param providedHex The hex digest (optionally prefixed) from the signature request header
 * @returns true if the signature is valid, false otherwise
 */
export function verifyWebhookSignature(secret: string, rawBody: Buffer, providedHex: string): boolean {
    let algo = 'sha256'
    let hex = providedHex
    if (providedHex.includes('=')) {
        const [prefix, ...rest] = providedHex.split('=')
        hex = rest.join('=')
        if (prefix === 'sha1') algo = 'sha1'
    }
    const expected = createHmac(algo, secret).update(new Uint8Array(rawBody)).digest()
    let provided: Buffer
    try {
        provided = Buffer.from(hex, 'hex')
    } catch {
        return false
    }
    if (provided.length !== expected.length) return false
    return timingSafeEqual(new Uint8Array(provided), new Uint8Array(expected))
}

/**
 * Verifies a plain-token signature by doing a constant-time string comparison
 * between the stored secret and the value provided in the request header.
 * Used for GitLab-style webhooks that send the raw secret directly in a header.
 *
 * @param secret   The webhook secret stored on the chatflow
 * @param provided The raw value from the signature request header
 * @returns true if the values match, false otherwise
 */
export function verifyPlainToken(secret: string, provided: string): boolean {
    const secretBuf = Buffer.from(secret)
    const providedBuf = Buffer.from(provided)
    if (secretBuf.length !== providedBuf.length) return false
    return timingSafeEqual(new Uint8Array(secretBuf), new Uint8Array(providedBuf))
}
