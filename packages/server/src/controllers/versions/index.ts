import { Request, Response, NextFunction } from 'express'
import versionsService from '../../services/versions'

const getVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await versionsService.getVersion()
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getVersion
}
