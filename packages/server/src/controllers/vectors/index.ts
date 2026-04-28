import { Request, Response, NextFunction } from 'express'
import vectorsService from '../../services/vectors'
import { RateLimiterManager } from '../../utils/rateLimit'

const getRateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return RateLimiterManager.getInstance().getRateLimiter()(req, res, next)
    } catch (error) {
        next(error)
    }
}

const upsertVectorMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await vectorsService.upsertVectorMiddleware(req)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createInternalUpsert = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isInternal = true
        const apiResponse = await vectorsService.upsertVectorMiddleware(req, isInternal)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    upsertVectorMiddleware,
    createInternalUpsert,
    getRateLimiterMiddleware
}
