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

export default {
    getAllChatflows
}
