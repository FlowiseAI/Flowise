import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import chatflowVersionsService from '../../services/chatflow-versions'

/**
 * Get all versions for a chatflow
 */
const getAllVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowVersionsController.getAllVersions - id not provided!`
            )
        }

        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: chatflowVersionsController.getAllVersions - workspace not found!`)
        }

        const apiResponse = await chatflowVersionsService.getAllVersions(req.params.id, workspaceId)
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
        if (typeof req.params === 'undefined' || !req.params.id || !req.params.version) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowVersionsController.getVersion - id or version not provided!`
            )
        }

        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: chatflowVersionsController.getVersion - workspace not found!`)
        }

        const versionNumber = parseInt(req.params.version, 10)
        if (isNaN(versionNumber)) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Error: chatflowVersionsController.getVersion - invalid version number!`
            )
        }

        const apiResponse = await chatflowVersionsService.getVersion(req.params.id, versionNumber, workspaceId)
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
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowVersionsController.createVersion - id not provided!`
            )
        }

        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowVersionsController.createVersion - body not provided!`
            )
        }

        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: chatflowVersionsController.createVersion - workspace not found!`)
        }

        const versionData = {
            ...req.body,
            createdBy: req.user?.email || req.user?.name
        }

        const apiResponse = await chatflowVersionsService.createVersion(req.params.id, workspaceId, versionData)
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
        if (typeof req.params === 'undefined' || !req.params.id || !req.params.version) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowVersionsController.updateVersion - id or version not provided!`
            )
        }

        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowVersionsController.updateVersion - body not provided!`
            )
        }

        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: chatflowVersionsController.updateVersion - workspace not found!`)
        }

        const versionNumber = parseInt(req.params.version, 10)
        if (isNaN(versionNumber)) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Error: chatflowVersionsController.updateVersion - invalid version number!`
            )
        }

        const apiResponse = await chatflowVersionsService.updateVersion(req.params.id, versionNumber, workspaceId, req.body)
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
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowVersionsController.setActiveVersion - id not provided!`
            )
        }

        if (!req.body || req.body.version === undefined) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowVersionsController.setActiveVersion - version not provided!`
            )
        }

        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: chatflowVersionsController.setActiveVersion - workspace not found!`
            )
        }

        const versionNumber = parseInt(req.body.version, 10)
        if (isNaN(versionNumber)) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Error: chatflowVersionsController.setActiveVersion - invalid version number!`
            )
        }

        await chatflowVersionsService.setActiveVersion(req.params.id, versionNumber, workspaceId)
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
        if (typeof req.params === 'undefined' || !req.params.id || !req.params.version) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowVersionsController.deleteVersion - id or version not provided!`
            )
        }

        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: chatflowVersionsController.deleteVersion - workspace not found!`)
        }

        const versionNumber = parseInt(req.params.version, 10)
        if (isNaN(versionNumber)) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                `Error: chatflowVersionsController.deleteVersion - invalid version number!`
            )
        }

        await chatflowVersionsService.deleteVersion(req.params.id, versionNumber, workspaceId)
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
