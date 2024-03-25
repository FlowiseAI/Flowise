import { Request, Response, NextFunction } from 'express'
import credentialsService from '../../services/credentials'

const getAllCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await credentialsService.getAllCredentials(req.query.credentialName)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllCredentials
}
