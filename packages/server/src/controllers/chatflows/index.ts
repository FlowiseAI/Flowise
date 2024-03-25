import { Request, Response, NextFunction } from 'express'
import chatflowsService from '../../services/chatflows'

const getAllChatflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await chatflowsService.getAllChatflows()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getChatflowById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: chatflowsRouter.getChatflowById - id not provided!`)
        }
        const apiResponse = await chatflowsService.getChatflowById(req.params.id)
        if (typeof apiResponse.executionError !== 'undefined') {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllChatflows,
    getChatflowById
}
