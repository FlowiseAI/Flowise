import { Request, Response, NextFunction } from 'express'
import toolsService from '../../services/tools'

const creatTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error(`Error: toolsController.creatTool - body not provided!`)
        }
        const apiResponse = await toolsService.creatTool(req.body)
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: toolsController.deleteTool - id not provided!`)
        }
        const apiResponse = await toolsService.deleteTool(req.params.id)
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllTools = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await toolsService.getAllTools()
        if (apiResponse.executionError) {
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
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: toolsController.updateTool - id not provided!`)
        }
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error(`Error: toolsController.deleteTool - body not provided!`)
        }
        const apiResponse = await toolsService.updateTool(req.params.id, req.body)
        if (apiResponse.executionError) {
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    creatTool,
    deleteTool,
    getAllTools,
    getToolById,
    updateTool
}
