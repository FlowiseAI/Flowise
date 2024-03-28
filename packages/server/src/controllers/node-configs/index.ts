import { Request, Response, NextFunction } from 'express'
import nodeConfigsService from '../../services/node-configs'

const getAllNodeConfigs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error(`Error: nodeConfigsController.getAllNodeConfigs - body not provided!`)
        }
        const apiResponse = await nodeConfigsService.getAllNodeConfigs(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllNodeConfigs
}
