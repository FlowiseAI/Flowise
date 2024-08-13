import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import plansService from '../../services/plans'
import { TrialPlan } from '../../database/entities/TrialPlan'

const getCurrentPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not found')
        }
        if (!req.user.organizationId) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Organization not found')
        }

        const apiResponse: any = await plansService.getCurrentPlan(req.user.id, req.user.organizationId)
        if (apiResponse) {
            apiResponse.type = apiResponse instanceof TrialPlan ? 'Free Trial' : 'Paid'
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getPlanHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not found')
        }
        if (!req.user.organizationId) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Organization not found')
        }

        const apiResponse = await plansService.getPlanHistory(req.user)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getCurrentPlan,
    getPlanHistory
}
