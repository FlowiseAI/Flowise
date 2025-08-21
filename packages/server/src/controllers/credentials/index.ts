import { Request, Response, NextFunction } from 'express'
import credentialsService from '../../services/credentials'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const createCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.createCredential - body not provided!`
            )
        }
        const apiResponse = await credentialsService.createCredential(req.body, req.user?.id, req.user?.organizationId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.deleteCredentials - id not provided!`
            )
        }
        const apiResponse = await credentialsService.deleteCredentials(req.params.id, req.user?.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await credentialsService.getAllCredentials(req.query.credentialName, req.user!)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getCredentialById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.getCredentialById - id not provided!`
            )
        }
        const apiResponse = await credentialsService.getCredentialById(req.params.id, req.user?.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.updateCredential - id not provided!`
            )
        }
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.updateCredential - body not provided!`
            )
        }
        const apiResponse = await credentialsService.updateCredential(req.params.id, req.body, req.user?.id, req.user?.organizationId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateAndRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.credentialId) {
            return res.status(400).json({
                success: false,
                message: 'Credential ID is required'
            })
        }

        const apiResponse = await credentialsService.updateAndRefreshToken(req.body.credentialId, req.user?.id)
        return res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: apiResponse
        })
    } catch (error) {
        console.error('Error refreshing token:', error)
        next(error)
    }
}

const updateAndRefreshAtlassianToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.credentialId) {
            return res.status(400).json({
                success: false,
                message: 'Credential ID is required'
            })
        }

        const apiResponse = await credentialsService.updateAndRefreshAtlassianToken(req.body.credentialId, (req.user as any)?.id)
        return res.json({
            success: true,
            message: 'Atlassian token refreshed successfully',
            data: apiResponse
        })
    } catch (error) {
        console.error('Error refreshing Atlassian token:', error)
        next(error)
    }
}

export default {
    createCredential,
    deleteCredentials,
    getAllCredentials,
    getCredentialById,
    updateCredential,
    updateAndRefreshToken,
    updateAndRefreshAtlassianToken
}
