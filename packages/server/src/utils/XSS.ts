import { Request, Response, NextFunction } from 'express'
let stripJs = require('strip-js')

export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction): void {
    req.url = stripJs(req.url)
    for (let p in req.query) {
        req.query[p] = stripJs(req.query[p])
    }

    next()
}
