import { Request, Response, NextFunction } from 'express'
import attachmentsService from '../../services/attachments'

const createAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await attachmentsService.createAttachment(req)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createAttachment
}
