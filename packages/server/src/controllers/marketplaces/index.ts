import { Request, Response, NextFunction } from 'express'
import marketplacesService from '../../services/marketplaces'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import checkOwnership from '../../utils/checkOwnership'

// Get all templates for marketplaces
const getAllTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await marketplacesService.getAllTemplates(req.user)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get specific marketplace template
const getMarketplaceTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: marketplacesController.getMarketplaceTemplate - id not provided!`
            )
        }
        const apiResponse = await marketplacesService.getMarketplaceTemplate(req.params.id, req.user)

        // Check if the template is public (Marketplace) for unauthenticated users
        if (!req.user && (!apiResponse.visibility || !apiResponse.visibility.includes('Marketplace'))) {
            throw new InternalFlowiseError(
                StatusCodes.UNAUTHORIZED,
                `Error: marketplacesController.getMarketplaceTemplate - Unauthorized access to non-public template!`
            )
        }

        // For authenticated users, check ownership
        if (req.user && !(await checkOwnership(apiResponse, req.user))) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllTemplates,
    getMarketplaceTemplate
}
