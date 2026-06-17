import { NextFunction, Request, Response } from 'express'
import sanitizeHtml from 'sanitize-html'
import { extractChatflowId, isPublicChatflowRequest, isTTSGenerateRequest, validateChatflowDomain } from './domainValidation'
import logger from './logger'

export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction): void {
    // decoding is necessary as the url is encoded by the browser
    const decodedURI = decodeURI(req.url)
    req.url = sanitizeHtml(decodedURI)
    for (let p in req.query) {
        if (Array.isArray(req.query[p])) {
            const sanitizedQ = []
            for (const q of req.query[p] as string[]) {
                sanitizedQ.push(sanitizeHtml(q))
            }
            req.query[p] = sanitizedQ
        } else {
            req.query[p] = sanitizeHtml(req.query[p] as string)
        }
    }
    next()
}

export function getAllowedCorsOrigins(): string {
    // Expects FQDN separated by commas, otherwise nothing.
    return process.env.CORS_ORIGINS ?? ''
}

export function getAllowCredentials(): boolean {
    return process.env.CORS_ALLOW_CREDENTIALS === 'true'
}

export function getAllowedAuthCorsOrigins(): string[] {
    const appUrl = process.env.APP_URL?.trim()
    if (!appUrl) return []
    try {
        return [new URL(appUrl).origin.toLowerCase()]
    } catch {
        return []
    }
}

// Endpoints that issue or refresh session tokens — must not accept wildcard origins
const SESSION_ENDPOINTS = [
    '/api/v1/auth/login',
    '/api/v1/auth/refreshtoken',
    '/api/v1/account/register',
    '/api/v1/azure/callback',
    '/api/v1/google/callback',
    '/api/v1/auth0/callback',
    '/api/v1/github/callback'
]

function isSessionEndpoint(url: string): boolean {
    const path = url.split('?')[0].toLowerCase()
    return SESSION_ENDPOINTS.some((ep) => path === ep || path.startsWith(ep + '/'))
}

function parseAllowedOrigins(allowedOrigins: string): string[] {
    if (!allowedOrigins) {
        return []
    }
    if (allowedOrigins === '*') {
        return ['*']
    }
    return allowedOrigins
        .split(',')
        .map((origin) => origin.trim().toLowerCase())
        .filter((origin) => origin.length > 0)
}

export function validateCorsConfig(): void {
    if (getAllowedCorsOrigins() === '*' && getAllowCredentials()) {
        logger.warn(
            '[CORS] Unsafe configuration detected: CORS_ORIGINS=* cannot be combined with ' +
                'CORS_ALLOW_CREDENTIALS=true. Access-Control-Allow-Credentials has been forced to false. ' +
                'To allow credentialed cross-origin requests, set CORS_ORIGINS to an explicit comma-separated ' +
                'list of trusted origins instead of *.'
        )
    }
}

export function getCorsOptions(): any {
    return (req: any, callback: (err: Error | null, options?: any) => void) => {
        const allowedOrigins = getAllowedCorsOrigins()
        const requestedCredentials = getAllowCredentials()
        const credentials = allowedOrigins === '*' ? false : requestedCredentials

        const corsOptions = {
            credentials,
            origin: async (origin: string | undefined, originCallback: (err: Error | null, allow?: boolean) => void) => {
                const isPublicChatflowReq = isPublicChatflowRequest(req.url)
                const isTTSReq = isTTSGenerateRequest(req.url)
                const allowedList = parseAllowedOrigins(allowedOrigins)
                const originLc = origin?.toLowerCase()

                // Always allow no-Origin requests (same-origin, server-to-server)
                if (!originLc) return originCallback(null, true)

                // Block null origins (sandboxed iframes, data: URIs, file:// pages)
                if (originLc === 'null') return originCallback(null, false)

                // Session-issuing endpoints: ignore global wildcard, use APP_URL origin or explicit CORS_ORIGINS list
                if (isSessionEndpoint(req.url)) {
                    const authList = getAllowedAuthCorsOrigins()
                    return originCallback(null, authList.includes(originLc) || allowedList.includes(originLc))
                }

                // Global allow: '*' or exact match
                const globallyAllowed = allowedOrigins === '*' || allowedList.includes(originLc)

                if (isPublicChatflowReq || isTTSReq) {
                    // Per-chatflow allowlist OR globally allowed
                    // TTS generate passes chatflowId in the request body, not the URL path
                    const chatflowId = isTTSReq ? req.body?.chatflowId : extractChatflowId(req.url)
                    let chatflowAllowed = false
                    if (chatflowId) {
                        try {
                            chatflowAllowed = await validateChatflowDomain(chatflowId, originLc, req.user?.activeWorkspaceId)
                        } catch (error) {
                            // Log error and deny on failure
                            console.error('Domain validation error:', error)
                            chatflowAllowed = false
                        }
                    } else if (isTTSReq) {
                        // OPTIONS preflight has no body — allow it through so the actual POST can be validated with chatflowId
                        chatflowAllowed = true
                    }
                    return originCallback(null, globallyAllowed || chatflowAllowed)
                }

                // Non-prediction: rely on global policy only
                return originCallback(null, globallyAllowed)
            }
        }
        callback(null, corsOptions)
    }
}

/**
 * Retrieves and normalizes allowed iframe embedding origins for CSP frame-ancestors directive.
 *
 * Reads `IFRAME_ORIGINS` environment variable (comma-separated FQDNs) and converts it to
 * space-separated format required by Content Security Policy specification.
 *
 * Input format:
 * - Comma-separated: `https://domain1.com,https://domain2.com`
 * - Special values: `'self'`, `'none'`, or `*`
 * - Default: `'self'` (same-origin only)
 *
 * Output examples:
 * - `https://app.com,https://admin.com` → `https://app.com https://admin.com`
 * - `'self'` → `'self'`
 * - `*` → `*`
 *
 * @returns Space-separated string for CSP frame-ancestors directive
 */
export function getAllowedIframeOrigins(): string {
    // Expects FQDN separated by commas, otherwise nothing or * for all.
    // Also CSP allowed values: self or none
    const origins = (process.env.IFRAME_ORIGINS?.trim() || undefined) ?? "'self'"
    // Convert CSV to space-separated for CSP frame-ancestors directive
    return origins
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ')
}

export function getIframeSecurityHeaders(): Record<string, string> {
    const allowedOrigins = getAllowedIframeOrigins()

    if (allowedOrigins === '*') {
        return {
            'Content-Security-Policy': 'frame-ancestors *'
        }
    }

    if (allowedOrigins === "'self'") {
        return {
            'Content-Security-Policy': `frame-ancestors ${allowedOrigins}`,
            'X-Frame-Options': 'SAMEORIGIN'
        }
    }

    if (allowedOrigins === "'none'") {
        return {
            'Content-Security-Policy': `frame-ancestors ${allowedOrigins}`,
            'X-Frame-Options': 'DENY'
        }
    }

    return {
        'Content-Security-Policy': `frame-ancestors ${allowedOrigins}`
    }
}
