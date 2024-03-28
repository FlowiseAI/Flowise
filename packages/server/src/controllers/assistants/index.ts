import { Request, Response, NextFunction } from 'express'
import assistantsService from '../../services/assistants'

const creatAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error(`Error: assistantsController.creatAssistant - body not provided!`)
        }
        const apiResponse = await assistantsService.creatAssistant(req.body)
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: assistantsController.deleteAssistant - id not provided!`)
        }
        const apiResponse = await assistantsService.deleteAssistant(req.params.id, req.query.isDeleteBoth)
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllAssistants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await assistantsService.getAllAssistants()
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAssistantById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: assistantsController.getAssistantById - id not provided!`)
        }
        const apiResponse = await assistantsService.getAssistantById(req.params.id)
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: assistantsController.updateAssistant - id not provided!`)
        }
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error(`Error: assistantsController.updateAssistant - body not provided!`)
        }
        const apiResponse = await assistantsService.updateAssistant(req.params.id, req.body)
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    creatAssistant,
    deleteAssistant,
    getAllAssistants,
    getAssistantById,
    updateAssistant
}
