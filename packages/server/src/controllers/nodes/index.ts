import { Request, Response, NextFunction } from 'express'
import nodesService from '../../services/nodes'

const getAllNodes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await nodesService.getAllNodes()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getNodeByName = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.name === 'undefined' || req.params.name === '') {
            throw new Error(`Error: nodesController.getNodeByName - name not provided!`)
        }
        const apiResponse = await nodesService.getNodeByName(req.params.name)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllNodes,
    getNodeByName
}
