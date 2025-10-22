import { Request, Response, NextFunction } from 'express'
import sanitizeHtml from 'sanitize-html'
import { isPredictionRequest, extractChatflowId, validateChatflowDomain } from './domainValidation'

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
    // Expects FQDN separated by commas, otherwise nothing or * for all.
    // return process.env.CORS_ORIGINS ?? '*'
    return process.env.CORS_ORIGINS as string
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
                const allowedOriginsString = getAllowedCorsOrigins()
                const allowedOrigins = parseAllowedOrigins(allowedOriginsString)
                const isPredictionReq = isPredictionRequest(req.url)

                // First check global CORS origins
                if (!origin || allowedOrigins.includes('*')) {
                    // Additional prediction-specific validation
                    await checkRequestType(isPredictionReq, req, origin, originCallback)
                } else if (origin && allowedOrigins.includes(origin)) {
                    await checkRequestType(isPredictionReq, req, origin, originCallback)
                } else {
                    originCallback(null, false)
                }
            }
        }
        callback(null, corsOptions)
    }
}

async function checkRequestType(
    isPredictionReq: boolean,
    req: any,
    origin: string | undefined,
    originCallback: (err: Error | null, allow?: boolean) => void
) {
    if (isPredictionReq) {
        const chatflowId = extractChatflowId(req.url)
        if (chatflowId && origin) {
            const isAllowed = await validateChatflowDomain(chatflowId, origin, req.user?.activeWorkspaceId)

            originCallback(null, isAllowed)
        } else {
            originCallback(null, true)
        }
    } else {
        originCallback(null, true)
    }
}

export function getAllowedIframeOrigins(): string {
    // Expects FQDN separated by commas, otherwise nothing or * for all.
    // Also CSP allowed values: self or none
    return process.env.IFRAME_ORIGINS ?? '*'
}
