import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { AssistantType } from '../../Interface'
import assistantsService from '../../services/assistants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { checkUsageLimit } from '../../utils/quotaUsage'

const createAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: assistantsController.createAssistant - body not provided!`
            )
        }
        const body = req.body
        const orgId = req.user?.activeOrganizationId
        if (!orgId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: assistantsController.createAssistant - organization ${orgId} not found!`
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: assistantsController.createAssistant - workspace ${workspaceId} not found!`
            )
        }
        const subscriptionId = req.user?.activeOrganizationSubscriptionId || ''

        const existingAssistantCount = await assistantsService.getAssistantsCountByOrganization(body.type, orgId)
        const newAssistantCount = 1
        await checkUsageLimit('flows', subscriptionId, getRunningExpressApp().usageCacheManager, existingAssistantCount + newAssistantCount)

        body.workspaceId = workspaceId
        const apiResponse = await assistantsService.createAssistant(body, orgId)

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: assistantsController.deleteAssistant - id not provided!`
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: assistantsController.deleteAssistant - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await assistantsService.deleteAssistant(req.params.id, req.query.isDeleteBoth, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllAssistants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const type = req.query.type as AssistantType
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: assistantsController.getAllAssistants - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await assistantsService.getAllAssistants(workspaceId, type)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAssistantById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: assistantsController.getAssistantById - id not provided!`
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: assistantsController.getAssistantById - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await assistantsService.getAssistantById(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: assistantsController.updateAssistant - id not provided!`
            )
        }
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: assistantsController.updateAssistant - body not provided!`
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: assistantsController.updateAssistant - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await assistantsService.updateAssistant(req.params.id, req.body, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getChatModels = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await assistantsService.getChatModels()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getDocumentStores = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: assistantsController.getDocumentStores - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await assistantsService.getDocumentStores(workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getTools = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await assistantsService.getTools()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const generateAssistantInstruction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: assistantsController.generateAssistantInstruction - body not provided!`
            )
        }
        const apiResponse = await assistantsService.generateAssistantInstruction(req.body.task, req.body.selectedChatModel)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createAssistant,
    deleteAssistant,
    getAllAssistants,
    getAssistantById,
    updateAssistant,
    getChatModels,
    getDocumentStores,
    getTools,
    generateAssistantInstruction
}
