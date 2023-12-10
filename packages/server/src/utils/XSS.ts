import { Request, Response, NextFunction } from 'express'
import sanitizeHtml from 'sanitize-html'

export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction): void {
    // decoding is necessary as the url is encoded by the browser
    const decodedURI = decodeURI(req.url)
    req.url = sanitizeHtml(decodedURI)
    for (let p in req.query) {
        req.query[p] = sanitizeHtml(req.query[p] as string)
    }

    next()
}
