import { Request, Response, NextFunction } from 'express'
import loadPromptsService from '../../services/load-prompts'

const createPrompt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || typeof req.body.promptName === 'undefined' || req.body.promptName === '') {
            throw new Error(`Error: loadPromptsController.createPrompt - promptName not provided!`)
        }
        const apiResponse = await loadPromptsService.createPrompt(req.body.promptName as string)
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createPrompt
}
