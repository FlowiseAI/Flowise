import { Request, Response, NextFunction } from 'express'
import toolsService from '../../services/tools'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const createTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Body is required')
        const tool = await toolsService.createTool(req.body, req.user!)
        return res.json(tool)
    } catch (error) {
        next(error)
    }
}

const deleteTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Tool ID is required')
        const tool = await toolsService.deleteTool(req.params.id, req.user!)
        return res.json(tool)
    } catch (error) {
        next(error)
    }
}

const getAllTools = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tools = await toolsService.getAllTools(req.user!)
        return res.json(tools)
    } catch (error) {
        next(error)
    }
}

const getToolById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Tool ID is required')
        const tool = await toolsService.getToolById(req.params.id)
        return res.json(tool)
    } catch (error) {
        next(error)
    }
}

const updateTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Tool ID is required')
        if (!req.body) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Body is required')
        const tool = await toolsService.updateTool(req.params.id, req.body, req.user!)
        return res.json(tool)
    } catch (error) {
        next(error)
    }
}

export default {
    createTool,
    deleteTool,
    getAllTools,
    getToolById,
    updateTool
}
