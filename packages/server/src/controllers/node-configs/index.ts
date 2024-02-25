import { Request, Response, NextFunction } from 'express'
import nodeConfigsService from '../../services/node-configs'

const getAllNodeConfigs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await nodeConfigsService.getAllNodeConfigs(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllNodeConfigs
}
