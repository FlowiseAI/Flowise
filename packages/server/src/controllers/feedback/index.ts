import { Request, Response, NextFunction } from 'express'
import feedbackService from '../../services/feedback'
import { validateFeedbackForCreation, validateFeedbackForUpdate } from '../../services/feedback/validation'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const getAllChatMessageFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: feedbackController.getAllChatMessageFeedback - id not provided!`
            )
        }
        const chatflowid = req.params.id
        const chatId = req.query?.chatId as string | undefined
        const sortOrder = req.query?.order as string | undefined
        const startDate = req.query?.startDate as string | undefined
        const endDate = req.query?.endDate as string | undefined
        const apiResponse = await feedbackService.getAllChatMessageFeedback(chatflowid, chatId, sortOrder, startDate, endDate)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createChatMessageFeedbackForChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: feedbackController.createChatMessageFeedbackForChatflow - body not provided!`
            )
        }
        await validateFeedbackForCreation(req.body)
        const apiResponse = await feedbackService.createChatMessageFeedbackForChatflow(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateChatMessageFeedbackForChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: feedbackController.updateChatMessageFeedbackForChatflow - body not provided!`
            )
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: feedbackController.updateChatMessageFeedbackForChatflow - id not provided!`
            )
        }
        await validateFeedbackForUpdate(req.params.id, req.body)
        const apiResponse = await feedbackService.updateChatMessageFeedbackForChatflow(req.params.id, req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllChatMessageFeedback,
    createChatMessageFeedbackForChatflow,
    updateChatMessageFeedbackForChatflow
}
