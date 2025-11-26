import { Request, Response, NextFunction } from 'express'
import validationService from '../../services/validation'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const checkFlowValidation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const flowId = req.params?.id as string | undefined
        if (!flowId) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: validationController.checkFlowValidation - id not provided!`
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        const apiResponse = await validationService.checkFlowValidation(flowId, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    checkFlowValidation
}
