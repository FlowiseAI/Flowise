import { Request, Response, NextFunction } from 'express'
import nodeConfigsService from '../../services/node-configs'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const getAllNodeConfigs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: nodeConfigsController.getAllNodeConfigs - body not provided!`
            )
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
