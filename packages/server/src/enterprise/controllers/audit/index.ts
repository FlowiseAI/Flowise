import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import auditService from '../../services/audit'

const fetchLoginActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: auditService.fetchLoginHistory - body not provided!`)
        }
        const apiResponse = await auditService.fetchLoginActivity(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    fetchLoginActivity
}
