import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import mcpServerService from '../../services/mcp-server'

const getMcpServerConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                'Error: mcpServerController.getMcpServerConfig - id not provided!'
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Error: mcpServerController.getMcpServerConfig - workspace not found!')
        }
        const apiResponse = await mcpServerService.getMcpServerConfig(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createMcpServerConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                'Error: mcpServerController.createMcpServerConfig - id not provided!'
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Error: mcpServerController.createMcpServerConfig - workspace not found!')
        }
        const apiResponse = await mcpServerService.createMcpServerConfig(req.params.id, workspaceId, req.body || {})
        return res.status(StatusCodes.CREATED).json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateMcpServerConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                'Error: mcpServerController.updateMcpServerConfig - id not provided!'
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Error: mcpServerController.updateMcpServerConfig - workspace not found!')
        }
        const apiResponse = await mcpServerService.updateMcpServerConfig(req.params.id, workspaceId, req.body || {})
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteMcpServerConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                'Error: mcpServerController.deleteMcpServerConfig - id not provided!'
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Error: mcpServerController.deleteMcpServerConfig - workspace not found!')
        }
        await mcpServerService.deleteMcpServerConfig(req.params.id, workspaceId)
        return res.json({ message: 'MCP server config disabled' })
    } catch (error) {
        next(error)
    }
}

const refreshMcpToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: mcpServerController.refreshMcpToken - id not provided!')
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Error: mcpServerController.refreshMcpToken - workspace not found!')
        }
        const apiResponse = await mcpServerService.refreshMcpToken(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getMcpServerConfig,
    createMcpServerConfig,
    updateMcpServerConfig,
    deleteMcpServerConfig,
    refreshMcpToken
}
