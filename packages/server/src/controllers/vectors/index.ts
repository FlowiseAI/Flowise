import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import vectorsService from '../../services/vectors'
import { getRateLimiter } from '../../utils/rateLimit'

const upload = multer({ dest: `${path.join(__dirname, '..', '..', '..', 'uploads')}/` })

const uploadFilesMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        upload.array('files')
        return next()
    } catch (error) {
        next(error)
    }
}

const getRateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return getRateLimiter(req, res, next)
    } catch (error) {
        next(error)
    }
}

const upsertVectorMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return await vectorsService.upsertVectorMiddleware(req, res)
    } catch (error) {
        next(error)
    }
}

const createInternalUpsert = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return await vectorsService.upsertVectorMiddleware(req, res, true)
    } catch (error) {
        next(error)
    }
}

export default {
    upsertVectorMiddleware,
    createInternalUpsert,
    uploadFilesMiddleware,
    getRateLimiterMiddleware
}
