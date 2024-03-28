import { Request, Response, NextFunction } from 'express'
import marketplacesService from '../../services/marketplaces'

// Get all templates for marketplaces
const getAllTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await marketplacesService.getAllTemplates()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllTemplates
}
