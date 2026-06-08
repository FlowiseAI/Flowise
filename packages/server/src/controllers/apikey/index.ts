import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { LoggedInUser } from '../../enterprise/Interface.Enterprise'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import apikeyService from '../../services/apikey'
import { getPageAndLimitParams } from '../../utils/pagination'

// Get api keys
const getAllApiKeys = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as LoggedInUser

        if (req.query?.type === 'organization' && user.isOrganizationAdmin)
            return res.status(StatusCodes.OK).json(await apikeyService.getAllApiKeysByOrganization(user.activeOrganizationId))

        const { page, limit } = getPageAndLimitParams(req)
        const apiResponse = await apikeyService.getAllApiKeys(user, page, limit)
        return res.status(StatusCodes.OK).json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || !req.body.keyName) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: apikeyController.createApiKey - keyName not provided!`)
        }
        if (
            !req.body.permissions ||
            !Array.isArray(req.body.permissions) ||
            req.body.permissions.length === 0 ||
            !req.body.permissions.every((p: any) => typeof p === 'string')
        ) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: apikeyController.createApiKey - permissions must be an array of strings!`
            )
        }
        const user = req.user as LoggedInUser
        const apiResponse = await apikeyService.createApiKey(user, req.body.keyName, req.body.permissions)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Update api key
const updateApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: apikeyController.updateApiKey - id not provided!`)
        }
        if (typeof req.body === 'undefined' || !req.body.keyName) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: apikeyController.updateApiKey - keyName not provided!`)
        }
        if (
            !req.body.permissions ||
            !Array.isArray(req.body.permissions) ||
            req.body.permissions.length === 0 ||
            !req.body.permissions.every((p: any) => typeof p === 'string')
        ) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: apikeyController.updateApiKey - permissions must be an array of strings!`
            )
        }
        const user = req.user as LoggedInUser
        const apiResponse = await apikeyService.updateApiKey(user, req.params.id, req.body.keyName, req.body.permissions)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Delete api key
const deleteApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: apikeyController.deleteApiKey - id not provided!`)
        }
        if (!req.user?.activeWorkspaceId) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Workspace ID is required`)
        }
        const apiResponse = await apikeyService.deleteApiKey(req.params.id, req.user?.activeWorkspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Verify api key
const verifyApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.apikey) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: apikeyController.verifyApiKey - apikey not provided!`)
        }
        const apiResponse = await apikeyService.verifyApiKey(req.params.apikey)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createApiKey,
    deleteApiKey,
    getAllApiKeys,
    updateApiKey,
    verifyApiKey
}
