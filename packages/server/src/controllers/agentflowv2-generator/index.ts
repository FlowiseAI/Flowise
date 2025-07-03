import { Request, Response, NextFunction } from 'express'
import agentflowv2Service from '../../services/agentflowv2-generator'

const generateAgentflowv2 = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.question || !req.body.selectedChatModel) {
            throw new Error('Question and selectedChatModel are required')
        }
        const apiResponse = await agentflowv2Service.generateAgentflowv2(req.body.question, req.body.selectedChatModel)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    generateAgentflowv2
}
