import { Request, Response, NextFunction } from 'express'
import sanitizeHtml from 'sanitize-html'
import { extractChatflowId, validateChatflowDomain, isPublicChatflowRequest } from './domainValidation'

export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction): void {
    // decoding is necessary as the url is encoded by the browser
    const decodedURI = decodeURI(req.url)
    req.url = sanitizeHtml(decodedURI)
    for (const p in req.query) {
        const val = req.query[p]
        if (Array.isArray(val)) {
            const sanitizedQ: string[] = []
            for (const q of val) {
                sanitizedQ.push(sanitizeHtml(String(q)))
            }
            req.query[p] = sanitizedQ
        } else if (typeof val === 'string') {
            req.query[p] = sanitizeHtml(val)
        }
    }
    next()
}

export function getAllowedCorsOrigins(): string {
    // Expects FQDN separated by commas, otherwise nothing.
    return process.env.CORS_ORIGINS ?? ''
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

export function getCorsOptions(): any {
    return (req: any, callback: (err: Error | null, options?: any) => void) => {
        const corsOptions = {
            origin: async (origin: string | undefined, originCallback: (err: Error | null, allow?: boolean) => void) => {
                const allowedOrigins = getAllowedCorsOrigins()
                const isPublicChatflowReq = isPublicChatflowRequest(req.url)
                const allowedList = parseAllowedOrigins(allowedOrigins)
                const originLc = origin?.toLowerCase()

                // Always allow no-Origin requests (same-origin, server-to-server)
                if (!originLc) return originCallback(null, true)

                // Global allow: '*' or exact match
                const globallyAllowed = allowedOrigins === '*' || allowedList.includes(originLc)

                if (isPublicChatflowReq) {
                    // Per-chatflow allowlist OR globally allowed
                    const chatflowId = extractChatflowId(req.url)
                    let chatflowAllowed = false
                    if (chatflowId) {
                        try {
                            chatflowAllowed = await validateChatflowDomain(chatflowId, originLc, req.user?.activeWorkspaceId)
                        } catch (error) {
                            // Log error and deny on failure
                            console.error('Domain validation error:', error)
                            chatflowAllowed = false
                        }
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

export function getAllowedIframeOrigins(): string {
    // Expects FQDN separated by commas, otherwise nothing or * for all.
    // Also CSP allowed values: self or none
    return process.env.IFRAME_ORIGINS ?? '*'
}
