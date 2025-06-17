import { NextFunction, Request, Response } from 'express'
import { ALLOWED_ORIGINS } from '../config'
import logger from '../utils/logger'

export default function prodCors(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin as string | undefined
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    if (req.method === 'OPTIONS') {
        res.setHeader('Content-Type', 'application/json')
        logger.http(`CORS preflight for ${req.path}`)
        return res.status(204).end()
    }

    next()
}
