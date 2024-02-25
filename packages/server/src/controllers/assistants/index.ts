import { Request, Response, NextFunction } from 'express'
import assistantsService from '../../services/assistants'
import telemetryService from '../../services/telemetry'
import { getAppVersion } from '../../utils'

// Create assistant
const createAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || typeof req.body.details === 'undefined' || !req.body.details) {
            throw new Error('Error: assistantsController.createAssistant - body not provided!')
        }
        const apiResponse = await assistantsService.createAssistant(req.body)
        //@ts-ignore
        if (typeof apiResponse.executionError !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        await telemetryService.createEvent({
            name: `assistant_created`,
            data: {
                version: await getAppVersion(),
                //@ts-ignore
                assistantId: apiResponse.id
            }
        })
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Delete assistant
const deleteAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined') {
            throw new Error(`Error: assistantsController.deleteAssistant - id not provided!`)
        }
        const apiResponse = await assistantsService.deleteAssistant(req.params.id, req.query.isDeleteBoth)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get all assistants
const getAllAssistants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await assistantsService.getAllAssistants()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get specific assistant
const getSingleAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            res.status(404).send(`Error: assistantsController.getSingleAssistant - id not provided!`)
        }
        const apiResponse = await assistantsService.getSingleAssistant(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Update assistant
const updateAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: assistantsController.updateAssistant - id not provided!')
        }
        if (typeof req.body === 'undefined' || typeof req.body.details === 'undefined' || !req.body.details) {
            throw new Error('Error: assistantsController.updateAssistant - body not provided!')
        }
        const apiResponse = await assistantsService.updateAssistant(req.params.id, req.body)
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

export default {
    createAssistant,
    deleteAssistant,
    getAllAssistants,
    getSingleAssistant,
    updateAssistant
}
