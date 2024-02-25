import { Request, Response, NextFunction } from 'express'
import nodesService from '../../services/nodes'

// Get all component nodes
const getAllNodes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await nodesService.getAllNodes()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Returns specific component node icon via name
const getSingleNodeIcon = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.name === 'undefined' || req.params.name === '') {
            throw new Error(`Error: nodesController.getSingleNodeIcon - name not provided!`)
        }
        const apiResponse = await nodesService.getSingleNodeIcon(req.params.name)
        return res.sendFile(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get specific component node via name
const getSingleNode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.name === 'undefined' || req.params.name === '') {
            throw new Error(`Error: nodesController.getSingleNode - name not provided!`)
        }
        const apiResponse = await nodesService.getSingleNode(req.params.name)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// load async options for a single node
const getSingleNodeAsyncOptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.name === 'undefined' || req.params.name === '') {
            throw new Error(`Error: nodesRouter.getSingleNodeAsyncOptions - name not provided!`)
        }
        const apiResponse = await nodesService.getSingleNodeAsyncOptions(req.body, req.params.name)
        //@ts-ignore
        if (typeof apiResponse.status !== 'undefined' && typeof apiResponse.msg !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// execute custom function node
const executeCustomFunction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body !== 'undefined') {
            throw new Error(`Error: nodesRouter.executeCustomFunction - body not provided!`)
        }
        const apiResponse = await nodesService.executeCustomFunction(req.body)
        //@ts-ignore
        if (typeof apiResponse.status !== 'undefined' && typeof apiResponse.msg !== 'undefined') {
            //@ts-ignore
            return res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllNodes,
    getSingleNode,
    getSingleNodeIcon,
    getSingleNodeAsyncOptions,
    executeCustomFunction
}
