import { Request, Response, NextFunction } from 'express'
import apikeyService from '../../services/apikey'

// Get api keys
const getAllApiKeys = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await apikeyService.getAllApiKeys()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllApiKeys
}
