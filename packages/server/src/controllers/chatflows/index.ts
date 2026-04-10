import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { QueryRunner } from 'typeorm'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { WorkspaceUserErrorMessage, WorkspaceUserService } from '../../enterprise/services/workspace-user.service'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { ChatflowType } from '../../Interface'
import apiKeyService from '../../services/apikey'
import chatflowsService from '../../services/chatflows'
import { GeneralErrorMessage } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { getPageAndLimitParams } from '../../utils/pagination'
import { checkUsageLimit } from '../../utils/quotaUsage'
import { RateLimiterManager } from '../../utils/rateLimit'
import { sanitizeFlowDataForPublicEndpoint } from '../../utils/sanitizeFlowData'
import { stripProtectedFields } from '../../utils/stripProtectedFields'

function requireParamId(req: Request, method: string): string {
    if (typeof req.params === 'undefined' || !req.params.id) {
        throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsController.${method} - id not provided!`)
    }
    return req.params.id
}

function requireWorkspaceId(req: Request, method: string): string {
    const workspaceId = req.user?.activeWorkspaceId
    if (!workspaceId) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: chatflowsController.${method} - workspace not found!`)
    }
    return workspaceId
}

function requireOrgId(req: Request, method: string): string {
    const orgId = req.user?.activeOrganizationId
    if (!orgId) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: chatflowsController.${method} - organization not found!`)
    }
    return orgId
}

const checkIfChatflowIsValidForStreaming = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflowId = requireParamId(req, 'checkIfChatflowIsValidForStreaming')
        const apiResponse = await chatflowsService.checkIfChatflowIsValidForStreaming(chatflowId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const checkIfChatflowIsValidForUploads = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflowId = requireParamId(req, 'checkIfChatflowIsValidForUploads')
        const apiResponse = await chatflowsService.checkIfChatflowIsValidForUploads(chatflowId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflowId = requireParamId(req, 'deleteChatflow')
        const orgId = requireOrgId(req, 'deleteChatflow')
        const workspaceId = requireWorkspaceId(req, 'deleteChatflow')
        const apiResponse = await chatflowsService.deleteChatflow(chatflowId, orgId, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllChatflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = getPageAndLimitParams(req)

        const apiResponse = await chatflowsService.getAllChatflows(
            req.query?.type as ChatflowType,
            req.user?.activeWorkspaceId,
            page,
            limit
        )
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get specific chatflow via api key
const getChatflowByApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.apikey) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsController.getChatflowByApiKey - apikey not provided!`
            )
        }
        const apikey = await apiKeyService.getApiKey(req.params.apikey)
        if (!apikey) {
            return res.status(401).send('Unauthorized')
        }
        const apiResponse = await chatflowsService.getChatflowByApiKey(apikey.id, apikey.workspaceId, req.query.keyonly)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getChatflowById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflowId = requireParamId(req, 'getChatflowById')
        const workspaceId = requireWorkspaceId(req, 'getChatflowById')
        const apiResponse = await chatflowsService.getChatflowById(chatflowId, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const saveChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsController.saveChatflow - body not provided!`)
        }
        const orgId = requireOrgId(req, 'saveChatflow')
        const workspaceId = requireWorkspaceId(req, 'saveChatflow')
        const subscriptionId = req.user?.activeOrganizationSubscriptionId || ''
        const body = req.body

        const existingChatflowCount = await chatflowsService.getAllChatflowsCountByOrganization(body.type, orgId)
        const newChatflowCount = 1
        await checkUsageLimit('flows', subscriptionId, getRunningExpressApp().usageCacheManager, existingChatflowCount + newChatflowCount)

        const newChatFlow = new ChatFlow()
        Object.assign(newChatFlow, stripProtectedFields(body))

        newChatFlow.workspaceId = workspaceId
        const apiResponse = await chatflowsService.saveChatflow(
            newChatFlow,
            orgId,
            workspaceId,
            subscriptionId,
            getRunningExpressApp().usageCacheManager
        )

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflowId = requireParamId(req, 'updateChatflow')
        const workspaceId = requireWorkspaceId(req, 'updateChatflow')
        const chatflow = await chatflowsService.getChatflowById(chatflowId, workspaceId)
        if (!chatflow) {
            return res.status(404).send('Chatflow not found')
        }
        const orgId = requireOrgId(req, 'updateChatflow')
        const subscriptionId = req.user?.activeOrganizationSubscriptionId || ''
        const body = req.body
        const updateChatFlow = new ChatFlow()
        Object.assign(updateChatFlow, stripProtectedFields(body))

        updateChatFlow.id = chatflow.id
        const rateLimiterManager = RateLimiterManager.getInstance()
        await rateLimiterManager.updateRateLimiter(updateChatFlow)

        const apiResponse = await chatflowsService.updateChatflow(chatflow, updateChatFlow, orgId, workspaceId, subscriptionId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getSinglePublicChatflow = async (req: Request, res: Response, next: NextFunction) => {
    let queryRunner: QueryRunner | undefined
    try {
        const chatflowId = requireParamId(req, 'getSinglePublicChatflow')
        const chatflow = await chatflowsService.getChatflowById(chatflowId)
        if (!chatflow) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Chatflow not found' })
        if (chatflow.isPublic)
            return res.status(StatusCodes.OK).json({ ...chatflow, flowData: sanitizeFlowDataForPublicEndpoint(chatflow.flowData) })
        if (!req.user) return res.status(StatusCodes.UNAUTHORIZED).json({ message: GeneralErrorMessage.UNAUTHORIZED })
        queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
        const workspaceUserService = new WorkspaceUserService()
        const workspaceUser = await workspaceUserService.readWorkspaceUserByUserId(req.user.id, queryRunner)
        if (workspaceUser.length === 0)
            return res.status(StatusCodes.NOT_FOUND).json({ message: WorkspaceUserErrorMessage.WORKSPACE_USER_NOT_FOUND })
        const workspaceIds = workspaceUser.map((user) => user.workspaceId)
        if (!workspaceIds.includes(chatflow.workspaceId))
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'You are not in the workspace that owns this chatflow' })
        return res.status(StatusCodes.OK).json(chatflow)
    } catch (error) {
        next(error)
    } finally {
        if (queryRunner) await queryRunner.release()
    }
}

const getSinglePublicChatbotConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflowId = requireParamId(req, 'getSinglePublicChatbotConfig')
        const apiResponse = await chatflowsService.getSinglePublicChatbotConfig(chatflowId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const checkIfChatflowHasChanged = async (req: Request, res: Response, next: NextFunction) => {
    try {
        requireParamId(req, 'checkIfChatflowHasChanged')
        if (!req.params.lastUpdatedDateTime) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsController.checkIfChatflowHasChanged - lastUpdatedDateTime not provided!`
            )
        }
        const apiResponse = await chatflowsService.checkIfChatflowHasChanged(req.params.id, req.params.lastUpdatedDateTime)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const exportChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflowId = requireParamId(req, 'exportChatflow')
        const workspaceId = requireWorkspaceId(req, 'exportChatflow')
        const apiResponse = await chatflowsService.exportChatflow(chatflowId, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const importChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatflowsController.importChatflow - body not provided!`
            )
        }
        const workspaceId = requireWorkspaceId(req, 'importChatflow')
        const apiResponse = await chatflowsService.importChatflow(req.body, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    checkIfChatflowIsValidForStreaming,
    checkIfChatflowIsValidForUploads,
    deleteChatflow,
    getAllChatflows,
    getChatflowByApiKey,
    getChatflowById,
    saveChatflow,
    updateChatflow,
    getSinglePublicChatflow,
    getSinglePublicChatbotConfig,
    checkIfChatflowHasChanged,
    exportChatflow,
    importChatflow
}
