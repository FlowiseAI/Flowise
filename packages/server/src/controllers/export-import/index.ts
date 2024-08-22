import { NextFunction, Request, Response } from 'express'
import chatMessagesService from '../../services/export-import'

const exportAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await chatMessagesService.exportAll()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    exportAll
}
