import { Request, Response, NextFunction } from 'express'
import promptsListsService from '../../services/prompts-lists'

// Prompt from Hub
const createPromptsList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await promptsListsService.createPromptsList(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createPromptsList
}
