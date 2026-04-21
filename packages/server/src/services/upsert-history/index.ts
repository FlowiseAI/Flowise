import { MoreThanOrEqual, LessThanOrEqual, Between, In } from 'typeorm'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { UpsertHistory } from '../../database/entities/UpsertHistory'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import chatflowsService from '../chatflows'

const getAllUpsertHistory = async (
    sortOrder: string | undefined,
    chatflowid: string | undefined,
    startDate: string | undefined,
    endDate: string | undefined
) => {
    try {
        const appServer = getRunningExpressApp()

        let createdDateQuery
        if (startDate || endDate) {
            if (startDate && endDate) {
                createdDateQuery = Between(new Date(startDate), new Date(endDate))
            } else if (startDate) {
                createdDateQuery = MoreThanOrEqual(new Date(startDate))
            } else if (endDate) {
                createdDateQuery = LessThanOrEqual(new Date(endDate))
            }
        }
        let upsertHistory = await appServer.AppDataSource.getRepository(UpsertHistory).find({
            where: {
                chatflowid,
                date: createdDateQuery
            },
            order: {
                date: sortOrder === 'DESC' ? 'DESC' : 'ASC'
            }
        })
        upsertHistory = upsertHistory.map((hist) => {
            return {
                ...hist,
                result: hist.result ? JSON.parse(hist.result) : {},
                flowData: hist.flowData ? JSON.parse(hist.flowData) : {}
            }
        })

        return upsertHistory
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: upsertHistoryServices.getAllUpsertHistory - ${getErrorMessage(error)}`
        )
    }
}

const patchDeleteUpsertHistory = async (ids: string[] = [], workspaceId: string): Promise<any> => {
    try {
        const uniqueIds = [...new Set((ids ?? []).filter((id) => typeof id === 'string' && id.length > 0))]
        if (uniqueIds.length === 0) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                'Error: upsertHistoryServices.patchDeleteUpsertHistory - ids are required!'
            )
        }

        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(UpsertHistory)
        const rows = await repo.find({
            where: { id: In(uniqueIds) },
            select: ['id', 'chatflowid']
        })
        if (rows.length !== uniqueIds.length) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                'Error: upsertHistoryServices.patchDeleteUpsertHistory - one or more upsert history records were not found!'
            )
        }

        const chatflowIds = [...new Set(rows.map((r) => r.chatflowid))]
        for (const chatflowId of chatflowIds) {
            await chatflowsService.getChatflowById(chatflowId, workspaceId)
        }

        return await repo.delete(uniqueIds)
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: upsertHistoryServices.patchDeleteUpsertHistory - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAllUpsertHistory,
    patchDeleteUpsertHistory
}
