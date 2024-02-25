import { Request, Response, NextFunction } from 'express'
import toolsService from '../../services/tools'

// Create tool
const createTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error(`Error: toolsController.createTool - body not provided!`)
        }
        const apiResponse = await toolsService.createTool(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Delete tool
const deleteTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error(`Error: toolsController.deleteTool - id not provided!`)
        }
        const apiResponse = await toolsService.deleteTool(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get all tools
const getAllTools = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await toolsService.getAllTools()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get specific tool
const getSingleTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            res.status(404).send(`Error: toolsController.getSingleTool - id not provided!`)
        }
        const apiResponse = await toolsService.getSingleTool(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Update tool
const updateTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            res.status(404).send(`Error: toolsController.updateTool - id not provided!`)
        }
        if (typeof req.body === 'undefined' || req.body === '') {
            res.status(404).send(`Error: toolsController.updateTool - body not provided!`)
        }
        const apiResponse = await toolsService.updateTool(req.params.id, req.body)
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
    createTool,
    deleteTool,
    getAllTools,
    getSingleTool,
    updateTool
}
