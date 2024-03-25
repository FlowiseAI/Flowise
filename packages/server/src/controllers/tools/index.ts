import { Request, Response, NextFunction } from 'express'
import toolsService from '../../services/tools'

const getAllTools = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await toolsService.getAllTools()
        if (typeof apiResponse.executionError !== 'undefined') {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getToolById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: toolsController.getToolById - id not provided!`)
        }
        const apiResponse = await toolsService.getToolById(req.params.id)
        if (typeof apiResponse.executionError !== 'undefined') {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllTools,
    getToolById
}
