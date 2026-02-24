import logger from '../../utils/logger'

/**
 * Ensures the APP_URL uses HTTPS protocol for security-sensitive operations.
 * Allows HTTP only for localhost/127.0.0.1 (development environments).
 *
 * @param path - Optional path to append to the base URL
 * @returns Secure URL (HTTPS) or development URL (HTTP localhost)
 */
export function getSecureAppUrl(path?: string): string {
    const appUrl = process.env.APP_URL || ''

    if (!appUrl) {
        throw new Error('APP_URL environment variable is not configured')
    }

    // Validate that APP_URL is a well-formed URL (e.g. catches bare "example.com" without a protocol)
    let urlObj: URL
    try {
        urlObj = new URL(appUrl)
    } catch {
        throw new Error(`APP_URL environment variable is not a valid URL: "${appUrl}"`)
    }

    const isLocalhost =
        urlObj.hostname === 'localhost' ||
        urlObj.hostname === '127.0.0.1' ||
        urlObj.hostname === '[::1]' ||
        urlObj.hostname === '0.0.0.0'

    // If URL is HTTP and NOT localhost, convert to HTTPS for security.
    // Keep HTTP for localhost/development URLs to avoid issues with self-signed certs.
    if (urlObj.protocol === 'http:' && !isLocalhost) {
        urlObj.protocol = 'https:'
        const newUrlString = urlObj.toString().replace(/\/$/, '')
        logger.warn(
            `APP_URL uses insecure HTTP protocol for non-localhost URL. ` +
                `Automatically converting to HTTPS for security. ` +
                `Please update APP_URL to use HTTPS: ${newUrlString}`
        )
    }

    // Always strip trailing slash for consistency, whether or not a path is appended
    const secureUrl = urlObj.toString().replace(/\/$/, '')

    // Append path if provided
    if (path) {
        const cleanPath = path.startsWith('/') ? path : `/${path}`
        return `${secureUrl}${cleanPath}`
    }

    return secureUrl
}

/**
 * Constructs a secure link with a token parameter.
 * Always uses HTTPS for non-localhost URLs.
 *
 * @param path - URL path (e.g., '/reset-password', '/verify')
 * @param token - Security token to include in URL
 * @returns Secure URL with token parameter
 */
export function getSecureTokenLink(path: string, token: string): string {
    const baseUrl = getSecureAppUrl(path)
    return `${baseUrl}?token=${token}`
}
