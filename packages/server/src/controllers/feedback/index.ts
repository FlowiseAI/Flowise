import { Request, Response, NextFunction } from 'express'
import feedbackService from '../../services/feedback'

const getAllChatMessageFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: feedbackController.getAllChatMessageFeedback - id not provided!`)
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
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error(`Error: feedbackController.createChatMessageFeedbackForChatflow - body not provided!`)
        }
        const apiResponse = await feedbackService.createChatMessageFeedbackForChatflow(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateChatMessageFeedbackForChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error(`Error: feedbackController.updateChatMessageFeedbackForChatflow - body not provided!`)
        }
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: feedbackController.updateChatMessageFeedbackForChatflow - id not provided!`)
        }
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
