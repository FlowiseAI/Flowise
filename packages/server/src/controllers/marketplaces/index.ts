import { Request, Response, NextFunction } from 'express'
import marketplacesService from '../../services/marketplaces'

// Get all templates for marketplaces
const getAllTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await marketplacesService.getAllTemplates(req.user?.id, req.user?.organizationId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllTemplates
}
