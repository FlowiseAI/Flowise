import { Request, Response, NextFunction } from 'express'
import flowConfigsService from '../../services/flow-configs'

const getSingleFlowConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: flowConfigsController.getSingleFlowConfig - id not provided!`)
        }
        const apiResponse = await flowConfigsService.getSingleFlowConfig(req.params.id)
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getSingleFlowConfig
}
