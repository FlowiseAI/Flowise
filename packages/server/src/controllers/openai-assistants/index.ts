import { Request, Response, NextFunction } from 'express'
import path from 'path'
import * as fs from 'fs'
import openaiAssistantsService from '../../services/openai-assistants'
import { getUserHome } from '../../utils'

// List available assistants
const getAllOpenaiAssistants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.query.credential === 'undefined' || req.query.credential === '') {
            throw new Error(`Error: openaiAssistantsController.getAllOpenaiAssistants - credential not provided!`)
        }
        const apiResponse = await openaiAssistantsService.getAllOpenaiAssistants(req.query.credential as string)
        //@ts-ignore
        if (typeof apiResponse.executionError !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get assistant object
const getSingleOpenaiAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: openaiAssistantsController.getSingleOpenaiAssistant - id not provided!`)
        }
        if (typeof req.query.credential === 'undefined' || req.query.credential === '') {
            throw new Error(`Error: openaiAssistantsController.getSingleOpenaiAssistant - credential not provided!`)
        }
        const apiResponse = await openaiAssistantsService.getSingleOpenaiAssistant(req.query.credential as string)
        //@ts-ignore
        if (typeof apiResponse.executionError !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Download file from assistant
const getFileFromAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filePath = path.join(getUserHome(), '.flowise', 'openai-assistant', req.body.fileName)
        //raise error if file path is not absolute
        if (!path.isAbsolute(filePath)) return res.status(500).send(`Invalid file path`)
        //raise error if file path contains '..'
        if (filePath.includes('..')) return res.status(500).send(`Invalid file path`)
        //only return from the .flowise openai-assistant folder
        if (!(filePath.includes('.flowise') && filePath.includes('openai-assistant'))) return res.status(500).send(`Invalid file path`)
        res.setHeader('Content-Disposition', 'attachment; filename=' + path.basename(filePath))
        const fileStream = fs.createReadStream(filePath)
        fileStream.pipe(res)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllOpenaiAssistants,
    getSingleOpenaiAssistant,
    getFileFromAssistant
}
