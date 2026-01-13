import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import chatflowVersionsService from '../../services/chatflow-versions'

// ==============================|| Validation Helpers ||============================== //

const getValidatedId = (req: Request, functionName: string): string => {
    if (!req.params.id) {
        throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: ${functionName} - id not provided!`)
    }
    return req.params.id
}

const getValidatedWorkspaceId = (req: Request, functionName: string): string => {
    const workspaceId = req.user?.activeWorkspaceId
    if (!workspaceId) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: ${functionName} - workspace not found!`)
    }
    return workspaceId
}

const getValidatedVersionFromParams = (req: Request, functionName: string): number => {
    if (!req.params.version) {
        throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: ${functionName} - version not provided!`)
    }
    const versionNumber = parseInt(req.params.version, 10)
    if (isNaN(versionNumber)) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Error: ${functionName} - invalid version number!`)
    }
    return versionNumber
}

const getValidatedVersionFromBody = (req: Request, functionName: string): number => {
    if (!req.body || req.body.version === undefined) {
        throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: ${functionName} - version not provided!`)
    }
    const versionNumber = parseInt(req.body.version, 10)
    if (isNaN(versionNumber)) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Error: ${functionName} - invalid version number!`)
    }
    return versionNumber
}

const getValidatedBody = (req: Request, functionName: string): any => {
    if (!req.body) {
        throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: ${functionName} - body not provided!`)
    }
    return req.body
}

// ==============================|| Controller Functions ||============================== //

/**
 * Get all versions for a chatflow
 */
const getAllVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = getValidatedId(req, 'chatflowVersionsController.getAllVersions')
        const workspaceId = getValidatedWorkspaceId(req, 'chatflowVersionsController.getAllVersions')

        const apiResponse = await chatflowVersionsService.getAllVersions(id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

/**
 * Get a specific version
 */
const getVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = getValidatedId(req, 'chatflowVersionsController.getVersion')
        const workspaceId = getValidatedWorkspaceId(req, 'chatflowVersionsController.getVersion')
        const versionNumber = getValidatedVersionFromParams(req, 'chatflowVersionsController.getVersion')

        const apiResponse = await chatflowVersionsService.getVersion(id, versionNumber, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

/**
 * Create a new version
 */
const createVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = getValidatedId(req, 'chatflowVersionsController.createVersion')
        const workspaceId = getValidatedWorkspaceId(req, 'chatflowVersionsController.createVersion')
        const body = getValidatedBody(req, 'chatflowVersionsController.createVersion')

        const versionData = {
            ...body,
            createdBy: req.user?.email || req.user?.name
        }

        const apiResponse = await chatflowVersionsService.createVersion(id, workspaceId, versionData)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

/**
 * Update a version
 */
const updateVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = getValidatedId(req, 'chatflowVersionsController.updateVersion')
        const workspaceId = getValidatedWorkspaceId(req, 'chatflowVersionsController.updateVersion')
        const versionNumber = getValidatedVersionFromParams(req, 'chatflowVersionsController.updateVersion')
        const body = getValidatedBody(req, 'chatflowVersionsController.updateVersion')

        const apiResponse = await chatflowVersionsService.updateVersion(id, versionNumber, workspaceId, body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

/**
 * Set active version
 */
const setActiveVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = getValidatedId(req, 'chatflowVersionsController.setActiveVersion')
        const workspaceId = getValidatedWorkspaceId(req, 'chatflowVersionsController.setActiveVersion')
        const versionNumber = getValidatedVersionFromBody(req, 'chatflowVersionsController.setActiveVersion')

        await chatflowVersionsService.setActiveVersion(id, versionNumber, workspaceId)
        return res.json({ success: true, message: `Version ${versionNumber} is now active` })
    } catch (error) {
        next(error)
    }
}

/**
 * Delete a version
 */
const deleteVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = getValidatedId(req, 'chatflowVersionsController.deleteVersion')
        const workspaceId = getValidatedWorkspaceId(req, 'chatflowVersionsController.deleteVersion')
        const versionNumber = getValidatedVersionFromParams(req, 'chatflowVersionsController.deleteVersion')

        await chatflowVersionsService.deleteVersion(id, versionNumber, workspaceId)
        return res.json({ success: true, message: `Version ${versionNumber} deleted successfully` })
    } catch (error) {
        next(error)
    }
}

export default {
    getAllVersions,
    getVersion,
    createVersion,
    updateVersion,
    setActiveVersion,
    deleteVersion
}
