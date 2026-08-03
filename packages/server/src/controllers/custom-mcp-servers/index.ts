import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { CustomMcpServerAuthType } from '../../Interface'
import customMcpServersService from '../../services/custom-mcp-servers'
import { getPageAndLimitParams } from '../../utils/pagination'

const MAX_PAGE_LIMIT = 500
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 50

const assertValidAuthType = (authType: unknown, endpoint: string): void => {
    if (authType === undefined) return
    const allowed = Object.values(CustomMcpServerAuthType) as string[]
    if (typeof authType !== 'string' || !allowed.includes(authType)) {
        throw new InternalFlowiseError(
            StatusCodes.BAD_REQUEST,
            `Error: customMcpServersController.${endpoint} - invalid authType "${String(authType)}"`
        )
    }
}

const createCustomMcpServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: customMcpServersController.createCustomMcpServer - body not provided!`
            )
        }
        const orgId = req.user?.activeOrganizationId
        if (!orgId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: customMcpServersController.createCustomMcpServer - organization not found!`
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: customMcpServersController.createCustomMcpServer - workspace not found!`
            )
        }
        const body = req.body
        assertValidAuthType(body.authType, 'createCustomMcpServer')
        // Explicit allowlist — id/workspaceId/timestamps must not be overrideable by client
        const mcpBody: Record<string, unknown> = {}
        if (body.name !== undefined) mcpBody.name = body.name
        if (body.serverUrl !== undefined) mcpBody.serverUrl = body.serverUrl
        if (body.iconSrc !== undefined) mcpBody.iconSrc = body.iconSrc
        if (body.color !== undefined) mcpBody.color = body.color
        if (body.authType !== undefined) mcpBody.authType = body.authType
        if (body.authConfig !== undefined) mcpBody.authConfig = body.authConfig
        mcpBody.workspaceId = workspaceId

        const apiResponse = await customMcpServersService.createCustomMcpServer(mcpBody, orgId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllCustomMcpServers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: customMcpServersController.getAllCustomMcpServers - workspace not found!`
            )
        }
        const raw = getPageAndLimitParams(req)
        const page = raw.page > 0 ? raw.page : DEFAULT_PAGE
        const limit = raw.limit > 0 ? Math.min(raw.limit, MAX_PAGE_LIMIT) : DEFAULT_LIMIT
        const apiResponse = await customMcpServersService.getAllCustomMcpServers(workspaceId, page, limit)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getCustomMcpServerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: customMcpServersController.getCustomMcpServerById - id not provided!`
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: customMcpServersController.getCustomMcpServerById - workspace not found!`
            )
        }
        const apiResponse = await customMcpServersService.getCustomMcpServerById(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateCustomMcpServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: customMcpServersController.updateCustomMcpServer - id not provided!`
            )
        }
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: customMcpServersController.updateCustomMcpServer - body not provided!`
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: customMcpServersController.updateCustomMcpServer - workspace not found!`
            )
        }
        const body = req.body
        assertValidAuthType(body.authType, 'updateCustomMcpServer')
        // Explicit allowlist
        const mcpBody: Record<string, unknown> = {}
        if (body.name !== undefined) mcpBody.name = body.name
        if (body.serverUrl !== undefined) mcpBody.serverUrl = body.serverUrl
        if (body.iconSrc !== undefined) mcpBody.iconSrc = body.iconSrc
        if (body.color !== undefined) mcpBody.color = body.color
        if (body.authType !== undefined) mcpBody.authType = body.authType
        if (body.authConfig !== undefined) mcpBody.authConfig = body.authConfig

        const apiResponse = await customMcpServersService.updateCustomMcpServer(req.params.id, mcpBody, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteCustomMcpServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: customMcpServersController.deleteCustomMcpServer - id not provided!`
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: customMcpServersController.deleteCustomMcpServer - workspace not found!`
            )
        }
        const apiResponse = await customMcpServersService.deleteCustomMcpServer(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const authorizeCustomMcpServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: customMcpServersController.authorizeCustomMcpServer - id not provided!`
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: customMcpServersController.authorizeCustomMcpServer - workspace not found!`
            )
        }
        const apiResponse = await customMcpServersService.authorizeCustomMcpServer(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getDiscoveredTools = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: customMcpServersController.getDiscoveredTools - id not provided!`
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: customMcpServersController.getDiscoveredTools - workspace not found!`
            )
        }
        const apiResponse = await customMcpServersService.getDiscoveredTools(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createCustomMcpServer,
    getAllCustomMcpServers,
    getCustomMcpServerById,
    updateCustomMcpServer,
    deleteCustomMcpServer,
    authorizeCustomMcpServer,
    getDiscoveredTools
}
