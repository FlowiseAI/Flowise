import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import chatflowsService from '../../services/chatflows'
import upsertHistoryService from '../../services/upsert-history'

const getAllUpsertHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: upsertHistoryController.getAllUpsertHistory - workspace ${workspaceId} not found!`
            )
        }
        const chatflowid = req.params?.id as string | undefined
        if (!chatflowid) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                'Error: upsertHistoryController.getAllUpsertHistory - chatflow id is required!'
            )
        }
        await chatflowsService.getChatflowById(chatflowid, workspaceId)

        const sortOrder = req.query?.order as string | undefined
        const startDate = req.query?.startDate as string | undefined
        const endDate = req.query?.endDate as string | undefined
        const apiResponse = await upsertHistoryService.getAllUpsertHistory(sortOrder, chatflowid, startDate, endDate)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const patchDeleteUpsertHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: upsertHistoryController.patchDeleteUpsertHistory - workspace ${workspaceId} not found!`
            )
        }
        const ids = req.body.ids ?? []
        const apiResponse = await upsertHistoryService.patchDeleteUpsertHistory(ids, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllUpsertHistory,
    patchDeleteUpsertHistory
}
