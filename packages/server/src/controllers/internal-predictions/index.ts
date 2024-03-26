import { Request, Response, NextFunction } from 'express'
import { buildChatflow } from '../../utils/buildChatflow'

// Send input message and get prediction result (Internal)
const createInternalPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //@ts-ignore
        await buildChatflow(req, res, socketIO, true)
    } catch (error) {
        next(error)
    }
}

export default {
    createInternalPrediction
}
