import { Request, Response, NextFunction } from 'express'
import credentialsService from '../../services/credentials'

const createCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error(`Error: credentialsController.createCredential - body not provided!`)
        }
        const apiResponse = await credentialsService.createCredential(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await credentialsService.getAllCredentials(req.query.credentialName)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createCredential,
    getAllCredentials
}
