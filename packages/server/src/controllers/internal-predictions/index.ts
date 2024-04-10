import { Request, Response, NextFunction } from 'express'
import { utilBuildChatflow } from '../../utils/buildChatflow'

// Send input message and get prediction result (Internal)
const createInternalPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await utilBuildChatflow(req, req.io, true)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createInternalPrediction
}
