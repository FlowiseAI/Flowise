import { Request, Response, NextFunction } from 'express'
import leadsService from '../../services/leads'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

const getAllLeadsForChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: leadsController.getAllLeadsForChatflow - id not provided!`
            )
        }
        const chatflowid = req.params.id
        const apiResponse = await leadsService.getAllLeads(chatflowid)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createLeadInChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: leadsController.createLeadInChatflow - body not provided!`
            )
        }
        const apiResponse = await leadsService.createLead(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createLeadInChatflow,
    getAllLeadsForChatflow
}
