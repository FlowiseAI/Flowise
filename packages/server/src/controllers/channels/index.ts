import { NextFunction, Request, Response } from 'express'
import channelsService from '../../services/channels'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const getWorkspaceIdOrThrow = (req: Request): string => {
    const workspaceId = req.user?.activeWorkspaceId
    if (!workspaceId) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Active workspace not found')
    }
    return workspaceId
}

const createChannelAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = getWorkspaceIdOrThrow(req)
        const apiResponse = await channelsService.createChannelAccount(req.body, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllChannelAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = getWorkspaceIdOrThrow(req)
        const apiResponse = await channelsService.getAllChannelAccounts(workspaceId, req.query.provider as string)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateChannelAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = getWorkspaceIdOrThrow(req)
        const id = req.params.id
        if (!id) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Account id is required')
        const apiResponse = await channelsService.updateChannelAccount(id, req.body, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteChannelAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = getWorkspaceIdOrThrow(req)
        const id = req.params.id
        if (!id) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Account id is required')
        await channelsService.deleteChannelAccount(id, workspaceId)
        return res.json({ success: true })
    } catch (error) {
        next(error)
    }
}

const createAgentChannelBinding = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = getWorkspaceIdOrThrow(req)
        const apiResponse = await channelsService.createAgentChannelBinding(req.body, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAgentChannelBindings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = getWorkspaceIdOrThrow(req)
        const apiResponse = await channelsService.getAgentChannelBindings(workspaceId, req.query.chatflowId as string)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateAgentChannelBinding = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = getWorkspaceIdOrThrow(req)
        const id = req.params.id
        if (!id) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Binding id is required')
        const apiResponse = await channelsService.updateAgentChannelBinding(id, req.body, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteAgentChannelBinding = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = getWorkspaceIdOrThrow(req)
        const id = req.params.id
        if (!id) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Binding id is required')
        await channelsService.deleteAgentChannelBinding(id, workspaceId)
        return res.json({ success: true })
    } catch (error) {
        next(error)
    }
}

export default {
    createChannelAccount,
    getAllChannelAccounts,
    updateChannelAccount,
    deleteChannelAccount,
    createAgentChannelBinding,
    getAgentChannelBindings,
    updateAgentChannelBinding,
    deleteAgentChannelBinding
}
