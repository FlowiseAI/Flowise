import { Request, Response, NextFunction } from 'express'
import chatsService from '../../services/chats'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const getAllChats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: chatsController.getAllChats - Unauthorized')
        }
        const apiResponse = await chatsService.getAllChats(req.user)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllChats
}
