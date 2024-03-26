import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { getRateLimiter } from '../../utils/rateLimit'
import { buildChatflow } from '../../utils/buildChatflow'
// import { Server } from 'socket.io'

const upload = multer({ dest: `${path.join(__dirname, '..', '..', '..', 'uploads')}/` })

// Send input message and get prediction result (External)
const createPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await buildChatflow(req, res, socketIO)
    } catch (error) {
        next(error)
    }
}

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

export default {
    createPrediction,
    uploadFilesMiddleware,
    getRateLimiterMiddleware
}
