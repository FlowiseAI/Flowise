import { Request, Response, NextFunction } from 'express'
import logService from '../../services/log'

// Get logs
const getLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await logService.getLogs(req.query?.startDate as string, req.query?.endDate as string)
        res.send(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getLogs
}
