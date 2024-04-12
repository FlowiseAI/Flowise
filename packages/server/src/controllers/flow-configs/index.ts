import { Request, Response, NextFunction } from 'express'
import flowConfigsService from '../../services/flow-configs'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const getSingleFlowConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: flowConfigsController.getSingleFlowConfig - id not provided!`
            )
        }
        const apiResponse = await flowConfigsService.getSingleFlowConfig(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getSingleFlowConfig
}
