import { Request, Response, NextFunction } from 'express'
import assistantsService from '../../services/assistants'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const creatAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: assistantsController.creatAssistant - body not provided!`
            )
        }
        const apiResponse = await assistantsService.creatAssistant(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: assistantsController.deleteAssistant - id not provided!`
            )
        }
        const apiResponse = await assistantsService.deleteAssistant(req.params.id, req.query.isDeleteBoth)

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllAssistants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await assistantsService.getAllAssistants()

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAssistantById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: assistantsController.getAssistantById - id not provided!`
            )
        }
        const apiResponse = await assistantsService.getAssistantById(req.params.id)

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: assistantsController.updateAssistant - id not provided!`
            )
        }
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: assistantsController.updateAssistant - body not provided!`
            )
        }
        const apiResponse = await assistantsService.updateAssistant(req.params.id, req.body)

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
