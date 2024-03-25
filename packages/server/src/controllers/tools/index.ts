import { Request, Response, NextFunction } from 'express'
import toolsService from '../../services/tools'

// Get api keys
const getAllTools = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await toolsService.getAllTools()
        if (typeof apiResponse.executionError !== 'undefined') {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllTools
}
