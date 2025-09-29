import { Request, Response, NextFunction } from 'express'
import sanitizeHtml from 'sanitize-html'
import logger from './logger'
import { DomainValidationService } from '../services/domainValidation'

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
    return process.env.CORS_ORIGINS ?? '*'
}

export function getCorsOptions(): any {
    return function (req: any, callback: (err: Error | null, options?: any) => void) {
        const corsOptions = {
            origin: async function (origin: string | undefined, originCallback: (err: Error | null, allow?: boolean) => void) {
                const allowedOrigins = getAllowedCorsOrigins()
                const isPredictionRequest = DomainValidationService.isPredictionRequest(req.url)
                
                logger.info('allowedOrigins: ' + allowedOrigins)
                logger.info('origin: ' + origin)
                logger.info('req.url: ' + req.url)
                logger.info('req.method: ' + req.method)
                logger.info('isPredictionRequest: ' + isPredictionRequest)
                logger.info('req.headers: ' + JSON.stringify(req.headers))
                logger.info('req.query: ' + JSON.stringify(req.query))
                logger.info('req.body: ' + JSON.stringify(req.body))
                
                // First check global CORS origins
                if (!origin || allowedOrigins == '*' || allowedOrigins.indexOf(origin) !== -1) {
                    
                    // Additional prediction-specific validation
                    if (isPredictionRequest) {
                        const chatflowId = DomainValidationService.extractChatflowId(req.url)
                        if (chatflowId && origin) {
                            const isAllowed = await DomainValidationService.validateChatflowDomain(
                                chatflowId, 
                                origin, 
                                req.user?.activeWorkspaceId
                            )
                            logger.info(`Prediction domain validation result: ${isAllowed}`)
                            originCallback(null, isAllowed)
                        } else {
                            logger.info('No chatflow ID found in prediction URL or no origin header, allowing request')
                            originCallback(null, true)
                        }
                    } else {
                        originCallback(null, true)
                    }
                } else {
                    logger.info('Global CORS validation failed')
                    originCallback(null, false)
                }
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
